import { useState, useMemo, useEffect, useRef } from 'react';
import { ArrowLeft, Check, AlertCircle, Plus, Trash2, UserPlus, ArrowRightLeft, HelpCircle, IndianRupee } from 'lucide-react';
import { Party, PartyCategory, Transaction, TransactionItem, TransactionType } from '@/types/transaction';
import { calcTotal, formatINR, todayISO, normalizeParty, getPartyCategoryMeta, computePartyBalance, round2 } from '@/lib/calculations';
import { loadTransactions } from '@/lib/data';
import { Button, Input, Textarea, Select } from './ui';
import { PartyModal } from './PartyModal';

interface Props {
  existing: Transaction | null;
  parties: Party[];
  transactions?: Transaction[];
  initialType?: TransactionType;
  onSave: (txn: Transaction, keepOpen?: boolean) => Promise<void>;
  onSaveSuspense?: (
    data: { date: string; amount: number; narration: string; referenceNo?: string },
    keepOpen?: boolean
  ) => Promise<void>;
  onSaveParty?: (partyData: {
    id?: string;
    name: string;
    partyType: PartyCategory;
    location: string;
    investment: number;
    initialLoss: number;
    openingBalance?: number;
  }) => Promise<Party>;
  onCancel: () => void;
}
interface ItemForm { itemName: string; quantity: string; unit: string; ratePerUnit: string; }
interface FormState {
  date: string;
  partyName: string;
  partyId: string;
  type: TransactionType;
  narration: string;
  items: ItemForm[];
  source: 'Cash' | 'Bank';
  transferAmount: string;
  debtorPartyName: string;
  debtorPartyId: string;
  receiptAmount: string;
  referenceNo: string;
}
const emptyItem = (): ItemForm => ({ itemName: '', quantity: '', unit: 'kg', ratePerUnit: '' });

function formatBalanceWithDrCr(balance: number): string {
  const rounded = Math.round((balance + Number.EPSILON) * 100) / 100;
  if (rounded === 0) return `${formatINR(0)} (Settled)`;
  if (rounded > 0) return `${formatINR(rounded)} (Dr)`;
  return `${formatINR(Math.abs(rounded))} (Cr)`;
}

const STORAGE_KEYS = {
  CREDITOR_NAME: 'rg_transfer_creditor_name',
  CREDITOR_ID: 'rg_transfer_creditor_id',
  DEBTOR_NAME: 'rg_transfer_debtor_name',
  DEBTOR_ID: 'rg_transfer_debtor_id',
  SOURCE: 'rg_transfer_source',
  LAST_TYPE: 'rg_last_transaction_type',
};

function getSavedTransferParties() {
  try {
    return {
      creditorName: localStorage.getItem(STORAGE_KEYS.CREDITOR_NAME) || '',
      creditorId: localStorage.getItem(STORAGE_KEYS.CREDITOR_ID) || '',
      debtorName: localStorage.getItem(STORAGE_KEYS.DEBTOR_NAME) || '',
      debtorId: localStorage.getItem(STORAGE_KEYS.DEBTOR_ID) || '',
      source: (localStorage.getItem(STORAGE_KEYS.SOURCE) as 'Cash' | 'Bank') || 'Cash',
    };
  } catch {
    return {
      creditorName: '',
      creditorId: '',
      debtorName: '',
      debtorId: '',
      source: 'Cash' as const,
    };
  }
}

function persistTransferParties(data: {
  creditorName?: string;
  creditorId?: string;
  debtorName?: string;
  debtorId?: string;
  source?: 'Cash' | 'Bank';
}) {
  try {
    if (data.creditorName !== undefined) localStorage.setItem(STORAGE_KEYS.CREDITOR_NAME, data.creditorName);
    if (data.creditorId !== undefined) localStorage.setItem(STORAGE_KEYS.CREDITOR_ID, data.creditorId);
    if (data.debtorName !== undefined) localStorage.setItem(STORAGE_KEYS.DEBTOR_NAME, data.debtorName);
    if (data.debtorId !== undefined) localStorage.setItem(STORAGE_KEYS.DEBTOR_ID, data.debtorId);
    if (data.source !== undefined) localStorage.setItem(STORAGE_KEYS.SOURCE, data.source);
  } catch {
    // ignore
  }
}

