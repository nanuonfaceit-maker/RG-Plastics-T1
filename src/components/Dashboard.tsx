import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Receipt,
  Users,
  HelpCircle,
  ArrowRight,
  Wallet,
  Coins,
  Pencil,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Transaction, DashboardStats, SuspenseSummary, HandCashBreakdown } from '@/types/transaction';
import { formatINR, formatDate, sortByDateDesc, computeHandCashSummary } from '@/lib/calculations';
import { TypeBadge, Modal, Button, Input, Textarea } from './ui';

interface Props {
  stats: DashboardStats;
  transactions: Transaction[];
  onSelectTransaction: (id: string) => void;
  suspenseSummary?: SuspenseSummary;
  onNavigateSuspense?: () => void;
  handCashSummary?: HandCashBreakdown;
  isAdmin?: boolean;
  onSaveOpeningCash?: (amount: number, notes?: string) => Promise<void>;
}

export function Dashboard({
  stats,
  transactions,
  onSelectTransaction,
  suspenseSummary,
  onNavigateSuspense,
  handCashSummary,
  isAdmin = false,
  onSaveOpeningCash,
}: Props) {
  const [openingCashModalOpen, setOpeningCashModalOpen] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const handCash = handCashSummary ?? computeHandCashSummary(0, transactions, []);
  const recent = [...transactions].sort(sortByDateDesc).slice(0, 6);
  const netPositive = stats.netDifference >= 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Business summary and live cash reconciliation</p>
      </div>

      {/* 3 Prominent Top Cards: Opening Hand Cash, Current Hand Cash, Suspense Amount */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {/* Card 1: Opening Hand Cash */}
        <div className="rounded-xl border border-blue-200 bg-white p-4 shadow-xs transition hover:border-blue-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Coins size={16} />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Opening Hand Cash
              </span>
            </div>
            {isAdmin && onSaveOpeningCash && (
              <button
                type="button"
                onClick={() => setOpeningCashModalOpen(true)}
                className="inline-flex items-center gap-1 rounded bg-blue-50 hover:bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 transition"
                title="Admin: Edit Opening Hand Cash"
              >
                <Pencil size={11} />
                <span>Edit</span>
              </button>
            )}
          </div>
          <p className="mt-3 text-2xl font-bold text-gray-900">
            {formatINR(handCash.openingHandCash)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Configured baseline cash in drawer
          </p>
        </div>

        {/* Card 2: Current Hand Cash */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/20 p-4 shadow-xs transition hover:border-emerald-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Wallet size={16} />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                Current Hand Cash
              </span>
            </div>
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
              In Drawer
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-emerald-950">
            {formatINR(handCash.currentHandCash)}
          </p>
          <p className="mt-1 text-xs text-emerald-700">
            Live reconciled drawer balance
          </p>
        </div>

        {/* Card 3: Suspense Amount */}
        <div
          onClick={onNavigateSuspense}
          className={`rounded-xl border border-amber-200 bg-white p-4 shadow-xs transition hover:border-amber-300 ${
            onNavigateSuspense ? 'cursor-pointer hover:bg-amber-50/30' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <HelpCircle size={16} />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Suspense Amount
              </span>
            </div>
            {onNavigateSuspense && (
              <span className="flex items-center gap-0.5 text-xs font-medium text-amber-700">
                <span>View</span>
                <ArrowRight size={12} />
              </span>
            )}
          </div>
          <p className="mt-3 text-2xl font-bold text-gray-900">
            {formatINR(handCash.unclaimedSuspense)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Unclaimed deposits in cash drawer
          </p>
        </div>
      </div>

      {/* Expandable Reconciliation Breakdown & Log */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
        <button
          type="button"
          onClick={() => setShowBreakdown((prev) => !prev)}
          className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-gray-50/80 transition"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
              <Scale size={16} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  Cash Reconciliation & Audit Breakdown
                </h3>
                <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  Reconciled
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">
                Inflows (+{formatINR(handCash.totalCashInflows)}) · Outflows (-{formatINR(handCash.totalCashOutflows)}) · Unclaimed Suspense ({formatINR(handCash.unclaimedSuspense)})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
            <span>{showBreakdown ? 'Hide Breakdown' : 'View Breakdown'}</span>
            {showBreakdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {showBreakdown && (
          <div className="space-y-4 border-t border-gray-100 bg-gray-50/40 p-4 sm:p-5">
            {/* Live Calculation Check */}
            <div className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4 text-xs sm:text-sm">
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Authoritative Formula Check
              </div>
              <div className="flex flex-wrap items-center gap-2 font-mono text-gray-800">
                <span className="font-semibold text-gray-900">
                  Current Hand Cash ({formatINR(handCash.currentHandCash)})
                </span>
                <span>=</span>
                <span className="text-blue-700">
                  Opening ({formatINR(handCash.openingHandCash)})
                </span>
                <span>+</span>
                <span className="text-emerald-700">
                  Inflows ({formatINR(handCash.totalCashInflows)})
                </span>
                <span>-</span>
                <span className="text-rose-700">
                  Outflows ({formatINR(handCash.totalCashOutflows)})
                </span>
              </div>
            </div>

            {/* 3 Columns: Inflows, Outflows, Suspense Reconciliation */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Inflows */}
              <div className="space-y-3 rounded-lg border border-emerald-200 bg-white p-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    Cash Inflows
                  </span>
                  <span className="text-sm font-bold text-emerald-700">
                    +{formatINR(handCash.totalCashInflows)}
                  </span>
                </div>
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Cash Receipts</dt>
                    <dd className="font-semibold text-gray-900">{formatINR(handCash.inflows.receipts)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Cash Sales</dt>
                    <dd className="font-semibold text-gray-900">{formatINR(handCash.inflows.sales)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Suspense Deposits</dt>
                    <dd className="font-semibold text-gray-900">{formatINR(handCash.inflows.suspenseDeposits)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Transfers In (Debitor)</dt>
                    <dd className="font-semibold text-gray-900">{formatINR(handCash.inflows.transfersIn)}</dd>
                  </div>
                </dl>
              </div>

              {/* Outflows */}
              <div className="space-y-3 rounded-lg border border-rose-200 bg-white p-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
                    Cash Outflows
                  </span>
                  <span className="text-sm font-bold text-rose-700">
                    -{formatINR(handCash.totalCashOutflows)}
                  </span>
                </div>
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Cash Payments</dt>
                    <dd className="font-semibold text-gray-900">{formatINR(handCash.outflows.payments)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Cash Purchases</dt>
                    <dd className="font-semibold text-gray-900">{formatINR(handCash.outflows.purchases)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Transfers Out (Creditor)</dt>
                    <dd className="font-semibold text-gray-900">{formatINR(handCash.outflows.transfersOut)}</dd>
                  </div>
                </dl>
              </div>

              {/* Suspense Reconciliation Side-by-Side */}
              <div className="space-y-3 rounded-lg border border-amber-200 bg-white p-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                    Suspense Invariant
                  </span>
                  <span className="text-sm font-bold text-amber-800">
                    {formatINR(handCash.unclaimedSuspense)}
                  </span>
                </div>
                <div className="space-y-2 text-xs text-gray-600">
                  <p>
                    <strong className="text-gray-900">Physical Cash Invariant:</strong> Cash entered the drawer upon deposit into Suspense.
                  </p>
                  <p>
                    <strong className="text-gray-900">Anti-Double-Counting:</strong> Claim settlements credit customer ledgers without adding phantom cash to the drawer.
                  </p>
                  <div className="rounded bg-amber-50 p-2 text-[11px] text-amber-900">
                    {handCash.unclaimedSuspense > 0
                      ? `₹${handCash.unclaimedSuspense.toLocaleString('en-IN')} active unclaimed funds in drawer.`
                      : 'All suspense funds have been fully claimed and reconciled.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {suspenseSummary && (
        <div
          onClick={onNavigateSuspense}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 transition hover:bg-amber-50 cursor-pointer shadow-xs"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <HelpCircle size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900">Suspense Account</h3>
                <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  {suspenseSummary.unclaimedCount + suspenseSummary.partiallyClaimedCount} Pending
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-600">
                Available Unclaimed Balance: <strong className="text-amber-800">{formatINR(suspenseSummary.currentBalance)}</strong> · Deposited: {formatINR(suspenseSummary.totalDeposited)} · Claimed: {formatINR(suspenseSummary.totalClaimed)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-amber-800">
            <span>Manage Suspense</span>
            <ArrowRight size={14} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Total Sales"
          value={formatINR(stats.totalSales)}
          icon={<TrendingUp size={16} />}
          tone="blue"
        />
        <StatCard
          label="Total Purchases"
          value={formatINR(stats.totalPurchases)}
          icon={<TrendingDown size={16} />}
          tone="teal"
        />
        <StatCard
          label="Net Difference"
          value={formatINR(stats.netDifference)}
          icon={<Scale size={16} />}
          tone={netPositive ? 'dark' : 'amber'}
        />
        <StatCard
          label="Transactions"
          value={String(stats.transactionCount)}
          icon={<Receipt size={16} />}
          tone="neutral"
        />
        <StatCard
          label="Unique Parties"
          value={String(stats.uniqueParties)}
          icon={<Users size={16} />}
          tone="neutral"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            Recent Transactions
          </h2>
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {recent.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">
              No transactions yet.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recent.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => onSelectTransaction(t.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <TypeBadge type={t.type} />
                        <span className="truncate text-sm font-medium text-gray-900">
                          {t.partyName}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {t.itemName} · {formatDate(t.date)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-gray-900">
                      {formatINR(t.totalAmount)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Admin Opening Cash Modal */}
      {isAdmin && onSaveOpeningCash && (
        <OpeningCashModal
          open={openingCashModalOpen}
          onClose={() => setOpeningCashModalOpen(false)}
          initialAmount={handCash.openingHandCash}
          onSave={onSaveOpeningCash}
        />
      )}
    </div>
  );
}

function OpeningCashModal({
  open,
  onClose,
  initialAmount,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initialAmount: number;
  onSave: (amount: number, notes?: string) => Promise<void>;
}) {
  const [amount, setAmount] = useState(String(initialAmount || 0));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAmount(String(initialAmount || 0));
      setNotes('');
      setError(null);
      setSaving(false);
    }
  }, [open, initialAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (isNaN(num)) {
      setError('Please enter a valid numeric amount');
      return;
    }
    if (num < 0) {
      setError('Opening hand cash amount cannot be negative');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(num, notes.trim() || undefined);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save opening hand cash');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Configure Opening Hand Cash"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : 'Save Balance'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg bg-blue-50/60 p-3 text-xs text-blue-700">
          This balance is stored securely in Supabase and serves as the baseline for the live Hand Cash reconciliation formula.
        </div>
        <Input
          label="Opening Hand Cash (₹)"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          error={error || undefined}
          autoFocus
          required
        />
        <Textarea
          label="Notes (Optional)"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Reason for adjustment, audit details, or date reference..."
        />
      </form>
    </Modal>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: 'blue' | 'teal' | 'dark' | 'amber' | 'neutral' | 'emerald';
}) {
  const tones: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    teal: 'bg-teal-50 text-teal-600',
    dark: 'bg-gray-100 text-gray-700',
    amber: 'bg-amber-50 text-amber-600',
    neutral: 'bg-gray-100 text-gray-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
      <div className="flex items-center gap-1.5">
        <span className={`flex h-6 w-6 items-center justify-center rounded-md ${tones[tone]}`}>
          {icon}
        </span>
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <p className="mt-2 text-base font-semibold text-gray-900 sm:text-lg">
        {value}
      </p>
    </div>
  );
}
