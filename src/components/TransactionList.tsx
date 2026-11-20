import { useState, useMemo } from 'react';
import {
  Search,
  Download,
  Pencil,
  Trash2,
  ArrowUpDown,
  Eye,
  RotateCcw,
  Archive,
} from 'lucide-react';
import { Transaction, TransactionType, Party, PartyCategory } from '@/types/transaction';
import {
  formatINR,
  formatDate,
  formatNumber,
  sortByDateDesc,
  PARTY_CATEGORIES,
  normalizeParty,
  getPartyCategoryMeta,
  resolvePartyCategory,
} from '@/lib/calculations';
import { TypeBadge, Button, Select, EmptyState } from './ui';
import { transactionsToCSV, downloadCSV } from '@/lib/csv';

interface Props {
  transactions: Transaction[];
  parties?: Party[];
  onSelectTransaction: (id: string) => void;
  onEditTransaction: (id: string) => void;
  onDeleteTransaction: (id: string) => void;
  onRestoreTransaction?: (id: string) => void;
}

type SortKey = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

export function TransactionList({
  transactions,
  parties = [],
  onSelectTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onRestoreTransaction,
}: Props) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [partyCategoryFilter, setPartyCategoryFilter] = useState<'all' | PartyCategory>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sort, setSort] = useState<SortKey>('date-desc');
  const [showDeleted, setShowDeleted] = useState(false);

  const deletedCount = useMemo(
    () => transactions.filter((t) => t.isDeleted).length,
    [transactions]
  );

  const partyLookup = useMemo(() => {
    const map = new Map<string, Party>();
    for (const p of parties) {
      map.set(p.id, p);
      map.set(normalizeParty(p.name), p);
    }
    return map;
  }, [parties]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = transactions.filter((t) => {
      // By default hide deleted unless showDeleted is toggled on
      if (!showDeleted && t.isDeleted) return false;

      if (q) {
        const hay = `${t.partyName} ${t.transferPartyName ?? ''} ${t.itemName} ${t.narration} ${t.transactionNo ?? ''} ${t.source ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (typeFilter === 'Sale' && partyCategoryFilter !== 'all') {
        const party = partyLookup.get(t.partyId) || partyLookup.get(normalizeParty(t.partyName));
        const cat = resolvePartyCategory(
          t.partyType || party?.partyType,
          transactions,
          t.partyId,
          t.partyName
        );
        if (cat !== partyCategoryFilter) return false;
      }
      if (fromDate && t.date < fromDate) return false;
      if (toDate && t.date > toDate) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'date-asc':
          return -sortByDateDesc(a, b);
        case 'amount-desc':
          return b.totalAmount - a.totalAmount;
        case 'amount-asc':
          return a.totalAmount - b.totalAmount;
        default:
          return sortByDateDesc(a, b);
      }
    });
    return list;
  }, [transactions, search, typeFilter, partyCategoryFilter, partyLookup, fromDate, toDate, sort, showDeleted]);

  function handleExport() {
    const csv = transactionsToCSV(filtered);
    downloadCSV(`rg-plastics-transactions-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500">
            {filtered.length} of {transactions.length} transactions
            {deletedCount > 0 && !showDeleted && (
              <span className="ml-1 text-xs text-red-500">({deletedCount} hidden deleted)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {deletedCount > 0 && (
            <button
              type="button"
              onClick={() => setShowDeleted(!showDeleted)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                showDeleted
                  ? 'border-red-400 bg-red-50 text-red-700 hover:bg-red-100'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
              title={showDeleted ? 'Hide deleted transactions' : 'Show deleted transactions marked in red'}
            >
              <Archive size={14} className={showDeleted ? 'text-red-600' : 'text-gray-500'} />
              <span>{showDeleted ? 'Hide Deleted' : 'Show Deleted'}</span>
              <span
                className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  showDeleted ? 'bg-red-200 text-red-900' : 'bg-red-100 text-red-700'
                }`}
              >
                {deletedCount}
              </span>
            </button>
          )}
          <Button variant="secondary" onClick={handleExport}>
            <Download size={16} />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search party or item..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="amount-desc">Amount: High to Low</option>
            <option value="amount-asc">Amount: Low to High</option>
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

        {/* Sale Party Type Sub-Filter */}
        {typeFilter === 'Sale' && (
          <div className="flex flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50/70 p-2.5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs font-semibold text-blue-900">
              Filter Sale by Party Type:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPartyCategoryFilter('all')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  partyCategoryFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-blue-100/60'
                }`}
              >
                All Party Types
              </button>
              {PARTY_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setPartyCategoryFilter(cat.key)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    partyCategoryFilter === cat.key
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-blue-100/60'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No transactions found"
          message="Try adjusting your search or filters."
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 sm:hidden">
            {filtered.map((t) => {
              const party = partyLookup.get(t.partyId) || partyLookup.get(normalizeParty(t.partyName));
              const cat = t.partyType || party?.partyType;
              const isDeleted = Boolean(t.isDeleted);
              return (
                <div
                  key={t.id}
                  className={`rounded-xl border p-3 transition-colors ${
                    isDeleted
                      ? 'border-red-300 bg-red-50/70'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <TypeBadge type={t.type} />
                        {isDeleted && (
                          <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                            Deleted
                          </span>
                        )}
                        <span className={`truncate text-sm font-semibold ${isDeleted ? 'text-red-950 line-through' : 'text-gray-900'}`}>
                          {t.type === 'Payment Transfer' && t.transferPartyName
                            ? `${t.partyName} → ${t.transferPartyName}`
                            : t.partyName}
                        </span>
                        {cat && t.type !== 'Payment Transfer' && (
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                            {getPartyCategoryMeta(cat).label}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {t.type === 'Payment Transfer'
                          ? `Payment Transfer (${t.source || 'Cash'})`
                          : t.type === 'Receipt'
                          ? (t.itemName || 'Receipt Voucher')
                          : t.itemName}{' '}
                        · {formatDate(t.date)}
                        {isDeleted && t.deletedAt && (
                          <span className="ml-1 text-[10px] text-red-600 font-semibold">
                            (Removed: {formatDate(t.deletedAt.slice(0, 10))})
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {t.type === 'Payment Transfer'
                          ? `Source: ${t.source || 'Cash'} · Account Transfer`
                          : t.type === 'Receipt'
                          ? `Source: ${t.source || 'Cash'}${t.referenceNo ? ` · Ref: ${t.referenceNo}` : ''}`
                          : `${formatNumber(t.quantity)} × ${formatINR(t.ratePerUnit)}`}
                      </p>
                    </div>
                    <span className={`shrink-0 text-sm font-semibold ${isDeleted ? 'text-red-600 line-through' : 'text-gray-900'}`}>
                      {formatINR(t.totalAmount)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-1 border-t border-gray-100 pt-2">
                    <button
                      onClick={() => onSelectTransaction(t.id)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      <Eye size={14} /> View
                    </button>
                    {isDeleted ? (
                      onRestoreTransaction && (
                        <button
                          onClick={() => onRestoreTransaction(t.id)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                        >
                          <RotateCcw size={14} /> Restore
                        </button>
                      )
                    ) : (
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
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white sm:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Party</th>
                  <th className="px-4 py-3">Item / Description</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">
                    <ArrowUpDown size={14} className="inline" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((t) => {
                  const party = partyLookup.get(t.partyId) || partyLookup.get(normalizeParty(t.partyName));
                  const cat = t.partyType || party?.partyType;
                  const isTransfer = t.type === 'Payment Transfer';
                  const isDeleted = Boolean(t.isDeleted);
                  return (
                    <tr
                      key={t.id}
                      className={`transition-colors ${
                        isDeleted ? 'bg-red-50/70 hover:bg-red-100/60' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        <div>{formatDate(t.date)}</div>
                        {isDeleted && (
                          <span className="inline-block rounded bg-red-600 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-white">
                            Deleted
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <TypeBadge type={t.type} />
                      </td>
                      <td className={`px-4 py-3 font-medium ${isDeleted ? 'text-red-950 line-through' : 'text-gray-900'}`}>
                        {isTransfer && t.transferPartyName ? (
                          <div className="flex flex-col">
                            <span className="text-rose-700">From (Cr): {t.partyName}</span>
                            <span className="text-emerald-700 text-xs">To (Dr): {t.transferPartyName}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>{t.partyName}</span>
                            {cat && (
                              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-normal text-gray-600">
                                {getPartyCategoryMeta(cat).label}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className={`px-4 py-3 ${isDeleted ? 'text-red-900/70 line-through' : 'text-gray-600'}`}>
                        {isTransfer
                          ? `Payment Transfer (${t.source || 'Cash'})`
                          : t.type === 'Receipt'
                          ? (t.itemName || 'Receipt Voucher')
                          : t.itemName}
                      </td>
                      <td className={`px-4 py-3 text-right ${isDeleted ? 'text-red-900/70 line-through' : 'text-gray-600'}`}>
                        {isTransfer || t.type === 'Receipt' ? '—' : formatNumber(t.quantity)}
                      </td>
                      <td className={`px-4 py-3 text-right ${isDeleted ? 'text-red-900/70 line-through' : 'text-gray-600'}`}>
                        {isTransfer || t.type === 'Receipt' ? '—' : formatINR(t.ratePerUnit)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        <span className={isDeleted ? 'text-red-600 line-through' : 'text-gray-900'}>
                          {formatINR(t.totalAmount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onSelectTransaction(t.id)}
                            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
                            aria-label="View"
                            title="View details"
                          >
                            <Eye size={15} />
                          </button>
                          {isDeleted ? (
                            onRestoreTransaction && (
                              <button
                                onClick={() => onRestoreTransaction(t.id)}
                                className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50"
                                aria-label="Restore"
                                title="Restore this deleted transaction"
                              >
                                <RotateCcw size={15} />
                              </button>
                            )
                          ) : (
                            <>
                              <button
                                onClick={() => onEditTransaction(t.id)}
                                className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
                                aria-label="Edit"
                                title="Edit"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => onDeleteTransaction(t.id)}
                                className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                                aria-label="Delete"
                                title="Delete"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