function toFormState(transaction: Transaction | null, initialType?: TransactionType): FormState {
  if (transaction) {
    const isTransfer = transaction.type === 'Payment Transfer';
    const isReceipt = transaction.type === 'Receipt';
    return {
      date: transaction.date,
      partyName: transaction.partyName,
      partyId: transaction.partyId,
      type: transaction.type,
      narration: transaction.narration,
      items: (transaction.items.length
        ? transaction.items
        : [{ itemName: transaction.itemName, quantity: transaction.quantity, unit: 'kg', ratePerUnit: transaction.ratePerUnit }]
      ).map((item) => ({
        itemName: item.itemName,
        quantity: String(item.quantity),
        unit: item.unit || 'kg',
        ratePerUnit: String(item.ratePerUnit),
      })),
      source: transaction.source || 'Cash',
      transferAmount: isTransfer ? String(transaction.totalAmount || '') : '',
      debtorPartyName: transaction.transferPartyName || '',
      debtorPartyId: transaction.transferPartyId || '',
      receiptAmount: isReceipt ? String(transaction.totalAmount || transaction.amount || '') : '',
      referenceNo: transaction.referenceNo || '',
    };
  }
  const saved = getSavedTransferParties();
  let defaultType: TransactionType = initialType || 'Sale';
  if (!initialType) {
    try {
      const savedType = localStorage.getItem(STORAGE_KEYS.LAST_TYPE) as TransactionType | null;
      if (savedType) defaultType = savedType;
    } catch {
      // ignore
    }
  }
  return {
    date: todayISO(),
    partyName: defaultType === 'Payment Transfer' ? saved.creditorName : '',
    partyId: defaultType === 'Payment Transfer' ? saved.creditorId : '',
    type: defaultType,
    narration: '',
    items: [emptyItem()],
    source: saved.source,
    transferAmount: '',
    debtorPartyName: defaultType === 'Payment Transfer' ? saved.debtorName : '',
    debtorPartyId: defaultType === 'Payment Transfer' ? saved.debtorId : '',
    receiptAmount: '',
    referenceNo: '',
  };
}

