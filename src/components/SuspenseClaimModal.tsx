import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Input, Textarea } from './ui';
import { Party, SuspenseEntry } from '@/types/transaction';
import { formatINR, todayISO, getPartyCategoryMeta } from '@/lib/calculations';
import { AlertCircle, Check, Search, Plus } from 'lucide-react';

interface Props {
  entry: SuspenseEntry | null;
  parties: Party[];
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    suspenseEntryId: string;
    partyId: string;
    partyName: string;
    claimDate: string;
    amount: number;
    narration?: string;
    referenceNo?: string;
  }) => Promise<void>;
  onOpenNewParty?: () => void;
}

export function SuspenseClaimModal({
  entry,
  parties,
  open,
  onClose,
  onSubmit,
  onOpenNewParty,
}: Props) {
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [partySearch, setPartySearch] = useState('');
  const [claimAmount, setClaimAmount] = useState('');
  const [claimDate, setClaimDate] = useState(todayISO());
  const [referenceNo, setReferenceNo] = useState('');
  const [narration, setNarration] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (entry && open) {
      setClaimAmount(String(entry.availableAmount));
      setClaimDate(todayISO());
      setReferenceNo(entry.referenceNo || '');
      setNarration(`Settlement for suspense entry ${entry.entryNo}`);
      setError(null);
      setSelectedPartyId('');
      setPartySearch('');
    }
  }, [entry, open]);

  const filteredParties = useMemo(() => {
    const q = partySearch.trim().toLowerCase();
    const activeOnly = parties.filter((p) => p.isActive !== false);
    if (!q) return activeOnly.slice(0, 10);
    return activeOnly
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.location && p.location.toLowerCase().includes(q)) ||
          (p.partyType && p.partyType.toLowerCase().includes(q))
      )
      .slice(0, 15);
  }, [parties, partySearch]);

  const selectedParty = parties.find((p) => p.id === selectedPartyId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!entry) return;

    if (!selectedPartyId && !selectedParty) {
      setError('Please select the party claiming this suspense payment.');
      return;
    }

    const numAmount = parseFloat(claimAmount);
    if (!claimAmount || isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid claim amount greater than 0.');
      return;
    }

    if (numAmount > entry.availableAmount + 0.001) {
      setError(
        `Claim amount (${formatINR(numAmount)}) cannot exceed available balance (${formatINR(
          entry.availableAmount
        )}).`
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        suspenseEntryId: entry.id,
        partyId: selectedParty?.id || selectedPartyId,
        partyName: selectedParty?.name || partySearch,
        claimDate,
        amount: numAmount,
        narration: narration.trim(),
        referenceNo: referenceNo.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim suspense entry.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!entry) return null;

  const isFullClaim =
    parseFloat(claimAmount) >= entry.availableAmount - 0.001 &&
    parseFloat(claimAmount) <= entry.availableAmount + 0.001;

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title={`Claim Suspense Payment · ${entry.entryNo}`}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !selectedPartyId}
          >
            {submitting ? 'Recording Claim...' : 'Confirm Claim'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Entry Summary Card */}
        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 text-xs text-gray-600 space-y-1.5">
          <div className="flex justify-between items-center text-sm font-semibold text-gray-900">
            <span>Suspense Entry: {entry.entryNo}</span>
            <span className="text-blue-700">{formatINR(entry.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Entry Date: {entry.date}</span>
            <span>
              Available: <strong className="text-emerald-700 font-semibold">{formatINR(entry.availableAmount)}</strong>
            </span>
          </div>
          {entry.narration && (
            <p className="text-gray-500 italic truncate">Note: {entry.narration}</p>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Party Selector */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Select Identified Party *
            </label>
            {onOpenNewParty && (
              <button
                type="button"
                onClick={onOpenNewParty}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <Plus size={13} />
                New Party
              </button>
            )}
          </div>

          <div className="relative">
            <div className="relative">
              <input
                type="text"
                placeholder="Search party by name or location..."
                value={selectedParty ? selectedParty.name : partySearch}
                onChange={(e) => {
                  setPartySearch(e.target.value);
                  setSelectedPartyId('');
                  setDropdownOpen(true);
                }}
                onFocus={() => setDropdownOpen(true)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 pl-9 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <Search size={16} className="absolute left-3 top-3 text-gray-400" />
              {selectedParty && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPartyId('');
                    setPartySearch('');
                    setDropdownOpen(true);
                  }}
                  className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-600"
                >
                  Change
                </button>
              )}
            </div>

            {dropdownOpen && !selectedParty && (
              <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {filteredParties.length === 0 ? (
                  <div className="p-3 text-center text-xs text-gray-500">
                    No matching party found.{' '}
                    {onOpenNewParty && (
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenNewParty();
                        }}
                        className="text-blue-600 underline font-medium"
                      >
                        Add party "{partySearch}"
                      </button>
                    )}
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100 text-sm">
                    {filteredParties.map((p) => {
                      const meta = getPartyCategoryMeta(p.partyType);
                      return (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPartyId(p.id);
                              setPartySearch(p.name);
                              setDropdownOpen(false);
                              setError(null);
                            }}
                            className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-blue-50"
                          >
                            <div>
                              <p className="font-medium text-gray-900">{p.name}</p>
                              {p.location && (
                                <p className="text-xs text-gray-500">{p.location}</p>
                              )}
                            </div>
                            <span
                              className="rounded px-1.5 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200"
                            >
                              {meta.label}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Claim Amount & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Claim Amount (₹) *</span>
              {!isFullClaim && (
                <button
                  type="button"
                  onClick={() => setClaimAmount(String(entry.availableAmount))}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Full balance
                </button>
              )}
            </div>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={entry.availableAmount}
              placeholder="0.00"
              value={claimAmount}
              onChange={(e) => setClaimAmount(e.target.value)}
              required
            />
            <p className="mt-1 text-[11px] text-gray-500">
              Max available: {formatINR(entry.availableAmount)}
            </p>
          </div>

          <Input
            label="Claim Date *"
            type="date"
            value={claimDate}
            onChange={(e) => setClaimDate(e.target.value)}
            required
          />
        </div>

        <Input
          label="Reference No. (Optional)"
          type="text"
          placeholder="e.g. UTR / Receipt Ref / Invoice No"
          value={referenceNo}
          onChange={(e) => setReferenceNo(e.target.value)}
        />

        <Textarea
          label="Settlement Narration / Notes"
          placeholder="e.g. Party Sauvik Trader claimed this deposit against Pending Invoice #102"
          rows={2}
          value={narration}
          onChange={(e) => setNarration(e.target.value)}
        />

        {selectedParty && (
          <div className="rounded-lg bg-blue-50/70 p-3 text-xs text-blue-800 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <Check size={14} className="text-blue-600" />
              Automated Ledger Update
            </p>
            <p>
              Submitting will credit <strong>{formatINR(parseFloat(claimAmount) || 0)}</strong> to{' '}
              <strong>{selectedParty.name}</strong>'s ledger as a settled receipt transaction.
            </p>
          </div>
        )}
      </form>
    </Modal>
  );
}
