import { useState, useMemo } from 'react';
import { ArrowLeft, Pencil, Trash2, Eye, MapPin, ShieldCheck, Archive } from 'lucide-react';
import { Transaction, TransactionType, Party, PartyCategory } from '@/types/transaction';
import {
  formatINR,
  formatDate,
  formatNumber,
  sortByDateDesc,
  computePartyCurrentLoss,
  computePartyBalance,
  getPartyCategoryMeta,
  normalizeParty,
  resolvePartyCategory,
} from '@/lib/calculations';
import { TypeBadge, Select, EmptyState, Button } from './ui';
import { PartyModal } from './PartyModal';

interface Props {
  partyId: string;
  partyName: string;
  transactions: Transaction[];
  parties?: Party[];
  onBack: () => void;
  onSelectTransaction: (id: string) => void;
  onEditTransaction: (id: string) => void;
  onDeleteTransaction: (id: string) => void;
  onDeleteParty?: (id: string, deleteRelatedTransactions: boolean, partyName?: string) => Promise<void>;
  onSaveParty?: (partyData: {
    id?: string;
    name: string;
    partyType: PartyCategory;
    location: string;
    investment: number;
    initialLoss: number;
    openingBalance?: number;
  }) => Promise<Party>;
}

export function PartyHistory({
  partyId,
  partyName,
  transactions,
  parties = [],
  onBack,
  onSelectTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onDeleteParty,
  onSaveParty,
}: Props) {
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteWithTransactions, setDeleteWithTransactions] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);

  const party = useMemo(() => {
    return (
      parties.find(
        (p) => p.id === partyId || normalizeParty(p.name) === normalizeParty(partyName)
      ) ?? null
    );
  }, [parties, partyId, partyName]);

  const allPartyTxns = useMemo(() => {
    const targetId = party?.id || partyId;
    const targetNormName = normalizeParty(party?.name || partyName);
    return transactions
      .filter((t) => {
        const isCreditor =
          (Boolean(targetId) && t.partyId === targetId) ||
          normalizeParty(t.partyName) === targetNormName;
        const isDebtor =
          (Boolean(targetId) && t.transferPartyId === targetId) ||
          (Boolean(t.transferPartyName) && normalizeParty(t.transferPartyName || '') === targetNormName);
        return isCreditor || isDebtor;
      })
      .sort(sortByDateDesc);
  }, [transactions, party, partyId, partyName]);

  const deletedPartyTxnsCount = useMemo(
    () => allPartyTxns.filter((t) => t.isDeleted).length,
    [allPartyTxns]
  );

  const filtered = useMemo(() => {
    return allPartyTxns.filter((t) => {
      if (!showDeleted && t.isDeleted) return false;
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (fromDate && t.date < fromDate) return false;
      if (toDate && t.date > toDate) return false;
      return true;
    });
  }, [allPartyTxns, typeFilter, fromDate, toDate, showDeleted]);

  const totals = useMemo(() => {
    let sales = 0;
    let purchases = 0;
    for (const t of allPartyTxns) {
      if (t.isDeleted) continue;
      if (t.type === 'Sale') sales += t.totalAmount;
      else if (t.type === 'Purchase') purchases += t.totalAmount;
    }
    return {
      sales: Math.round(sales * 100) / 100,
      purchases: Math.round(purchases * 100) / 100,
      net: Math.round((sales - purchases) * 100) / 100,
      count: filtered.length,
    };
  }, [allPartyTxns, filtered.length]);

  const initialLoss = party?.initialLoss ?? 0;
  const currentLoss = computePartyCurrentLoss(initialLoss, totals.sales, totals.purchases);
  const currentBalance = useMemo(() => {
    return computePartyBalance(party?.openingBalance ?? 0, transactions, partyId, partyName);
  }, [party?.openingBalance, transactions, partyId, partyName]);
  const resolvedCategory = useMemo(() => {
    return resolvePartyCategory(
      party?.partyType,
      allPartyTxns,
      party?.id || partyId,
      party?.name || partyName
    );
  }, [party?.partyType, allPartyTxns, party?.id, partyId, party?.name, partyName]);
  const catMeta = getPartyCategoryMeta(resolvedCategory);

  async function handleConfirmDelete() {
    if (!onDeleteParty) return;
    const targetId = party?.id || partyId || partyName;
    if (!targetId) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDeleteParty(targetId, deleteWithTransactions, party?.name || partyName);
      setShowDeleteModal(false);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete party.');
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="flex items-center gap-2">
          {onDeleteParty && (party || partyId || partyName) && (
            <Button
              variant="danger"
              onClick={() => {
                setDeleteWithTransactions(false);
                setDeleteError(null);
                setShowDeleteModal(true);
              }}
            >
              <Trash2 size={15} />
              Delete Party
            </Button>
          )}

          {onSaveParty && (party || partyName) && (
            <Button variant="secondary" onClick={() => setShowEditModal(true)}>
              <Pencil size={15} />
              Edit Party Details
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{party?.name || partyName}</h1>
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">
                {catMeta.label}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">{catMeta.description}</p>
            {party?.location && (
              <p className="mt-1 flex items-center gap-1 text-xs text-gray-600">
                <MapPin size={13} className="text-gray-400" />
                {party.location}
              </p>
            )}
          </div>
        </div>

        {/* Investment & Dynamic Loss Section */}
        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3.5">
            <p className="text-xs font-medium text-gray-500">Party Investment</p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {formatINR(party?.investment ?? 0)}
            </p>
            <p className="mt-0.5 text-[11px] text-gray-500">
              Total capital/advance allocated with this party
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">Loss Position</p>
              {initialLoss > 0 && currentLoss === 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <ShieldCheck size={13} />
                  Fully Recovered
                </span>
              )}
            </div>
            <p className={`mt-1 text-lg font-bold ${currentLoss > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
              {formatINR(currentLoss)}
            </p>
            <p className="mt-0.5 text-[11px] text-gray-500">
              {initialLoss > 0 ? (
                <>
                  Initial loss: {formatINR(initialLoss)} · Net money made: {formatINR(totals.net)}
                </>
              ) : (
                'No initial loss recorded for this party'
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryCard
          label="Current Balance"
          value={`${formatINR(currentBalance)} ${currentBalance > 0 ? '(Dr)' : currentBalance < 0 ? '(Cr)' : ''}`}
          tone={currentBalance > 0 ? 'blue' : currentBalance < 0 ? 'amber' : 'neutral'}
        />
        <SummaryCard
          label="Opening Balance"
          value={formatINR(party?.openingBalance ?? 0)}
          tone="neutral"
        />
        <SummaryCard label="Transactions" value={String(totals.count)} />
        <SummaryCard label="Total Sales" value={formatINR(totals.sales)} tone="blue" />
        <SummaryCard
          label="Total Purchases"
          value={formatINR(totals.purchases)}
          tone="teal"
        />
        <SummaryCard
          label="Net Difference"
          value={formatINR(totals.net)}
          tone={totals.net >= 0 ? 'dark' : 'amber'}
        />
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-gray-200 bg-white p-3">
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | TransactionType)}
          >
            <option value="all">All Types</option>
            <option value="Sale">Sale</option>
            <option value="Purchase">Purchase</option>
            <option value="Payment">Payment</option>
            <option value="Receipt">Receipt</option>
            <option value="Stock Transfer">Stock Transfer</option>
            <option value="Payment Transfer">Payment Transfer</option>
          </Select>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label="From date"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label="To date"
          />
        </div>

        {deletedPartyTxnsCount > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50/60 px-3 py-2 text-xs">
            <span className="font-medium text-red-900">
              {deletedPartyTxnsCount} transaction{deletedPartyTxnsCount > 1 ? 's' : ''} deleted from this party ledger
            </span>
            <button
              type="button"
              onClick={() => setShowDeleted(!showDeleted)}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
            >
              <Archive size={13} />
              {showDeleted ? 'Hide Deleted' : 'Show Deleted'}
            </button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No transactions found"
          message="Try adjusting the filters."
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((t) => {
            const isTransfer = t.type === 'Payment Transfer';
            const targetId = party?.id || partyId;
            const targetNormName = normalizeParty(party?.name || partyName);
            const isCreditor =
              (Boolean(targetId) && t.partyId === targetId) ||
              normalizeParty(t.partyName) === targetNormName;
            const isDeleted = Boolean(t.isDeleted);

            return (
              <li
                key={t.id}
                className={`rounded-xl border p-3 transition-colors ${
                  isDeleted ? 'border-red-300 bg-red-50/70' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <TypeBadge type={t.type} />
                      {isDeleted && (
                        <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                          Deleted
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {formatDate(t.date)}
                        {isDeleted && t.deletedAt && (
                          <span className="ml-1 text-[10px] text-red-600 font-semibold">
                            (Removed: {formatDate(t.deletedAt.slice(0, 10))})
                          </span>
                        )}
                      </span>
                    </div>
                    {isTransfer ? (
                      <div className="mt-1">
                        <p className={`text-sm font-medium ${isDeleted ? 'text-red-950 line-through' : 'text-gray-900'}`}>
                          {isCreditor
                            ? `Transfer to ${t.transferPartyName || 'Debtor party'} (${t.source || 'Cash'})`
                            : `Transfer from ${t.partyName} (${t.source || 'Cash'})`}
                        </p>
                        <p className={`mt-0.5 text-xs font-semibold ${isCreditor ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {isCreditor ? 'Deducted from balance (-)' : 'Added to balance (+)'}
                        </p>
                      </div>
                    ) : t.type === 'Receipt' ? (
                      <div className="mt-1">
                        <p className={`text-sm font-medium ${isDeleted ? 'text-red-950 line-through' : 'text-gray-900'}`}>
                          {t.itemName || 'Receipt Voucher'}
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-emerald-600">
                          Ledger Credit (Deducted from balance -) · {t.source || 'Cash'}{t.referenceNo ? ` · Ref: ${t.referenceNo}` : ''}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-1">
                        <p className={`text-sm font-medium ${isDeleted ? 'text-red-950 line-through' : 'text-gray-900'}`}>
                          {t.itemName}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {formatNumber(t.quantity)} × {formatINR(t.ratePerUnit)}
                        </p>
                      </div>
                    )}
                    {t.narration && (
                      <p className="mt-1.5 rounded-md bg-gray-50 px-2 py-1.5 text-xs text-gray-600">
                        {t.narration}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 text-sm font-semibold ${
                      isDeleted
                        ? 'text-red-600 line-through'
                        : isTransfer
                        ? isCreditor
                          ? 'text-rose-700'
                          : 'text-emerald-700'
                        : t.type === 'Receipt'
                        ? 'text-emerald-700'
                        : 'text-gray-900'
                    }`}
                  >
                    {isTransfer
                      ? isCreditor
                        ? `-${formatINR(t.totalAmount)}`
                        : `+${formatINR(t.totalAmount)}`
                      : t.type === 'Receipt'
                      ? `-${formatINR(t.totalAmount)}`
                      : formatINR(t.totalAmount)}
                  </span>
                </div>
                <div className="mt-2.5 flex items-center gap-1 border-t border-gray-100 pt-2">
                  <button
                    onClick={() => onSelectTransaction(t.id)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    <Eye size={14} /> View
                  </button>
                  {!isDeleted && (
                    <>
                      <button
                        onClick={() => onEditTransaction(t.id)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      <button
                        onClick={() => onDeleteTransaction(t.id)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Delete Party Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-xs"
            onClick={() => !deleting && setShowDeleteModal(false)}
            aria-hidden
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Delete Party</h3>
                <p className="text-xs text-gray-500">Remove party profile and records</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-sm text-gray-700">
                Are you sure you want to delete <span className="font-semibold text-gray-900">"{party?.name || partyName}"</span>?
              </p>

              {allPartyTxns.length > 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-medium text-amber-800">
                    This party currently has <strong>{allPartyTxns.length}</strong> associated transaction{allPartyTxns.length > 1 ? 's' : ''}.
                  </p>
                  <label className="mt-2.5 flex items-start gap-2 text-xs font-medium text-amber-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deleteWithTransactions}
                      onChange={(e) => setDeleteWithTransactions(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-amber-300 text-red-600 focus:ring-red-500"
                    />
                    <span>Also permanently delete all {allPartyTxns.length} associated transaction(s)</span>
                  </label>
                  {!deleteWithTransactions && (
                    <p className="mt-1.5 text-[11px] text-amber-700">
                      If unchecked, the party will be removed from active lists while keeping historical transaction ledger numbers intact.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  This party has no transactions and will be cleanly removed.
                </p>
              )}

              {deleteError && (
                <p role="alert" className="rounded-lg bg-red-50 p-2 text-xs text-red-700">
                  {deleteError}
                </p>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="secondary"
                disabled={deleting}
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={deleting}
                onClick={handleConfirmDelete}
              >
                {deleting ? 'Deleting…' : 'Delete Party'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {onSaveParty && (party || partyName) && (
        <PartyModal
          open={showEditModal}
          party={
            party
              ? {
                  ...party,
                  partyType: resolvedCategory,
                }
              : {
                  id: partyId && partyId.length === 36 ? partyId : undefined,
                  name: partyName,
                  partyType: resolvedCategory,
                }
          }
          initialName={party?.name || partyName}
          initialCategory={resolvedCategory}
          parties={parties}
          onSave={async (data) => {
            await onSaveParty(data);
            setShowEditModal(false);
          }}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'blue' | 'teal' | 'dark' | 'amber' | 'neutral';
}) {
  const text: Record<string, string> = {
    blue: 'text-blue-600',
    teal: 'text-teal-600',
    dark: 'text-gray-900',
    amber: 'text-amber-600',
    neutral: 'text-gray-900',
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${text[tone]} sm:text-base`}>
        {value}
      </p>
    </div>
  );
}