export function TransactionForm({ existing, parties, transactions = [], initialType, onSave, onSaveSuspense, onSaveParty, onCancel }: Props) {
  const [form, setForm] = useState<FormState>(() => toFormState(existing, initialType));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPartySuggestions, setShowPartySuggestions] = useState(false);
  const [showDebtorSuggestions, setShowDebtorSuggestions] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [modalTarget, setModalTarget] = useState<'creditor' | 'debtor'>('creditor');

  const [isSuspense, setIsSuspense] = useState(false);
  const [suspenseAmount, setSuspenseAmount] = useState('');
  const [suspenseReferenceNo, setSuspenseReferenceNo] = useState('');

  const [allTransactions, setAllTransactions] = useState<Transaction[]>(transactions);

  useEffect(() => {
    if (transactions && transactions.length > 0) {
      setAllTransactions(transactions);
      return;
    }
    let active = true;
    loadTransactions()
      .then((txns) => {
        if (active) setAllTransactions(txns);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [transactions]);

  const isSubmittingRef = useRef(false);
  const initialRef = useRef(JSON.stringify(toFormState(existing)));
  const partyInputRef = useRef<HTMLInputElement>(null);
  const debtorInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const receiptAmountInputRef = useRef<HTMLInputElement>(null);
  const isDirty = JSON.stringify(form) !== initialRef.current;
  const isPaymentTransfer = form.type === 'Payment Transfer';
  const isReceipt = form.type === 'Receipt';

  const total = useMemo(() => {
    if (form.type === 'Payment Transfer') {
      return Number(form.transferAmount) || 0;
    }
    if (form.type === 'Receipt') {
      return Number(form.receiptAmount) || 0;
    }
    return form.items.reduce((sum, item) => sum + calcTotal(Number(item.quantity), Number(item.ratePerUnit)), 0);
  }, [form.items, form.type, form.transferAmount, form.receiptAmount]);

  const normalizedPartyQuery = normalizeParty(form.partyName);
  const matchedParty = useMemo(() => {
    return normalizedPartyQuery
      ? parties.find((p) => p.isActive !== false && normalizeParty(p.name) === normalizedPartyQuery) ?? null
      : null;
  }, [normalizedPartyQuery, parties]);
  const isNewPartyName = Boolean(form.partyName.trim() && !matchedParty);

  const currentPartyBalance = useMemo(() => {
    if (!matchedParty) return null;
    if (allTransactions.length > 0) {
      return computePartyBalance(
        matchedParty.openingBalance ?? 0,
        allTransactions,
        matchedParty.id,
        matchedParty.name
      );
    }
    return matchedParty.currentBalance ?? matchedParty.openingBalance ?? 0;
  }, [matchedParty, allTransactions]);

  const partySuggestions = useMemo(() => {
    const query = form.partyName.trim().toLowerCase();
    return query ? parties.filter((party) => party.isActive !== false && party.name.toLowerCase().includes(query)).slice(0, 5) : [];
  }, [form.partyName, parties]);

  const normalizedDebtorQuery = normalizeParty(form.debtorPartyName);
  const matchedDebtorParty = useMemo(() => {
    return normalizedDebtorQuery
      ? parties.find((p) => p.isActive !== false && normalizeParty(p.name) === normalizedDebtorQuery) ?? null
      : null;
  }, [normalizedDebtorQuery, parties]);
  const isNewDebtorPartyName = Boolean(form.debtorPartyName.trim() && !matchedDebtorParty);

  const debtorSuggestions = useMemo(() => {
    const query = form.debtorPartyName.trim().toLowerCase();
    return query ? parties.filter((party) => party.isActive !== false && party.name.toLowerCase().includes(query)).slice(0, 5) : [];
  }, [form.debtorPartyName, parties]);

  useEffect(() => {
    const next = toFormState(existing, initialType);
    setForm(next);
    initialRef.current = JSON.stringify(next);
    setSubmitError(null);
  }, [existing, initialType]);

  useEffect(() => {
    if (isPaymentTransfer && form.partyName && form.debtorPartyName && !form.transferAmount) {
      amountInputRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (form.type === 'Payment Transfer') {
      if (key === 'partyName') persistTransferParties({ creditorName: String(value) });
      if (key === 'partyId') persistTransferParties({ creditorId: String(value) });
    }
    if (key === 'debtorPartyName') persistTransferParties({ debtorName: String(value) });
    if (key === 'debtorPartyId') persistTransferParties({ debtorId: String(value) });
    if (key === 'source') persistTransferParties({ source: value as 'Cash' | 'Bank' });
  }

  function handleTypeChange(nextType: TransactionType) {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_TYPE, nextType);
    } catch {
      // ignore
    }
    if (nextType === 'Payment Transfer') {
      const saved = getSavedTransferParties();
      setForm((current) => ({
        ...current,
        type: nextType,
        partyName: current.partyName || saved.creditorName,
        partyId: current.partyId || saved.creditorId,
        debtorPartyName: current.debtorPartyName || saved.debtorName,
        debtorPartyId: current.debtorPartyId || saved.debtorId,
        source: current.source || saved.source,
      }));
    } else {
      setForm((current) => ({
        ...current,
        type: nextType,
      }));
    }
  }

  function handleSwapParties() {
    setForm((current) => {
      const nextCreditorName = current.debtorPartyName;
      const nextCreditorId = current.debtorPartyId;
      const nextDebtorName = current.partyName;
      const nextDebtorId = current.partyId;

      persistTransferParties({
        creditorName: nextCreditorName,
        creditorId: nextCreditorId,
        debtorName: nextDebtorName,
        debtorId: nextDebtorId,
      });

      return {
        ...current,
        partyName: nextCreditorName,
        partyId: nextCreditorId,
        debtorPartyName: nextDebtorName,
        debtorPartyId: nextDebtorId,
      };
    });
  }

  function handleClearParties() {
    persistTransferParties({
      creditorName: '',
      creditorId: '',
      debtorName: '',
      debtorId: '',
    });
    setForm((current) => ({
      ...current,
      partyName: '',
      partyId: '',
      debtorPartyName: '',
      debtorPartyId: '',
    }));
  }

  function updateItem(index: number, key: keyof ItemForm, value: string) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, currentIndex) => (currentIndex === index ? { ...item, [key]: value } : item)),
    }));
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!form.date) next.date = 'Date is required';

    if (isSuspense) {
      if (!suspenseAmount || Number(suspenseAmount) <= 0) {
        next.suspenseAmount = 'Enter an amount greater than 0';
      }
      if (!form.narration.trim()) {
        next.narration = 'Narration is required for suspense entries';
      }
    } else if (form.type === 'Payment Transfer') {
      if (!form.transferAmount || Number(form.transferAmount) <= 0) {
        next.transferAmount = 'Enter an amount greater than 0';
      }
      if (!form.partyName.trim()) {
        next.partyName = 'Creditor party is required';
      }
      if (!form.debtorPartyName.trim()) {
        next.debtorPartyName = 'Debtor party is required';
      }
      if (
        form.partyName.trim() &&
        form.debtorPartyName.trim() &&
        normalizeParty(form.partyName) === normalizeParty(form.debtorPartyName)
      ) {
        next.debtorPartyName = 'Creditor and Debtor parties cannot be the same';
      }
    } else if (form.type === 'Receipt') {
      if (!form.partyName.trim()) {
        next.partyName = 'Party is required for Receipt transaction';
      }
      if (!form.receiptAmount || isNaN(Number(form.receiptAmount))) {
        next.receiptAmount = 'Amount is required';
      } else if (Number(form.receiptAmount) <= 0) {
        next.receiptAmount = 'Receipt amount must be greater than zero';
      }
    } else {
      if (!form.partyName.trim()) next.partyName = 'Party name is required';
      form.items.forEach((item, index) => {
        if (!item.itemName.trim()) next[`itemName-${index}`] = 'Item name is required';
        if (!item.quantity || Number(item.quantity) <= 0) next[`quantity-${index}`] = 'Enter a quantity greater than 0';
        if (!item.ratePerUnit || Number(item.ratePerUnit) <= 0) next[`rate-${index}`] = 'Enter a rate greater than 0';
      });
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent, keepOpen = false) {
    event.preventDefault();
    if (isSubmittingRef.current || submitting || !validate()) return;
    isSubmittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);

    try {
      if (isSuspense && onSaveSuspense) {
        await onSaveSuspense({
          date: form.date,
          amount: parseFloat(suspenseAmount),
          narration: form.narration.trim(),
          referenceNo: suspenseReferenceNo.trim() || undefined,
        }, keepOpen);
        if (keepOpen) {
          setSuspenseAmount('');
          setSuspenseReferenceNo('');
          update('narration', '');
        }
        return;
      }

      const norm = normalizeParty(form.partyName);
      const existingMatch = parties.find((p) => p.isActive !== false && normalizeParty(p.name) === norm);
      if (!existingMatch && onSaveParty) {
        isSubmittingRef.current = false;
        setSubmitting(false);
        setModalTarget('creditor');
        setShowPartyModal(true);
        return;
      }

      if (form.type === 'Payment Transfer') {
        const normDeb = normalizeParty(form.debtorPartyName);
        const debMatch = parties.find((p) => p.isActive !== false && normalizeParty(p.name) === normDeb);
        if (!debMatch && onSaveParty) {
          isSubmittingRef.current = false;
          setSubmitting(false);
          setModalTarget('debtor');
          setShowPartyModal(true);
          return;
        }

        const amount = Math.round(Number(form.transferAmount) * 100) / 100;
        const items: TransactionItem[] = [
          {
            itemName: `Payment Transfer (${form.source})`,
            quantity: 1,
            unit: 'nos',
            ratePerUnit: amount,
            totalAmount: amount,
          },
        ];

        await onSave({
          id: existing?.id ?? '',
          date: form.date,
          partyId: form.partyId || existingMatch?.id || '',
          partyName: form.partyName.trim(),
          narration: form.narration.trim(),
          type: 'Payment Transfer',
          itemName: `Payment Transfer (${form.source})`,
          quantity: 1,
          ratePerUnit: amount,
          totalAmount: amount,
          items,
          source: form.source,
          transferPartyId: form.debtorPartyId || debMatch?.id || '',
          transferPartyName: form.debtorPartyName.trim(),
          transferRole: 'creditor',
        }, keepOpen);

        // Keep creditor & debtor parties remembered for future entries
        persistTransferParties({
          creditorName: form.partyName.trim(),
          creditorId: form.partyId || existingMatch?.id || '',
          debtorName: form.debtorPartyName.trim(),
          debtorId: form.debtorPartyId || debMatch?.id || '',
          source: form.source,
        });

        if (keepOpen) {
          const nextForm: FormState = {
            ...form,
            transferAmount: '',
            narration: '',
          };
          setForm(nextForm);
          initialRef.current = JSON.stringify(nextForm);
          setTimeout(() => amountInputRef.current?.focus(), 50);
        }
      } else if (form.type === 'Receipt') {
        const receiptAmount = Math.round(Number(form.receiptAmount) * 100) / 100;
        await onSave({
          id: existing?.id ?? '',
          date: form.date,
          partyId: form.partyId || existingMatch?.id || '',
          partyName: form.partyName.trim(),
          narration: form.narration.trim(),
          type: 'Receipt',
          itemName: 'Receipt Voucher',
          quantity: 1,
          ratePerUnit: receiptAmount,
          totalAmount: receiptAmount,
          amount: receiptAmount,
          referenceNo: form.referenceNo.trim() || undefined,
          items: [],
          source: form.source || 'Cash',
        }, keepOpen);

        if (keepOpen) {
          const nextForm: FormState = {
            ...form,
            receiptAmount: '',
            referenceNo: '',
            narration: '',
          };
          setForm(nextForm);
          initialRef.current = JSON.stringify(nextForm);
          setTimeout(() => receiptAmountInputRef.current?.focus(), 50);
        }
      } else {
        const items: TransactionItem[] = form.items.map((item) => {
          const quantity = Math.round(Number(item.quantity) * 100) / 100;
          const ratePerUnit = Math.round(Number(item.ratePerUnit) * 100) / 100;
          return {
            itemName: item.itemName.trim(),
            quantity,
            unit: item.unit.trim() || 'kg',
            ratePerUnit,
            totalAmount: calcTotal(quantity, ratePerUnit),
          };
        });

        await onSave({
          id: existing?.id ?? '',
          date: form.date,
          partyId: form.partyId || existingMatch?.id || '',
          partyName: form.partyName.trim(),
          narration: form.narration.trim(),
          type: form.type,
          itemName: items[0]?.itemName || '',
          quantity: items[0]?.quantity || 0,
          ratePerUnit: items[0]?.ratePerUnit || 0,
          totalAmount: items.reduce((sum, item) => sum + item.totalAmount, 0),
          items,
          source: form.source,
        }, keepOpen);
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to save this transaction.');
    } finally {
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function handlePartyModalSave(partyData: {
    id?: string;
    name: string;
    partyType: PartyCategory;
    location: string;
    investment: number;
    initialLoss: number;
    openingBalance?: number;
  }) {
    if (!onSaveParty) return;
    const saved = await onSaveParty(partyData);
    if (modalTarget === 'debtor') {
      setForm((current) => ({
        ...current,
        debtorPartyName: saved.name,
        debtorPartyId: saved.id,
      }));
      persistTransferParties({ debtorName: saved.name, debtorId: saved.id });
    } else {
      setForm((current) => ({
        ...current,
        partyName: saved.name,
        partyId: saved.id,
      }));
      persistTransferParties({ creditorName: saved.name, creditorId: saved.id });
    }
    setShowPartyModal(false);
  }

  function handleCancel() {
    if (isDirty) setConfirmDiscard(true);
    else onCancel();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={handleCancel}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          {existing ? 'Edit Transaction' : 'Add Transaction'}
        </h1>
        <p className="text-sm text-gray-500">
          {existing
            ? 'Update the transaction details'
            : isPaymentTransfer
            ? 'Record an inter-party fund transfer'
            : isReceipt
            ? 'Record an incoming customer receipt'
            : 'Record a new entry'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <fieldset className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
          <legend className="px-2 text-sm font-semibold text-gray-700">General Information</legend>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Date"
              type="date"
              value={form.date}
              onChange={(event) => update('date', event.target.value)}
              error={errors.date}
            />

            <Select
              label="Transaction Type"
              value={form.type}
              onChange={(event) => handleTypeChange(event.target.value as TransactionType)}
            >
              <option value="Sale">Sale</option>
              <option value="Purchase">Purchase</option>
              <option value="Payment">Payment</option>
              <option value="Receipt">Receipt</option>
              <option value="Stock Transfer">Stock Transfer</option>
              <option value="Payment Transfer">Payment Transfer</option>
            </Select>

            {!existing && onSaveSuspense && (
              <div className="sm:col-span-2 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer rounded-lg border border-amber-200 bg-amber-50/50 p-3 hover:bg-amber-50 transition">
                  <input
                    type="checkbox"
                    checked={isSuspense}
                    onChange={(event) => {
                      setIsSuspense(event.target.checked);
                      setErrors({});
                    }}
                    className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
                      <HelpCircle size={15} className="text-amber-600" />
                      Mark as Suspense (Party Unknown / Unidentified Payment)
                    </span>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Directly record this transaction into the Suspense Account. Can be claimed and assigned to a party at any time.
                    </p>
                  </div>
                </label>
              </div>
            )}
          </div>

          {/* Conditional Rendering: Suspense / Payment Transfer / Standard Party */}
          {isSuspense ? (
            <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/40 p-4">
              <div className="flex items-center gap-2 text-amber-900">
                <HelpCircle size={18} className="text-amber-600" />
                <h3 className="text-sm font-semibold">Suspense Entry Parameters</h3>
              </div>
              <p className="text-xs text-amber-800">
                Record unidentified payment into the Suspense Account with status <strong>Unclaimed</strong>.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Suspense Amount (₹) *"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0.01"
                  placeholder="0.00"
                  value={suspenseAmount}
                  onChange={(event) => setSuspenseAmount(event.target.value)}
                  error={errors.suspenseAmount}
                  required
                  autoFocus
                />

                <Input
                  label="Reference No. (Optional)"
                  type="text"
                  placeholder="e.g. UTR / IMPS / Cheque number"
                  value={suspenseReferenceNo}
                  onChange={(event) => setSuspenseReferenceNo(event.target.value)}
                />
              </div>
            </div>
          ) : isPaymentTransfer ? (
            <div className="space-y-4 rounded-xl border border-purple-200 bg-purple-50/40 p-4">
              <div className="flex items-center gap-2 text-purple-900">
                <ArrowRightLeft size={18} className="text-purple-600" />
                <h3 className="text-sm font-semibold">Payment Transfer Parameters</h3>
              </div>
              <p className="text-xs text-purple-700">
                Direct account transfer: Amount is deducted from Creditor party balance and added to Debtor party balance.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Select
                  label="Source Account / Mode"
                  value={form.source}
                  onChange={(event) => update('source', event.target.value as 'Cash' | 'Bank')}
                >
                  <option value="Cash">Cash (Default)</option>
                  <option value="Bank">Bank</option>
                </Select>

                <Input
                  ref={amountInputRef}
                  label="Amount (₹)"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0.01"
                  value={form.transferAmount}
                  onChange={(event) => update('transferAmount', event.target.value)}
                  placeholder="0.00"
                  error={errors.transferAmount}
                  required
                />
              </div>

              {/* Creditor Party (Deducted from balance) */}
              <div className="relative">
                <Input
                  ref={partyInputRef}
                  label="Creditor Party (Amount deducted from this party's balance -)"
                  value={form.partyName}
                  onChange={(event) => {
                    update('partyName', event.target.value);
                    update('partyId', '');
                    setShowPartySuggestions(true);
                  }}
                  onFocus={() => setShowPartySuggestions(true)}
                  onBlur={() => setTimeout(() => setShowPartySuggestions(false), 200)}
                  placeholder="Search or enter creditor party name"
                  error={errors.partyName}
                  autoComplete="off"
                />
                {showPartySuggestions && (partySuggestions.length > 0 || isNewPartyName) && (
                  <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                    {partySuggestions.map((party) => (
                      <li key={party.id}>
                        <button
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            setForm((current) => ({
                              ...current,
                              partyName: party.name,
                              partyId: party.id,
                            }));
                            persistTransferParties({ creditorName: party.name, creditorId: party.id });
                            setShowPartySuggestions(false);
                            partyInputRef.current?.blur();
                          }}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50"
                        >
                          <span className="font-medium">{party.name}</span>
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                            {getPartyCategoryMeta(party.partyType).label}
                          </span>
                        </button>
                      </li>
                    ))}
                    {isNewPartyName && onSaveParty && (
                      <li className="border-t border-gray-100 bg-amber-50/50">
                        <button
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            setModalTarget('creditor');
                            setShowPartySuggestions(false);
                            setShowPartyModal(true);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-blue-700 hover:bg-amber-100/60"
                        >
                          <UserPlus size={14} className="text-blue-600" />
                          Configure New Creditor Party: &quot;{form.partyName.trim()}&quot;
                        </button>
                      </li>
                    )}
                  </ul>
                )}
                {matchedParty ? (
                  <p className="mt-1 text-xs text-emerald-700">
                    Creditor: <strong>{matchedParty.name}</strong> ({getPartyCategoryMeta(matchedParty.partyType).label}) · Balance will decrease (-)
                  </p>
                ) : isNewPartyName ? (
                  <p className="mt-1 text-xs text-amber-700">
                    New party name detected. Party details will be asked before saving.
                  </p>
                ) : null}
              </div>

              {/* Sticky Parties Toolbar: Swap Roles & Clear */}
              <div className="flex items-center justify-between rounded-lg border border-purple-200/80 bg-purple-100/60 px-3 py-1.5 text-xs">
                <span className="font-medium text-purple-900">Sticky Transfer Parties</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSwapParties}
                    className="inline-flex items-center gap-1 font-semibold text-purple-700 hover:text-purple-950 transition-colors"
                    title="Swap Creditor and Debtor parties"
                  >
                    <ArrowRightLeft size={13} />
                    <span>Swap Roles (⇄)</span>
                  </button>
                  {(form.partyName || form.debtorPartyName) && (
                    <button
                      type="button"
                      onClick={handleClearParties}
                      className="text-gray-500 hover:text-red-600 transition-colors"
                      title="Clear saved party selections"
                    >
                      Clear Parties
                    </button>
                  )}
                </div>
              </div>

              {/* Debtor Party (Added to balance) */}
              <div className="relative">
                <Input
                  ref={debtorInputRef}
                  label="Debtor Party (Amount added to this party's balance +)"
                  value={form.debtorPartyName}
                  onChange={(event) => {
                    update('debtorPartyName', event.target.value);
                    update('debtorPartyId', '');
                    setShowDebtorSuggestions(true);
                  }}
                  onFocus={() => setShowDebtorSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowDebtorSuggestions(false), 200)}
                  placeholder="Search or enter debtor party name"
                  error={errors.debtorPartyName}
                  autoComplete="off"
                />
                {showDebtorSuggestions && (debtorSuggestions.length > 0 || isNewDebtorPartyName) && (
                  <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                    {debtorSuggestions.map((party) => (
                      <li key={party.id}>
                        <button
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            setForm((current) => ({
                              ...current,
                              debtorPartyName: party.name,
                              debtorPartyId: party.id,
                            }));
                            persistTransferParties({ debtorName: party.name, debtorId: party.id });
                            setShowDebtorSuggestions(false);
                            debtorInputRef.current?.blur();
                          }}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50"
                        >
                          <span className="font-medium">{party.name}</span>
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                            {getPartyCategoryMeta(party.partyType).label}
                          </span>
                        </button>
                      </li>
                    ))}
                    {isNewDebtorPartyName && onSaveParty && (
                      <li className="border-t border-gray-100 bg-amber-50/50">
                        <button
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            setModalTarget('debtor');
                            setShowDebtorSuggestions(false);
                            setShowPartyModal(true);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-blue-700 hover:bg-amber-100/60"
                        >
                          <UserPlus size={14} className="text-blue-600" />
                          Configure New Debtor Party: &quot;{form.debtorPartyName.trim()}&quot;
                        </button>
                      </li>
                    )}
                  </ul>
                )}
                {matchedDebtorParty ? (
                  <p className="mt-1 text-xs text-emerald-700">
                    Debtor: <strong>{matchedDebtorParty.name}</strong> ({getPartyCategoryMeta(matchedDebtorParty.partyType).label}) · Balance will increase (+)
                  </p>
                ) : isNewDebtorPartyName ? (
                  <p className="mt-1 text-xs text-amber-700">
                    New party name detected. Party details will be asked before saving.
                  </p>
                ) : null}
              </div>

              {Number(form.transferAmount) > 0 && form.partyName && form.debtorPartyName && (
                <div className="rounded-lg border border-purple-200 bg-white p-3 text-xs text-purple-950">
                  <span className="font-semibold">Transfer Preview:</span> Deduct {formatINR(Number(form.transferAmount))} from <strong>{form.partyName}</strong> and add to <strong>{form.debtorPartyName}</strong> via <strong>{form.source}</strong>.
                </div>
              )}
            </div>
          ) : isReceipt ? (
            <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
              <div className="flex items-center gap-2 text-emerald-900">
                <IndianRupee size={18} className="text-emerald-600" />
                <h3 className="text-sm font-semibold">Receipt Parameters</h3>
              </div>
              <p className="text-xs text-emerald-800">
                Incoming customer receipt: Increases Hand Cash and reduces the party&apos;s outstanding balance. No line items required.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Select
                  label="Payment Mode / Source"
                  value={form.source}
                  onChange={(event) => update('source', event.target.value as 'Cash' | 'Bank')}
                >
                  <option value="Cash">Cash (Hand Cash)</option>
                  <option value="Bank">Bank</option>
                </Select>

                <Input
                  ref={receiptAmountInputRef}
                  label="Receipt Amount (₹) *"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0.01"
                  placeholder="0.00"
                  value={form.receiptAmount}
                  onChange={(event) => update('receiptAmount', event.target.value)}
                  error={errors.receiptAmount}
                  required
                />

                <Input
                  label="Reference No. (Optional)"
                  type="text"
                  placeholder="e.g. UTR / Cheque / Slip No."
                  value={form.referenceNo}
                  onChange={(event) => update('referenceNo', event.target.value)}
                  error={errors.referenceNo}
                />
              </div>

              {/* Party selection */}
              <div className="relative">
                <Input
                  ref={partyInputRef}
                  label="Party Name *"
                  value={form.partyName}
                  onChange={(event) => {
                    update('partyName', event.target.value);
                    update('partyId', '');
                    setShowPartySuggestions(true);
                  }}
                  onFocus={() => setShowPartySuggestions(true)}
                  onBlur={() => setTimeout(() => setShowPartySuggestions(false), 200)}
                  placeholder="Search or enter party name"
                  error={errors.partyName}
                  autoComplete="off"
                />
                {showPartySuggestions && (partySuggestions.length > 0 || isNewPartyName) && (
                  <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                    {partySuggestions.map((party) => (
                      <li key={party.id}>
                        <button
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            setForm((current) => ({
                              ...current,
                              partyName: party.name,
                              partyId: party.id,
                            }));
                            setShowPartySuggestions(false);
                            partyInputRef.current?.blur();
                          }}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50"
                        >
                          <span className="font-medium">{party.name}</span>
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                            {getPartyCategoryMeta(party.partyType).label}
                          </span>
                        </button>
                      </li>
                    ))}
                    {isNewPartyName && onSaveParty && (
                      <li className="border-t border-gray-100 bg-amber-50/50">
                        <button
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            setModalTarget('creditor');
                            setShowPartySuggestions(false);
                            setShowPartyModal(true);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-blue-700 hover:bg-amber-100/60"
                        >
                          <UserPlus size={14} className="text-blue-600" />
                          Configure New Party: &quot;{form.partyName.trim()}&quot;
                        </button>
                      </li>
                    )}
                  </ul>
                )}
              </div>

              {/* Live Party Balance Feedback */}
              {matchedParty && currentPartyBalance !== null ? (
                <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3">
                  <div className="flex items-center justify-between text-xs font-medium text-blue-900">
                    <span>Live Party Balance Feedback</span>
                    <span className="font-semibold text-blue-700">Debtor Credit</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-gray-700">
                      Current: <strong>{formatBalanceWithDrCr(currentPartyBalance)}</strong>
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="font-semibold text-emerald-700">
                      After Receipt: <strong>{formatBalanceWithDrCr(round2(currentPartyBalance - (Number(form.receiptAmount) || 0)))}</strong>
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-blue-700">
                    Existing party: <strong>{matchedParty.name}</strong> ({getPartyCategoryMeta(matchedParty.partyType).label}) · Balance will reduce (-) by {formatINR(Number(form.receiptAmount) || 0)}.
                  </p>
                </div>
              ) : isNewPartyName ? (
                <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-800">
                  <div className="flex items-center gap-1.5">
                    <UserPlus size={14} className="shrink-0 text-amber-600" />
                    <span>New party name detected. Party details will be asked before saving.</span>
                  </div>
                  {onSaveParty && (
                    <button
                      type="button"
                      onClick={() => {
                        setModalTarget('creditor');
                        setShowPartyModal(true);
                      }}
                      className="font-semibold text-blue-700 underline hover:text-blue-900"
                    >
                      Set details now
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            /* Standard Party Name Field (for Sale, Purchase, Stock Transfer, Payment, Receipt) */
            <div className="space-y-2">
              <div className="relative">
                <Input
                  ref={partyInputRef}
                  label="Party Name"
                  value={form.partyName}
                  onChange={(event) => {
                    update('partyName', event.target.value);
                    update('partyId', '');
                    setShowPartySuggestions(true);
                  }}
                  onFocus={() => setShowPartySuggestions(true)}
                  onBlur={() => setTimeout(() => setShowPartySuggestions(false), 200)}
                  placeholder="Search or enter a party name"
                  error={errors.partyName}
                  autoComplete="off"
                />
                {showPartySuggestions && (partySuggestions.length > 0 || isNewPartyName) && (
                  <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                    {partySuggestions.map((party) => (
                      <li key={party.id}>
                        <button
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            setForm((current) => ({
                              ...current,
                              partyName: party.name,
                              partyId: party.id,
                            }));
                            setShowPartySuggestions(false);
                            partyInputRef.current?.blur();
                          }}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50"
                        >
                          <span className="font-medium">{party.name}</span>
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                            {getPartyCategoryMeta(party.partyType).label}
                          </span>
                        </button>
                      </li>
                    ))}
                    {isNewPartyName && onSaveParty && (
                      <li className="border-t border-gray-100 bg-amber-50/50">
                        <button
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            setModalTarget('creditor');
                            setShowPartySuggestions(false);
                            setShowPartyModal(true);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-blue-700 hover:bg-amber-100/60"
                        >
                          <UserPlus size={14} className="text-blue-600" />
                          Configure New Party: &quot;{form.partyName.trim()}&quot;
                        </button>
                      </li>
                    )}
                  </ul>
                )}
              </div>

              {matchedParty ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-700">
                  <Check size={13} className="text-emerald-500" />
                  <span>
                    Existing party: <strong>{matchedParty.name}</strong> ({getPartyCategoryMeta(matchedParty.partyType).label})
                  </span>
                </div>
              ) : isNewPartyName ? (
                <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-800">
                  <div className="flex items-center gap-1.5">
                    <UserPlus size={14} className="shrink-0 text-amber-600" />
                    <span>New party name detected. Party details will be asked before saving.</span>
                  </div>
                  {onSaveParty && (
                    <button
                      type="button"
                      onClick={() => {
                        setModalTarget('creditor');
                        setShowPartyModal(true);
                      }}
                      className="font-semibold text-blue-700 underline hover:text-blue-900"
                    >
                      Set details now
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  Case-insensitive party detection: new names will prompt for category, location, investment, loss & opening balance.
                </p>
              )}
            </div>
          )}

          <Textarea
            label="Narration / Notes"
            value={form.narration}
            onChange={(event) => update('narration', event.target.value)}
            placeholder="Optional notes about this transaction"
            rows={3}
          />
        </fieldset>

        {/* Items Fieldset: ONLY rendered when NOT Payment Transfer, NOT Suspense, and NOT Receipt */}
        {!isPaymentTransfer && !isSuspense && !isReceipt && (
          <fieldset className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
            <legend className="px-2 text-sm font-semibold text-gray-700">Items</legend>
            {form.items.map((item, index) => (
              <div key={index} className="space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Item {index + 1}</span>
                  {form.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        update(
                          'items',
                          form.items.filter((_, itemIndex) => itemIndex !== index)
                        )
                      }
                      className="rounded p-1 text-red-500 hover:bg-red-50"
                      aria-label={`Remove item ${index + 1}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <Input
                  label="Item Name"
                  value={item.itemName}
                  onChange={(event) => updateItem(index, 'itemName', event.target.value)}
                  placeholder="e.g. HDPE Granules"
                  error={errors[`itemName-${index}`]}
                />
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    label="Quantity"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    value={item.quantity}
                    onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                    error={errors[`quantity-${index}`]}
                  />
                  <Input
                    label="Unit"
                    value={item.unit}
                    onChange={(event) => updateItem(index, 'unit', event.target.value)}
                    placeholder="kg"
                  />
                  <Input
                    label="Rate (₹)"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    value={item.ratePerUnit}
                    onChange={(event) => updateItem(index, 'ratePerUnit', event.target.value)}
                    error={errors[`rate-${index}`]}
                  />
                </div>
                <div className="text-right text-sm font-medium text-gray-700">
                  Line amount: {formatINR(calcTotal(Number(item.quantity), Number(item.ratePerUnit)))}
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() => update('items', [...form.items, emptyItem()])}
              className="w-full"
            >
              <Plus size={16} />
              Add item
            </Button>
            <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-3">
              <span className="text-sm font-medium text-blue-700">Transaction Total</span>
              <span className="text-lg font-bold text-blue-700">{formatINR(total)}</span>
            </div>
          </fieldset>
        )}

        {isReceipt && (
          <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3 border border-emerald-200">
            <span className="text-sm font-medium text-emerald-900">Receipt Total</span>
            <span className="text-lg font-bold text-emerald-800">{formatINR(Number(form.receiptAmount) || 0)}</span>
          </div>
        )}

        {isSuspense && (
          <div className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3 border border-amber-200">
            <span className="text-sm font-medium text-amber-900">Suspense Total</span>
            <span className="text-lg font-bold text-amber-800">{formatINR(Number(suspenseAmount) || 0)}</span>
          </div>
        )}

        {submitError && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {submitError}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            disabled={submitting}
            className={`flex-1 ${
              isSuspense
                ? 'bg-amber-600 hover:bg-amber-700'
                : isReceipt
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : ''
            }`}
          >
            <Check size={16} />
            {submitting
              ? isSuspense
                ? 'Recording…'
                : isReceipt
                ? 'Saving Receipt…'
                : 'Saving…'
              : isSuspense
              ? 'Record Suspense Entry'
              : isReceipt
              ? existing
                ? 'Update Receipt'
                : 'Save Receipt'
              : existing
              ? 'Update Transaction'
              : 'Save Transaction'}
          </Button>
          {!existing && (isPaymentTransfer || isReceipt) && !isSuspense && (
            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={(e) => handleSubmit(e, true)}
              className={
                isReceipt
                  ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100'
                  : 'border-purple-300 text-purple-700 hover:bg-purple-50 active:bg-purple-100'
              }
              title={
                isReceipt
                  ? 'Save this receipt and enter another receipt'
                  : 'Save this transfer and immediately enter another transfer with the same parties'
              }
            >
              <Plus size={16} />
              Save &amp; Add Another
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </form>

      {confirmDiscard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/40"
            onClick={() => setConfirmDiscard(false)}
            aria-hidden
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center gap-2">
              <AlertCircle size={20} className="text-amber-500" />
              <h3 className="text-base font-semibold">Discard changes?</h3>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              You have unsaved changes. Are you sure you want to leave?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmDiscard(false)}>
                Keep Editing
              </Button>
              <Button variant="danger" onClick={onCancel}>
                Discard
              </Button>
            </div>
          </div>
        </div>
      )}

      <PartyModal
        open={showPartyModal}
        initialName={modalTarget === 'debtor' ? form.debtorPartyName.trim() : form.partyName.trim()}
        initialCategory={
          modalTarget === 'debtor'
            ? 'debtor'
            : form.type === 'Sale' || form.type === 'Receipt'
            ? 'debtor'
            : form.type === 'Stock Transfer'
            ? 'transfer'
            : 'creditor'
        }
        parties={parties}
        onSave={handlePartyModalSave}
        onClose={() => setShowPartyModal(false)}
      />
    </div>
  );
}
