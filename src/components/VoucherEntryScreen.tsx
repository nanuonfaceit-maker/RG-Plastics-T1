import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  HelpCircle,
  Package,
} from 'lucide-react';
import type {
  Voucher,
  VoucherEntryLine,
  LedgerAccount,
  TallyVoucherType,
  BalanceType,
} from '@/types/accounting';
import type { StockItem, Godown, ItemEntryLine } from '@/types/inventory';
import type { Company } from '@/types/company';
import {
  validateDoubleEntry,
  generateNextVoucherNumber,
  formatINR,
  todayISO,
  round2,
} from '@/services/accountingEngine';

interface Props {
  company: Company;
  existingVoucher?: Voucher | null;
  initialType?: TallyVoucherType;
  ledgers: LedgerAccount[];
  stockItems: StockItem[];
  godowns: Godown[];
  allVouchers: Voucher[];
  onSave: (voucher: Voucher) => Promise<void>;
  onCancel: () => void;
  onOpenCreateLedger?: () => void;
}

export function VoucherEntryScreen({
  company,
  existingVoucher,
  initialType = 'Sales',
  ledgers,
  stockItems,
  godowns,
  allVouchers,
  onSave,
  onCancel,
  onOpenCreateLedger,
}: Props) {
  const [voucherType, setVoucherType] = useState<TallyVoucherType>(
    existingVoucher?.voucherType || initialType
  );
  const [voucherNumber, setVoucherNumber] = useState('');
  const [date, setDate] = useState(existingVoucher?.date || todayISO());
  const [referenceNo, setReferenceNo] = useState(existingVoucher?.referenceNo || '');
  const [narration, setNarration] = useState(existingVoucher?.narration || '');
  const [isSingleEntry, setIsSingleEntry] = useState(
    existingVoucher?.isSingleEntryMode || false
  );

  // Double-entry Lines
  const [lines, setLines] = useState<VoucherEntryLine[]>([]);

  // Single-entry state
  const [singleAccountLedgerId, setSingleAccountLedgerId] = useState('');
  const [singlePartyLedgerId, setSinglePartyLedgerId] = useState('');
  const [singleAmount, setSingleAmount] = useState('');

  // Item Lines
  const [itemLines, setItemLines] = useState<ItemEntryLine[]>([]);

  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showAcceptPrompt, setShowAcceptPrompt] = useState(false);

  // Initialize or reset form state
  useEffect(() => {
    if (existingVoucher) {
      setVoucherType(existingVoucher.voucherType);
      setVoucherNumber(existingVoucher.voucherNumber);
      setDate(existingVoucher.date);
      setReferenceNo(existingVoucher.referenceNo || '');
      setNarration(existingVoucher.narration || '');
      setLines(existingVoucher.lines || []);
      setItemLines(existingVoucher.itemLines || []);
      setIsSingleEntry(existingVoucher.isSingleEntryMode || false);

      if (existingVoucher.isSingleEntryMode && existingVoucher.lines.length >= 2) {
        if (existingVoucher.voucherType === 'Payment') {
          const party = existingVoucher.lines.find((l) => l.type === 'Dr');
          const acc = existingVoucher.lines.find((l) => l.type === 'Cr');
          if (acc) setSingleAccountLedgerId(acc.ledgerId);
          if (party) {
            setSinglePartyLedgerId(party.ledgerId);
            setSingleAmount(String(party.amount));
          }
        } else if (existingVoucher.voucherType === 'Receipt') {
          const acc = existingVoucher.lines.find((l) => l.type === 'Dr');
          const party = existingVoucher.lines.find((l) => l.type === 'Cr');
          if (acc) setSingleAccountLedgerId(acc.ledgerId);
          if (party) {
            setSinglePartyLedgerId(party.ledgerId);
            setSingleAmount(String(party.amount));
          }
        }
      }
    } else {
      const nextNum = generateNextVoucherNumber(voucherType, allVouchers);
      setVoucherNumber(nextNum);
      setDate(todayISO());
      setReferenceNo('');
      setNarration('');
      setItemLines([]);

      const cashBank = ledgers.find(
        (l) => l.groupId === 'cash-in-hand' || l.groupId === 'bank-accounts'
      );
      const debtor = ledgers.find((l) => l.groupId === 'sundry-debtors');
      const creditor = ledgers.find((l) => l.groupId === 'sundry-creditors');
      const sales = ledgers.find((l) => l.groupId === 'sales-accounts');
      const purchase = ledgers.find((l) => l.groupId === 'purchase-accounts');

      if (voucherType === 'Sales') {
        setLines([
          {
            id: '1',
            ledgerId: debtor?.id || ledgers[0]?.id || '',
            ledgerName: debtor?.name || ledgers[0]?.name || '',
            type: 'Dr',
            amount: 0,
          },
          {
            id: '2',
            ledgerId: sales?.id || ledgers[1]?.id || '',
            ledgerName: sales?.name || ledgers[1]?.name || '',
            type: 'Cr',
            amount: 0,
          },
        ]);
      } else if (voucherType === 'Purchase') {
        setLines([
          {
            id: '1',
            ledgerId: purchase?.id || ledgers[0]?.id || '',
            ledgerName: purchase?.name || ledgers[0]?.name || '',
            type: 'Dr',
            amount: 0,
          },
          {
            id: '2',
            ledgerId: creditor?.id || ledgers[1]?.id || '',
            ledgerName: creditor?.name || ledgers[1]?.name || '',
            type: 'Cr',
            amount: 0,
          },
        ]);
      } else if (voucherType === 'Payment') {
        setLines([
          {
            id: '1',
            ledgerId: creditor?.id || ledgers[0]?.id || '',
            ledgerName: creditor?.name || ledgers[0]?.name || '',
            type: 'Dr',
            amount: 0,
          },
          {
            id: '2',
            ledgerId: cashBank?.id || ledgers[1]?.id || '',
            ledgerName: cashBank?.name || ledgers[1]?.name || '',
            type: 'Cr',
            amount: 0,
          },
        ]);
        if (cashBank) setSingleAccountLedgerId(cashBank.id);
        if (creditor) setSinglePartyLedgerId(creditor.id);
      } else if (voucherType === 'Receipt') {
        setLines([
          {
            id: '1',
            ledgerId: cashBank?.id || ledgers[0]?.id || '',
            ledgerName: cashBank?.name || ledgers[0]?.name || '',
            type: 'Dr',
            amount: 0,
          },
          {
            id: '2',
            ledgerId: debtor?.id || ledgers[1]?.id || '',
            ledgerName: debtor?.name || ledgers[1]?.name || '',
            type: 'Cr',
            amount: 0,
          },
        ]);
        if (cashBank) setSingleAccountLedgerId(cashBank.id);
        if (debtor) setSinglePartyLedgerId(debtor.id);
      } else {
        setLines([
          {
            id: '1',
            ledgerId: ledgers[0]?.id || '',
            ledgerName: ledgers[0]?.name || '',
            type: 'Dr',
            amount: 0,
          },
          {
            id: '2',
            ledgerId: ledgers[1]?.id || '',
            ledgerName: ledgers[1]?.name || '',
            type: 'Cr',
            amount: 0,
          },
        ]);
      }
    }
  }, [existingVoucher, voucherType, allVouchers, ledgers]);

  // Compute live Double-Entry validation
  const doubleEntryStats = useMemo(() => {
    let activeLines = lines;
    if (isSingleEntry && (voucherType === 'Payment' || voucherType === 'Receipt')) {
      const amt = parseFloat(singleAmount) || 0;
      const acc = ledgers.find((l) => l.id === singleAccountLedgerId);
      const party = ledgers.find((l) => l.id === singlePartyLedgerId);
      if (voucherType === 'Payment') {
        activeLines = [
          { id: 's1', ledgerId: singlePartyLedgerId, ledgerName: party?.name || '', type: 'Dr', amount: amt },
          { id: 's2', ledgerId: singleAccountLedgerId, ledgerName: acc?.name || '', type: 'Cr', amount: amt },
        ];
      } else {
        activeLines = [
          { id: 's1', ledgerId: singleAccountLedgerId, ledgerName: acc?.name || '', type: 'Dr', amount: amt },
          { id: 's2', ledgerId: singlePartyLedgerId, ledgerName: party?.name || '', type: 'Cr', amount: amt },
        ];
      }
    }

    return validateDoubleEntry(activeLines);
  }, [lines, isSingleEntry, voucherType, singleAmount, singleAccountLedgerId, singlePartyLedgerId, ledgers]);

  function updateLine(index: number, updates: Partial<VoucherEntryLine>) {
    setLines((prev) => {
      const copy = [...prev];
      const existing = copy[index];
      if (updates.ledgerId) {
        const found = ledgers.find((l) => l.id === updates.ledgerId);
        if (found) updates.ledgerName = found.name;
      }
      copy[index] = { ...existing, ...updates };
      return copy;
    });
  }

  function addLine() {
    const last = lines[lines.length - 1];
    const defaultType: BalanceType = last?.type === 'Dr' ? 'Cr' : 'Dr';
    const balancingAmt = doubleEntryStats.difference > 0 ? doubleEntryStats.difference : 0;

    setLines((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        ledgerId: ledgers[0]?.id || '',
        ledgerName: ledgers[0]?.name || '',
        type: defaultType,
        amount: balancingAmt,
      },
    ]);
  }

  function removeLine(index: number) {
    if (lines.length <= 2) {
      alert('A double-entry voucher must contain at least 2 lines.');
      return;
    }
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function addItemLine() {
    const defaultItem = stockItems[0];
    const defaultGodown = godowns[0];
    if (!defaultItem) return;

    const rate = defaultItem.openingRate || 100;
    const qty = 1;
    const amount = qty * rate;
    const gstRate = defaultItem.gstRate || 18;
    const halfRate = gstRate / 2;

    const cgst = round2((amount * halfRate) / 100);
    const sgst = round2((amount * halfRate) / 100);

    setItemLines((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        itemId: defaultItem.id,
        itemName: defaultItem.name,
        godownId: defaultGodown?.id,
        godownName: defaultGodown?.name,
        quantity: qty,
        unit: defaultItem.unit,
        rate,
        amount,
        gstRate,
        hsnCode: defaultItem.hsnCode,
        cgst,
        sgst,
        igst: 0,
      },
    ]);
  }

  function updateItemLine(index: number, updates: Partial<ItemEntryLine>) {
    setItemLines((prev) => {
      const copy = [...prev];
      const line = { ...copy[index], ...updates };

      if (updates.itemId) {
        const item = stockItems.find((s) => s.id === updates.itemId);
        if (item) {
          line.itemName = item.name;
          line.unit = item.unit;
          line.hsnCode = item.hsnCode;
          line.gstRate = item.gstRate;
          if (!line.rate) line.rate = item.openingRate || 100;
        }
      }

      if (updates.godownId) {
        const gd = godowns.find((g) => g.id === updates.godownId);
        if (gd) line.godownName = gd.name;
      }

      const qty = Number(line.quantity) || 0;
      const rate = Number(line.rate) || 0;
      line.amount = round2(qty * rate);

      const primaryPartyLine = lines.find((l) =>
        voucherType === 'Sales' ? l.type === 'Dr' : l.type === 'Cr'
      );
      const party = ledgers.find((l) => l.id === primaryPartyLine?.ledgerId);
      const isInterstate = party?.state && party.state !== company.state;

      const gstRate = Number(line.gstRate) || 0;
      if (isInterstate) {
        line.cgst = 0;
        line.sgst = 0;
        line.igst = round2((line.amount * gstRate) / 100);
      } else {
        const halfRate = gstRate / 2;
        line.cgst = round2((line.amount * halfRate) / 100);
        line.sgst = round2((line.amount * halfRate) / 100);
        line.igst = 0;
      }

      copy[index] = line;
      return copy;
    });
  }

  function removeItemLine(index: number) {
    setItemLines((prev) => prev.filter((_, i) => i !== index));
  }

  function syncItemsToAccounts() {
    if (itemLines.length === 0) return;

    const itemsSubtotal = round2(itemLines.reduce((sum, item) => sum + item.amount, 0));
    const totalCGST = round2(itemLines.reduce((sum, item) => sum + item.cgst, 0));
    const totalSGST = round2(itemLines.reduce((sum, item) => sum + item.sgst, 0));
    const totalIGST = round2(itemLines.reduce((sum, item) => sum + item.igst, 0));
    const grandTotal = round2(itemsSubtotal + totalCGST + totalSGST + totalIGST);

    const partyGroupId = voucherType === 'Sales' ? 'sundry-debtors' : 'sundry-creditors';
    const mainAccGroupId = voucherType === 'Sales' ? 'sales-accounts' : 'purchase-accounts';

    const partyLedger = ledgers.find((l) => l.groupId === partyGroupId) || ledgers[0];
    const mainLedger = ledgers.find((l) => l.groupId === mainAccGroupId) || ledgers[1];
    const cgstLedger = ledgers.find((l) => l.name.toLowerCase().includes('cgst'));
    const sgstLedger = ledgers.find((l) => l.name.toLowerCase().includes('sgst'));
    const igstLedger = ledgers.find((l) => l.name.toLowerCase().includes('igst'));

    const newLines: VoucherEntryLine[] = [];

    if (voucherType === 'Sales') {
      newLines.push({
        id: '1',
        ledgerId: partyLedger?.id || '',
        ledgerName: partyLedger?.name || '',
        type: 'Dr',
        amount: grandTotal,
      });
      newLines.push({
        id: '2',
        ledgerId: mainLedger?.id || '',
        ledgerName: mainLedger?.name || '',
        type: 'Cr',
        amount: itemsSubtotal,
      });
      if (totalCGST > 0 && cgstLedger) {
        newLines.push({ id: '3', ledgerId: cgstLedger.id, ledgerName: cgstLedger.name, type: 'Cr', amount: totalCGST });
      }
      if (totalSGST > 0 && sgstLedger) {
        newLines.push({ id: '4', ledgerId: sgstLedger.id, ledgerName: sgstLedger.name, type: 'Cr', amount: totalSGST });
      }
      if (totalIGST > 0 && igstLedger) {
        newLines.push({ id: '5', ledgerId: igstLedger.id, ledgerName: igstLedger.name, type: 'Cr', amount: totalIGST });
      }
    } else {
      newLines.push({
        id: '1',
        ledgerId: mainLedger?.id || '',
        ledgerName: mainLedger?.name || '',
        type: 'Dr',
        amount: itemsSubtotal,
      });
      if (totalCGST > 0 && cgstLedger) {
        newLines.push({ id: '2', ledgerId: cgstLedger.id, ledgerName: cgstLedger.name, type: 'Dr', amount: totalCGST });
      }
      if (totalSGST > 0 && sgstLedger) {
        newLines.push({ id: '3', ledgerId: sgstLedger.id, ledgerName: sgstLedger.name, type: 'Dr', amount: totalSGST });
      }
      if (totalIGST > 0 && igstLedger) {
        newLines.push({ id: '4', ledgerId: igstLedger.id, ledgerName: igstLedger.name, type: 'Dr', amount: totalIGST });
      }
      newLines.push({
        id: '99',
        ledgerId: partyLedger?.id || '',
        ledgerName: partyLedger?.name || '',
        type: 'Cr',
        amount: grandTotal,
      });
    }

    setLines(newLines);
  }

  async function handleSave() {
    let finalLines = lines;
    if (isSingleEntry && (voucherType === 'Payment' || voucherType === 'Receipt')) {
      const amt = parseFloat(singleAmount) || 0;
      const acc = ledgers.find((l) => l.id === singleAccountLedgerId);
      const party = ledgers.find((l) => l.id === singlePartyLedgerId);
      if (!acc || !party || amt <= 0) {
        setValidationErrors(['Please select both accounts and enter a valid positive amount.']);
        return;
      }
      if (voucherType === 'Payment') {
        finalLines = [
          { id: '1', ledgerId: party.id, ledgerName: party.name, type: 'Dr', amount: amt },
          { id: '2', ledgerId: acc.id, ledgerName: acc.name, type: 'Cr', amount: amt },
        ];
      } else {
        finalLines = [
          { id: '1', ledgerId: acc.id, ledgerName: acc.name, type: 'Dr', amount: amt },
          { id: '2', ledgerId: party.id, ledgerName: party.name, type: 'Cr', amount: amt },
        ];
      }
    }

    const validation = validateDoubleEntry(finalLines);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    const v: Voucher = {
      id: existingVoucher?.id || `vch-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      companyId: company.id,
      voucherType,
      voucherNumber: voucherNumber.trim(),
      date,
      lines: finalLines,
      itemLines: itemLines.length > 0 ? itemLines : undefined,
      narration: narration.trim(),
      referenceNo: referenceNo.trim() || undefined,
      isSingleEntryMode: isSingleEntry,
      createdAt: existingVoucher?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSaving(true);
    setValidationErrors([]);
    try {
      await onSave(v);
      setShowAcceptPrompt(false);
    } catch (err) {
      setValidationErrors([err instanceof Error ? err.message : 'Failed to save voucher.']);
    } finally {
      setSaving(false);
    }
  }

  // Keyboard shortcut listener for Ctrl+A or Enter to trigger Accept
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setShowAcceptPrompt(true);
      } else if (e.key === 'Escape') {
        if (showAcceptPrompt) {
          setShowAcceptPrompt(false);
        } else {
          onCancel();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAcceptPrompt, onCancel]);

  const VOUCHER_BUTTONS: { type: TallyVoucherType; key: string }[] = [
    { type: 'Contra', key: 'F4' },
    { type: 'Payment', key: 'F5' },
    { type: 'Receipt', key: 'F6' },
    { type: 'Journal', key: 'F7' },
    { type: 'Sales', key: 'F8' },
    { type: 'Purchase', key: 'F9' },
    { type: 'Debit Note', key: 'Alt+F9' },
    { type: 'Credit Note', key: 'Alt+F8' },
  ];

  return (
    <div className="space-y-2 select-none font-sans text-xs">
      {/* Top Tally Title & Voucher Switch Bar */}
      <div className="bg-[#004b6e] text-white p-2 border border-[#003859] flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="bg-[#00253d] border border-[#557e96] hover:bg-[#fed843] hover:text-black px-2 py-0.5 text-xs font-bold transition flex items-center gap-1"
          >
            <ArrowLeft size={12} />
            <span>Esc: Back</span>
          </button>
          <div>
            <h1 className="text-sm font-black tracking-wide text-white uppercase flex items-center gap-2">
              <span>Accounting Voucher Creation</span>
              <span className="bg-[#fed843] text-black px-1.5 py-0.2 font-mono font-bold text-xs">
                {voucherType}
              </span>
            </h1>
          </div>
        </div>

        {/* Voucher Type Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {VOUCHER_BUTTONS.map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => setVoucherType(item.type)}
              className={`px-2 py-0.5 text-[11px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                voucherType === item.type
                  ? 'bg-[#fed843] text-black border-[#00253d] shadow-xs'
                  : 'bg-[#003859] text-[#c2d7e4] border-[#557e96] hover:bg-[#fed843] hover:text-black'
              }`}
            >
              <span className="font-mono text-[9px] text-[#fed843] group-hover:text-black font-bold">
                {item.key}:
              </span>
              <span>{item.type}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Voucher Ledger Container */}
      <div className="bg-white border-2 border-[#004b6e] shadow-md text-[#0d222f]">
        {/* Voucher Meta Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-12 bg-[#f0f5f8] border-b border-[#8caebd] p-2 gap-2 text-xs">
          <div className="sm:col-span-3 flex items-center gap-1.5">
            <span className="font-bold text-[#004b6e] text-[11px]">Voucher No:</span>
            <input
              type="text"
              value={voucherNumber}
              onChange={(e) => setVoucherNumber(e.target.value)}
              className="bg-white border border-[#8caebd] px-2 py-0.5 font-mono font-bold text-[#0d222f] w-28 focus:bg-[#fed843] focus:text-black focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3 flex items-center gap-1.5">
            <span className="font-bold text-[#004b6e] text-[11px]">Ref No:</span>
            <input
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="e.g. Bill #1234"
              className="bg-white border border-[#8caebd] px-2 py-0.5 text-[#0d222f] w-32 focus:bg-[#fed843] focus:text-black focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3 flex items-center gap-1.5">
            <span className="font-bold text-[#004b6e] text-[11px]">Date:</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-white border border-[#8caebd] px-2 py-0.5 font-mono font-bold text-[#0d222f] focus:bg-[#fed843] focus:text-black focus:outline-none"
            />
          </div>

          {(voucherType === 'Payment' || voucherType === 'Receipt') && (
            <div className="sm:col-span-3 text-right">
              <button
                type="button"
                onClick={() => setIsSingleEntry((prev) => !prev)}
                className={`px-2 py-0.5 text-[10px] font-bold border transition ${
                  isSingleEntry
                    ? 'bg-[#fed843] text-black border-[#00253d]'
                    : 'bg-[#edf4f8] text-[#004b6e] border-[#7ea1b5] hover:bg-[#fed843] hover:text-black'
                }`}
              >
                {isSingleEntry ? '✓ Single-Entry Mode' : 'Switch to Single-Entry'}
              </button>
            </div>
          )}
        </div>

        {/* Validation Errors Box */}
        {validationErrors.length > 0 && (
          <div className="p-2 bg-[#ffebee] border-b border-[#a61a1a] text-xs text-[#a61a1a] space-y-0.5">
            <div className="flex items-center gap-1 font-bold">
              <AlertTriangle size={13} />
              <span>Validation Warning:</span>
            </div>
            {validationErrors.map((err, i) => (
              <p key={i} className="pl-4">• {err}</p>
            ))}
          </div>
        )}

        {/* SINGLE-ENTRY SHORTCUT MODE */}
        {isSingleEntry && (voucherType === 'Payment' || voucherType === 'Receipt') ? (
          <div className="p-4 space-y-3 max-w-lg">
            <div className="bg-[#f0f5f8] border border-[#8caebd] p-2 text-xs text-[#004b6e] font-semibold">
              Single-Entry Mode: Select the Bank/Cash account followed by the ledger and amount.
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#004b6e] mb-0.5">
                Account (Cash / Bank) *
              </label>
              <select
                value={singleAccountLedgerId}
                onChange={(e) => setSingleAccountLedgerId(e.target.value)}
                className="w-full bg-white border border-[#8caebd] px-2 py-1 font-semibold text-[#0d222f] focus:bg-[#fed843] focus:text-black focus:outline-none"
              >
                {ledgers
                  .filter((l) => l.groupId === 'cash-in-hand' || l.groupId === 'bank-accounts')
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.groupName})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="block text-[11px] font-bold text-[#004b6e]">
                  Particulars (Party / Expense / Income) *
                </label>
                {onOpenCreateLedger && (
                  <button
                    type="button"
                    onClick={onOpenCreateLedger}
                    className="text-[10px] text-[#a61a1a] font-bold hover:underline"
                  >
                    + Create Ledger (Alt+C)
                  </button>
                )}
              </div>
              <select
                value={singlePartyLedgerId}
                onChange={(e) => setSinglePartyLedgerId(e.target.value)}
                className="w-full bg-white border border-[#8caebd] px-2 py-1 font-semibold text-[#0d222f] focus:bg-[#fed843] focus:text-black focus:outline-none"
              >
                {ledgers
                  .filter((l) => l.id !== singleAccountLedgerId)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} [{l.groupName}]
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#004b6e] mb-0.5">
                Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={singleAmount}
                onChange={(e) => setSingleAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white border border-[#8caebd] px-3 py-1.5 text-base font-bold font-mono text-[#004b6e] focus:bg-[#fed843] focus:text-black focus:outline-none"
              />
            </div>
          </div>
        ) : (
          /* STANDARD DOUBLE-ENTRY LINES TABLE */
          <div className="p-2 space-y-2">
            <div className="overflow-x-auto border border-[#8caebd]">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[#004b6e] text-white text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-1 px-2 w-16 border-r border-[#003859]">Dr / Cr</th>
                    <th className="py-1 px-2 border-r border-[#003859]">Particulars (Ledger Account)</th>
                    <th className="py-1 px-2 w-36 text-right border-r border-[#003859]">Debit (₹)</th>
                    <th className="py-1 px-2 w-36 text-right border-r border-[#003859]">Credit (₹)</th>
                    <th className="py-1 px-1 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c2d7e4]">
                  {lines.map((line, idx) => {
                    const matchedLedger = ledgers.find((l) => l.id === line.ledgerId);
                    return (
                      <tr key={line.id || idx} className="hover:bg-[#fed843]/20">
                        {/* Dr / Cr Selector */}
                        <td className="py-1 px-2 align-top border-r border-[#c2d7e4]">
                          <select
                            value={line.type}
                            onChange={(e) => updateLine(idx, { type: e.target.value as BalanceType })}
                            className="w-full bg-white border border-[#8caebd] px-1 py-0.5 text-xs font-bold font-mono text-[#004b6e] focus:bg-[#fed843] focus:text-black focus:outline-none"
                          >
                            <option value="Dr">Dr</option>
                            <option value="Cr">Cr</option>
                          </select>
                        </td>

                        {/* Ledger Account Selector */}
                        <td className="py-1 px-2 align-top border-r border-[#c2d7e4]">
                          <select
                            value={line.ledgerId}
                            onChange={(e) => updateLine(idx, { ledgerId: e.target.value })}
                            className="w-full bg-white border border-[#8caebd] px-2 py-0.5 text-xs font-bold text-[#0d222f] focus:bg-[#fed843] focus:text-black focus:outline-none"
                          >
                            {ledgers.map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.name} [{l.groupName}]
                              </option>
                            ))}
                          </select>
                          {matchedLedger && (
                            <p className="mt-0.5 text-[9px] text-[#4a6777] font-mono">
                              Opening: {formatINR(matchedLedger.openingBalance)} ({matchedLedger.openingType})
                            </p>
                          )}
                        </td>

                        {/* Debit Input */}
                        <td className="py-1 px-2 align-top border-r border-[#c2d7e4]">
                          {line.type === 'Dr' ? (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.amount || ''}
                              onChange={(e) => updateLine(idx, { amount: parseFloat(e.target.value) || 0 })}
                              placeholder="0.00"
                              className="w-full bg-white border border-[#8caebd] px-2 py-0.5 text-right font-mono font-bold text-[#004b6e] focus:bg-[#fed843] focus:text-black focus:outline-none"
                            />
                          ) : (
                            <span className="block py-0.5 text-right text-[#8caebd] font-mono">-</span>
                          )}
                        </td>

                        {/* Credit Input */}
                        <td className="py-1 px-2 align-top border-r border-[#c2d7e4]">
                          {line.type === 'Cr' ? (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.amount || ''}
                              onChange={(e) => updateLine(idx, { amount: parseFloat(e.target.value) || 0 })}
                              placeholder="0.00"
                              className="w-full bg-white border border-[#8caebd] px-2 py-0.5 text-right font-mono font-bold text-[#a61a1a] focus:bg-[#fed843] focus:text-black focus:outline-none"
                            />
                          ) : (
                            <span className="block py-0.5 text-right text-[#8caebd] font-mono">-</span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-1 px-1 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            disabled={lines.length <= 2}
                            className="text-[#4a6777] hover:text-[#a61a1a] disabled:opacity-30"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-[#f0f5f8] border-t-2 border-b-2 border-[#004b6e] font-mono text-xs font-bold">
                    <td colSpan={2} className="py-1.5 px-3 text-right text-[#004b6e] border-r border-[#c2d7e4]">
                      Total
                    </td>
                    <td className="py-1.5 px-2 text-right text-[#004b6e] border-r border-[#c2d7e4]">
                      {formatINR(doubleEntryStats.totalDebit)}
                    </td>
                    <td className="py-1.5 px-2 text-right text-[#a61a1a] border-r border-[#c2d7e4]">
                      {formatINR(doubleEntryStats.totalCredit)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={addLine}
                className="bg-[#edf4f8] border border-[#7ea1b5] hover:bg-[#fed843] hover:text-black px-2.5 py-1 text-xs font-bold text-[#004b6e] flex items-center gap-1 transition"
              >
                <Plus size={12} />
                <span>Add Entry Line</span>
              </button>

              <div className="flex items-center gap-3 font-mono text-xs">
                {doubleEntryStats.difference !== 0 ? (
                  <span className="text-[#a61a1a] font-bold">
                    Diff: {formatINR(doubleEntryStats.difference)}
                  </span>
                ) : (
                  <span className="text-[#059669] font-bold flex items-center gap-1">
                    <Check size={14} /> Dr &amp; Cr Balanced
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* INVENTORY ITEM SECTION (For Sales and Purchase) */}
        {(voucherType === 'Sales' || voucherType === 'Purchase') && !isSingleEntry && (
          <div className="p-2 border-t border-[#8caebd] bg-[#f9fcfe] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Package size={14} className="text-[#004b6e]" />
                <span className="font-bold text-[#004b6e] text-xs uppercase tracking-wide">
                  Item Inventory Allocation
                </span>
              </div>
              <div className="flex items-center gap-2">
                {itemLines.length > 0 && (
                  <button
                    type="button"
                    onClick={syncItemsToAccounts}
                    className="bg-[#004b6e] text-[#fed843] border border-[#003859] px-2 py-0.5 text-[10px] font-bold"
                  >
                    Sync To Ledgers
                  </button>
                )}
                <button
                  type="button"
                  onClick={addItemLine}
                  className="bg-[#edf4f8] border border-[#7ea1b5] hover:bg-[#fed843] hover:text-black px-2 py-0.5 text-xs font-bold text-[#004b6e] flex items-center gap-1 transition"
                >
                  <Plus size={12} />
                  <span>Add Stock Item</span>
                </button>
              </div>
            </div>

            {itemLines.length > 0 && (
              <div className="overflow-x-auto border border-[#8caebd]">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#004b6e] text-white text-[10px] font-bold uppercase">
                      <th className="py-1 px-2 border-r border-[#003859]">Name of Item</th>
                      <th className="py-1 px-2 w-32 border-r border-[#003859]">Godown</th>
                      <th className="py-1 px-2 w-20 text-right border-r border-[#003859]">Qty</th>
                      <th className="py-1 px-2 w-14 border-r border-[#003859]">Unit</th>
                      <th className="py-1 px-2 w-24 text-right border-r border-[#003859]">Rate (₹)</th>
                      <th className="py-1 px-2 w-24 text-right border-r border-[#003859]">Amount</th>
                      <th className="py-1 px-2 w-16 text-right border-r border-[#003859]">GST%</th>
                      <th className="py-1 px-2 w-20 text-right border-r border-[#003859]">Tax</th>
                      <th className="py-1 px-1 w-8 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c2d7e4] font-mono">
                    {itemLines.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-[#fed843]/20">
                        <td className="py-1 px-2 border-r border-[#c2d7e4]">
                          <select
                            value={item.itemId}
                            onChange={(e) => updateItemLine(idx, { itemId: e.target.value })}
                            className="w-full bg-white border border-[#8caebd] px-1 py-0.5 font-sans text-xs font-bold text-[#0d222f] focus:bg-[#fed843] focus:text-black focus:outline-none"
                          >
                            {stockItems.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="py-1 px-2 border-r border-[#c2d7e4]">
                          <select
                            value={item.godownId}
                            onChange={(e) => updateItemLine(idx, { godownId: e.target.value })}
                            className="w-full bg-white border border-[#8caebd] px-1 py-0.5 font-sans text-xs text-[#0d222f] focus:bg-[#fed843] focus:text-black focus:outline-none"
                          >
                            {godowns.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="py-1 px-2 border-r border-[#c2d7e4]">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => updateItemLine(idx, { quantity: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-white border border-[#8caebd] px-1 py-0.5 text-right text-[#0d222f] font-mono focus:bg-[#fed843] focus:text-black focus:outline-none"
                          />
                        </td>

                        <td className="py-1 px-2 text-[#4a6777] border-r border-[#c2d7e4]">{item.unit}</td>

                        <td className="py-1 px-2 border-r border-[#c2d7e4]">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.rate}
                            onChange={(e) => updateItemLine(idx, { rate: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-white border border-[#8caebd] px-1 py-0.5 text-right text-[#0d222f] font-mono focus:bg-[#fed843] focus:text-black focus:outline-none"
                          />
                        </td>

                        <td className="py-1 px-2 text-right font-bold text-[#004b6e] border-r border-[#c2d7e4]">
                          {formatINR(item.amount)}
                        </td>

                        <td className="py-1 px-2 text-right border-r border-[#c2d7e4]">
                          <input
                            type="number"
                            value={item.gstRate}
                            onChange={(e) => updateItemLine(idx, { gstRate: parseFloat(e.target.value) || 0 })}
                            className="w-12 bg-white border border-[#8caebd] px-1 py-0.5 text-right font-mono"
                          />
                        </td>

                        <td className="py-1 px-2 text-right text-[#a61a1a] border-r border-[#c2d7e4]">
                          {formatINR(item.cgst + item.sgst + item.igst)}
                        </td>

                        <td className="py-1 px-1 text-center">
                          <button
                            type="button"
                            onClick={() => removeItemLine(idx)}
                            className="text-[#4a6777] hover:text-[#a61a1a]"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Narration and Accept Box */}
        <div className="p-3 bg-[#f0f5f8] border-t border-[#8caebd] space-y-2">
          <div className="flex items-start gap-2">
            <label className="font-bold text-[#004b6e] text-[11px] pt-1 w-20">
              Narration:
            </label>
            <textarea
              rows={2}
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              placeholder="Being amount paid / received / sold against invoice..."
              className="flex-1 bg-white border border-[#8caebd] px-2 py-1 text-xs text-[#0d222f] focus:bg-[#fed843] focus:text-black focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="bg-[#edf4f8] border border-[#7ea1b5] hover:bg-[#a61a1a] hover:text-white px-3 py-1 text-xs font-bold text-[#004b6e] transition"
            >
              Quit (Esc)
            </button>

            <button
              type="button"
              onClick={() => setShowAcceptPrompt(true)}
              disabled={saving || !doubleEntryStats.isValid}
              className={`px-5 py-1.5 text-xs font-black shadow-xs transition flex items-center gap-1.5 ${
                doubleEntryStats.isValid
                  ? 'bg-[#fed843] hover:bg-[#f5cb28] text-black border border-[#00253d] cursor-pointer'
                  : 'bg-[#cbd5e1] text-[#94a3b8] cursor-not-allowed'
              }`}
            >
              <Check size={14} />
              <span>Accept? (Ctrl+A)</span>
            </button>
          </div>
        </div>
      </div>

      {/* The Legendary Tally "Accept? Yes or No" Dialog Box */}
      {showAcceptPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-64 bg-[#f0f5f8] border-2 border-[#004b6e] shadow-2xl p-3 text-center space-y-3">
            <div className="bg-[#004b6e] text-white py-1 font-bold text-xs uppercase">
              Accept?
            </div>
            <p className="text-sm font-black text-[#00253d]">
              Save Voucher?
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                autoFocus
                onClick={handleSave}
                disabled={saving}
                className="bg-[#fed843] hover:bg-[#f5cb28] text-black border border-[#00253d] px-4 py-1 text-xs font-black"
              >
                <u>Y</u>es (Enter)
              </button>
              <button
                type="button"
                onClick={() => setShowAcceptPrompt(false)}
                className="bg-[#edf4f8] hover:bg-[#a61a1a] hover:text-white text-[#004b6e] border border-[#7ea1b5] px-4 py-1 text-xs font-bold"
              >
                <u>N</u>o (Esc)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
