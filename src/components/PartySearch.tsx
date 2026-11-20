import { useState, useMemo } from 'react';
import { Search, ChevronRight, Plus, MapPin } from 'lucide-react';
import { Party, PartyCategory, Transaction } from '@/types/transaction';
import {
  computePartySummaries,
  formatINR,
  formatDate,
  PARTY_CATEGORIES,
  getPartyCategoryMeta,
  normalizeCategory,
} from '@/lib/calculations';
import { EmptyState, Button } from './ui';
import { PartyModal } from './PartyModal';

interface Props {
  transactions: Transaction[];
  parties: Party[];
  onSelectParty: (partyKey: string) => void;
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

export function PartySearch({ transactions, parties, onSelectParty, onSaveParty }: Props) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | PartyCategory>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const summaries = useMemo(() => {
    return computePartySummaries(transactions, parties);
  }, [transactions, parties]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return summaries.filter((p) => {
      if (q && !p.displayName.toLowerCase().includes(q)) return false;
      if (categoryFilter !== 'all') {
        const cat = normalizeCategory(p.partyType);
        if (cat !== categoryFilter) return false;
      }
      return true;
    });
  }, [summaries, search, categoryFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Parties</h1>
          <p className="text-sm text-gray-500">
            {filtered.length} of {summaries.length} parties · Search or view full history
          </p>
        </div>
        {onSaveParty && (
          <Button onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            Add New Party
          </Button>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search party by name..."
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Category filter tabs */}
        <div className="flex flex-wrap gap-1.5 border-t border-gray-100 pt-2.5">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              categoryFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Categories
          </button>
          {PARTY_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setCategoryFilter(cat.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                categoryFilter === cat.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No parties found"
          message={search || categoryFilter !== 'all' ? 'Try adjusting your search or category filter.' : 'No active parties are available.'}
        />
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((p) => {
            const catMeta = getPartyCategoryMeta(p.partyType);
            const currentLoss = p.currentLoss ?? 0;
            const initialLoss = p.initialLoss ?? 0;
            return (
              <li key={p.key}>
                <button
                  onClick={() => onSelectParty(p.key)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-semibold text-gray-900">
                        {p.displayName}
                      </p>
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
                        {catMeta.label}
                      </span>
                      {p.location && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin size={12} className="text-gray-400" />
                          {p.location}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <span className="text-gray-500">
                        {p.transactionCount} txn{p.transactionCount !== 1 ? 's' : ''}
                        {p.lastTransactionDate ? ` · Last ${formatDate(p.lastTransactionDate)}` : ' · No entries yet'}
                      </span>
                      <span className="text-blue-600">
                        Sales: {formatINR(p.totalSales)}
                      </span>
                      <span className="text-teal-600">
                        Purchases: {formatINR(p.totalPurchases)}
                      </span>
                      <span
                        className={`font-semibold ${
                          (p.currentBalance ?? 0) > 0
                            ? 'text-blue-700'
                            : (p.currentBalance ?? 0) < 0
                            ? 'text-amber-700'
                            : 'text-gray-700'
                        }`}
                      >
                        Balance: {formatINR(p.currentBalance ?? 0)}{' '}
                        {(p.currentBalance ?? 0) > 0 ? '(Dr)' : (p.currentBalance ?? 0) < 0 ? '(Cr)' : ''}
                      </span>
                    </div>

                    {/* Opening Balance, Investment & Loss badges */}
                    {((p.openingBalance ?? 0) !== 0 || (p.investment ?? 0) > 0 || initialLoss > 0) && (
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-gray-100 pt-2 text-xs">
                        {(p.openingBalance ?? 0) !== 0 && (
                          <span className="flex items-center gap-1 text-gray-600">
                            <span className="font-medium text-gray-500">Opening Bal:</span>
                            {formatINR(p.openingBalance!)}
                          </span>
                        )}
                        {(p.investment ?? 0) > 0 && (
                          <span className="flex items-center gap-1 text-gray-600">
                            <span className="font-medium text-gray-500">Investment:</span>
                            {formatINR(p.investment!)}
                          </span>
                        )}
                        {initialLoss > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="font-medium text-gray-500">Loss:</span>
                            {currentLoss > 0 ? (
                              <span className="font-semibold text-red-600">
                                {formatINR(currentLoss)} (Init: {formatINR(initialLoss)})
                              </span>
                            ) : (
                              <span className="font-semibold text-emerald-600">
                                ₹0 (Recovered)
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-gray-400" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {onSaveParty && (
        <PartyModal
          open={showAddModal}
          parties={parties}
          onSave={async (data) => {
            await onSaveParty(data);
            setShowAddModal(false);
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
