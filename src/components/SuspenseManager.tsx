import React, { useState, useMemo } from 'react';
import {
  HelpCircle,
  Plus,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { SuspenseEntry, SuspenseClaim, SuspenseStatus, Party } from '@/types/transaction';
import {
  computeSuspenseSummary,
  formatINR,
  formatDate,
  suspenseToCSV,
  suspenseClaimsToCSV,
} from '@/lib/calculations';
import { downloadCSV } from '@/lib/csv';
import { Button, Modal, SuspenseStatusBadge, EmptyState } from './ui';
import { SuspenseEntryModal } from './SuspenseEntryModal';
import { SuspenseClaimModal } from './SuspenseClaimModal';

interface Props {
  entries: SuspenseEntry[];
  claims: SuspenseClaim[];
  parties: Party[];
  onCreateEntry: (data: {
    date: string;
    amount: number;
    narration: string;
    referenceNo?: string;
  }) => Promise<void>;
  onClaimEntry: (data: {
    suspenseEntryId: string;
    partyId: string;
    partyName: string;
    claimDate: string;
    amount: number;
    narration?: string;
    referenceNo?: string;
  }) => Promise<void>;
  onReverseClaim: (claimId: string, reason: string) => Promise<void>;
  onSelectParty?: (partyId: string) => void;
  onOpenNewParty?: () => void;
}

export function SuspenseManager({
  entries,
  claims,
  parties,
  onCreateEntry,
  onClaimEntry,
  onReverseClaim,
  onSelectParty,
  onOpenNewParty,
}: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SuspenseStatus>('all');
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  // Modals state
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [claimTargetEntry, setClaimTargetEntry] = useState<SuspenseEntry | null>(null);
  const [reversalTargetClaim, setReversalTargetClaim] = useState<SuspenseClaim | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversing, setReversing] = useState(false);
  const [reversalError, setReversalError] = useState<string | null>(null);

  const summary = useMemo(() => computeSuspenseSummary(entries), [entries]);

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (statusFilter !== 'all' && entry.status !== statusFilter) return false;
      if (!q) return true;

      const inEntry =
        entry.entryNo.toLowerCase().includes(q) ||
        (entry.referenceNo && entry.referenceNo.toLowerCase().includes(q)) ||
        entry.narration.toLowerCase().includes(q) ||
        entry.amount.toString().includes(q);

      const inClaims = (entry.claims || []).some(
        (c) =>
          c.claimNo.toLowerCase().includes(q) ||
          (c.partyName && c.partyName.toLowerCase().includes(q)) ||
          (c.narration && c.narration.toLowerCase().includes(q))
      );

      return inEntry || inClaims;
    });
  }, [entries, search, statusFilter]);

  async function handleConfirmReversal() {
    if (!reversalTargetClaim) return;
    setReversing(true);
    setReversalError(null);
    try {
      await onReverseClaim(reversalTargetClaim.id, reversalReason.trim() || 'Claim reversed by user');
      setReversalTargetClaim(null);
      setReversalReason('');
    } catch (err) {
      setReversalError(err instanceof Error ? err.message : 'Failed to reverse claim.');
    } finally {
      setReversing(false);
    }
  }

  function handleExportEntries() {
    const csv = suspenseToCSV(entries, claims);
    downloadCSV(`suspense-entries-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  function handleExportClaims() {
    const csv = suspenseClaimsToCSV(claims);
    downloadCSV(`suspense-claims-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200">
              <HelpCircle size={18} />
            </span>
            Suspense Account
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Track unidentified payments, receipts, and claim settlements against identified parties
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant="secondary"
              className="text-xs py-2"
              onClick={handleExportEntries}
              title="Download Suspense Entries CSV"
            >
              <Download size={14} />
              Export Entries CSV
            </Button>
            <Button
              variant="secondary"
              className="text-xs py-2"
              onClick={handleExportClaims}
              title="Download Suspense Claims CSV"
            >
              <Download size={14} />
              Export Claims CSV
            </Button>
          </div>
          <Button
            className="text-xs py-2"
            onClick={() => setEntryModalOpen(true)}
          >
            <Plus size={15} />
            Record Suspense Entry
          </Button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Available Balance"
          value={formatINR(summary.currentBalance)}
          tone="amber"
          hint="Unclaimed funds"
        />
        <StatCard
          label="Total Deposited"
          value={formatINR(summary.totalDeposited)}
          tone="blue"
          hint={`${summary.totalEntriesCount} total entries`}
        />
        <StatCard
          label="Total Claimed"
          value={formatINR(summary.totalClaimed)}
          tone="emerald"
          hint="Settled to parties"
        />
        <StatCard
          label="Unclaimed"
          value={String(summary.unclaimedCount)}
          tone="neutral"
          hint="Zero claims"
        />
        <StatCard
          label="Partially Claimed"
          value={String(summary.partiallyClaimedCount)}
          tone="neutral"
          hint="Balance remaining"
        />
        <StatCard
          label="Fully Claimed"
          value={String(summary.fullyClaimedCount)}
          tone="neutral"
          hint="Completely resolved"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setStatusFilter('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({entries.length})
          </button>
          <button
            onClick={() => setStatusFilter('unclaimed')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === 'unclaimed'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Unclaimed ({summary.unclaimedCount})
          </button>
          <button
            onClick={() => setStatusFilter('partially_claimed')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === 'partially_claimed'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Partially Claimed ({summary.partiallyClaimedCount})
          </button>
          <button
            onClick={() => setStatusFilter('fully_claimed')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === 'fully_claimed'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Fully Claimed ({summary.fullyClaimedCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search entries or claims..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2 text-xs text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Suspense Entries List */}
      <div className="space-y-3">
        {filteredEntries.length === 0 ? (
          <EmptyState
            title="No suspense entries found"
            message={
              search || statusFilter !== 'all'
                ? 'Try adjusting your search terms or status filter.'
                : 'When unidentified payments arrive, click "Record Suspense Entry" to track them.'
            }
          />
        ) : (
          filteredEntries.map((entry) => {
            const isExpanded = expandedEntryId === entry.id;
            const activeClaims = (entry.claims || []).filter((c) => !c.isReversed);
            const canClaim = entry.availableAmount > 0;

            return (
              <div
                key={entry.id}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs transition-shadow hover:shadow-sm"
              >
                {/* Main Entry Row */}
                <div className="p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left details */}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                          {entry.entryNo}
                        </span>
                        <SuspenseStatusBadge status={entry.status} />
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-500">{formatDate(entry.date)}</span>
                        {entry.referenceNo && (
                          <>
                            <span className="text-xs text-gray-400">·</span>
                            <span className="text-xs text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                              Ref: {entry.referenceNo}
                            </span>
                          </>
                        )}
                      </div>

                      <p className="text-sm text-gray-900 font-medium pt-1">
                        {entry.narration || 'Unidentified entry'}
                      </p>
                    </div>

                    {/* Right amounts & actions */}
                    <div className="flex flex-col sm:items-end gap-1.5 pt-2 sm:pt-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs text-gray-500">Available:</span>
                        <span
                          className={`text-base font-bold ${
                            entry.availableAmount > 0 ? 'text-amber-600' : 'text-gray-400'
                          }`}
                        >
                          {formatINR(entry.availableAmount)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Original: {formatINR(entry.amount)}</span>
                        <span>·</span>
                        <span>Claimed: {formatINR(entry.claimedAmount)}</span>
                      </div>

                      <div className="flex items-center gap-2 pt-1.5">
                        {canClaim && (
                          <Button
                            variant="primary"
                            className="text-xs py-1.5 px-3"
                            onClick={() => setClaimTargetEntry(entry)}
                          >
                            <ArrowRight size={13} />
                            Claim Amount
                          </Button>
                        )}

                        {(entry.claims || []).length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedEntryId(isExpanded ? null : entry.id)
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <span>Claims ({activeClaims.length})</span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Claims and Audit History Section */}
                {isExpanded && (entry.claims || []).length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50/70 p-4">
                    <div className="mb-2.5 flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Claim & Settlement Audit History
                      </h4>
                      <span className="text-[11px] text-gray-500">
                        {activeClaims.length} active claims ·{' '}
                        {(entry.claims || []).length - activeClaims.length} reversed
                      </span>
                    </div>

                    <div className="space-y-2">
                      {entry.claims.map((claim) => (
                        <div
                          key={claim.id}
                          className={`rounded-lg border p-3 text-xs ${
                            claim.isReversed
                              ? 'border-red-200 bg-red-50/40 text-gray-500'
                              : 'border-gray-200 bg-white text-gray-800'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-medium text-[11px] text-gray-600">
                                  {claim.claimNo}
                                </span>
                                {claim.isReversed ? (
                                  <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-700">
                                    Reversed
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-700">
                                    Active Claim
                                  </span>
                                )}
                                <span className="text-gray-400">·</span>
                                <span>{formatDate(claim.claimDate)}</span>
                              </div>

                              <p className="font-semibold text-gray-900">
                                Party:{' '}
                                {onSelectParty && claim.partyId ? (
                                  <button
                                    onClick={() => onSelectParty(claim.partyId)}
                                    className="text-blue-600 hover:underline"
                                  >
                                    {claim.partyName || claim.partyId}
                                  </button>
                                ) : (
                                  <span>{claim.partyName || claim.partyId}</span>
                                )}
                              </p>

                              {claim.narration && (
                                <p className="text-gray-600 italic">{claim.narration}</p>
                              )}
                              {claim.referenceNo && (
                                <p className="text-gray-500">Ref: {claim.referenceNo}</p>
                              )}
                              {claim.isReversed && claim.reversalReason && (
                                <p className="text-red-700 font-medium">
                                  Reason for reversal: {claim.reversalReason}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1.5 pt-1 sm:pt-0">
                              <span
                                className={`text-sm font-bold ${
                                  claim.isReversed ? 'text-gray-400 line-through' : 'text-emerald-700'
                                }`}
                              >
                                {formatINR(claim.amount)}
                              </span>

                              {!claim.isReversed && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReversalTargetClaim(claim);
                                    setReversalReason('');
                                    setReversalError(null);
                                  }}
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 hover:text-red-700 hover:underline"
                                >
                                  <RotateCcw size={12} />
                                  Reverse Claim
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Record Suspense Entry Modal */}
      <SuspenseEntryModal
        open={entryModalOpen}
        onClose={() => setEntryModalOpen(false)}
        onSubmit={async (data) => {
          await onCreateEntry(data);
          setEntryModalOpen(false);
        }}
      />

      {/* Claim Suspense Modal */}
      <SuspenseClaimModal
        entry={claimTargetEntry}
        parties={parties}
        open={claimTargetEntry !== null}
        onClose={() => setClaimTargetEntry(null)}
        onSubmit={async (data) => {
          await onClaimEntry(data);
          setClaimTargetEntry(null);
        }}
        onOpenNewParty={onOpenNewParty}
      />

      {/* Reversal Confirmation Modal */}
      <Modal
        open={reversalTargetClaim !== null}
        onClose={() => {
          if (!reversing) setReversalTargetClaim(null);
        }}
        title="Reverse Suspense Claim?"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setReversalTargetClaim(null)}
              disabled={reversing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleConfirmReversal}
              disabled={reversing}
            >
              {reversing ? 'Reversing...' : 'Confirm Reversal'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-start gap-2 text-sm text-gray-700">
            <ShieldAlert size={18} className="mt-0.5 text-red-600 shrink-0" />
            <p>
              Reversing Claim <strong>{reversalTargetClaim?.claimNo}</strong> will restore{' '}
              <strong>{formatINR(reversalTargetClaim?.amount || 0)}</strong> back to the suspense
              entry available balance and remove the associated credit settlement from{' '}
              <strong>{reversalTargetClaim?.partyName}</strong>'s ledger.
            </p>
          </div>

          {reversalError && (
            <div className="rounded-lg bg-red-50 p-2 text-xs text-red-700">
              {reversalError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Reason for reversal *
            </label>
            <input
              type="text"
              placeholder="e.g. Wrong party selected / mistaken claim"
              value={reversalReason}
              onChange={(e) => setReversalReason(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-400"
              autoFocus
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: 'amber' | 'blue' | 'emerald' | 'neutral';
}) {
  const tones = {
    amber: 'border-amber-200 bg-amber-50/30 text-amber-900',
    blue: 'border-blue-200 bg-blue-50/30 text-blue-900',
    emerald: 'border-emerald-200 bg-emerald-50/30 text-emerald-900',
    neutral: 'border-gray-200 bg-white text-gray-900',
  };

  return (
    <div className={`rounded-xl border p-3 sm:p-4 ${tones[tone]}`}>
      <span className="text-xs font-medium text-gray-500 block truncate">{label}</span>
      <p className="mt-1 text-base font-semibold sm:text-lg">{value}</p>
      {hint && <span className="text-[11px] text-gray-400 mt-0.5 block truncate">{hint}</span>}
    </div>
  );
}
