import { useState, useEffect } from 'react';
import { UserPlus, AlertCircle } from 'lucide-react';
import { Party, PartyCategory } from '@/types/transaction';
import { PARTY_CATEGORIES, normalizeCategory, normalizeParty } from '@/lib/calculations';
import { Button, Input, Select } from './ui';

interface Props {
  open: boolean;
  party?: Partial<Party> | null;
  initialName?: string;
  initialCategory?: PartyCategory;
  parties: Party[];
  onSave: (partyData: {
    id?: string;
    name: string;
    partyType: PartyCategory;
    location: string;
    investment: number;
    initialLoss: number;
    openingBalance?: number;
  }) => Promise<void>;
  onClose: () => void;
}

export function PartyModal({
  open,
  party,
  initialName = '',
  initialCategory,
  parties,
  onSave,
  onClose,
}: Props) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<PartyCategory>('debtor');
  const [location, setLocation] = useState('');
  const [investment, setInvestment] = useState('0');
  const [initialLoss, setInitialLoss] = useState('0');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(party?.name ?? initialName ?? '');
      const assigned = (normalizeCategory(party?.partyType) as PartyCategory) || initialCategory || 'debtor';
      setCategory(assigned);
      setLocation(party?.location ?? '');
      setInvestment(String(party?.investment ?? 0));
      setInitialLoss(String(party?.initialLoss ?? 0));
      setOpeningBalance(String(party?.openingBalance ?? 0));
      setError(null);
      setSaving(false);
    }
  }, [open, party, initialName, initialCategory]);

  if (!open) return null;

  const currentCategoryMeta = PARTY_CATEGORIES.find((c) => c.key === category);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Party name is required.');
      return;
    }

    // Case-insensitive duplicate check for a new party (active parties only)
    const normalized = normalizeParty(trimmedName);
    const existingConflict = parties.find(
      (p) => p.isActive !== false && normalizeParty(p.name) === normalized && p.id !== party?.id
    );
    if (existingConflict) {
      setError(`A party named "${existingConflict.name}" already exists.`);
      return;
    }

    const parsedInvestment = Math.max(0, Number(investment) || 0);
    const parsedLoss = Math.max(0, Number(initialLoss) || 0);
    const parsedOpeningBalance = Number(openingBalance) || 0;

    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: party?.id,
        name: trimmedName,
        partyType: category,
        location: location.trim(),
        investment: parsedInvestment,
        initialLoss: parsedLoss,
        openingBalance: parsedOpeningBalance,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save party.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <UserPlus size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {party?.id ? 'Edit Party Details' : 'New Party Details'}
              </h2>
              <p className="text-xs text-gray-500">
                {party?.id
                  ? 'Update category, location, investment, or loss'
                  : 'Configure profile for newly detected party'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="space-y-4 p-5">
            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* A) Party Name */}
            <div>
              <Input
                label="A) Party Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Apex Polychem Pvt Ltd"
                required
                autoFocus
              />
            </div>

            {/* B) 5 Categories */}
            <div>
              <Select
                label="B) Party Category"
                value={category}
                onChange={(e) => setCategory(e.target.value as PartyCategory)}
              >
                {PARTY_CATEGORIES.map((cat) => (
                  <option key={cat.key} value={cat.key}>
                    {cat.label} — {cat.shortDesc}
                  </option>
                ))}
              </Select>
              {currentCategoryMeta && (
                <div className="mt-1.5 rounded-lg border border-blue-100 bg-blue-50/60 p-2.5 text-xs text-blue-800">
                  <p className="font-medium">{currentCategoryMeta.label}</p>
                  <p className="mt-0.5 text-blue-700">{currentCategoryMeta.description}</p>
                </div>
              )}
            </div>

            {/* C) Location */}
            <div>
              <Input
                label="C) Location / Address"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Kalol, Gujarat"
              />
            </div>

            {/* D) Investment & E) Loss in a 2-column grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Input
                  label="D) Investment (₹)"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  value={investment}
                  onChange={(e) => setInvestment(e.target.value)}
                  placeholder="0"
                />
                <span className="mt-1 block text-[11px] text-gray-500">
                  Capital / advance invested with this party
                </span>
              </div>

              <div>
                <Input
                  label="E) Loss Incurred Till Date (₹)"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  value={initialLoss}
                  onChange={(e) => setInitialLoss(e.target.value)}
                  placeholder="0"
                />
                <span className="mt-1 block text-[11px] text-gray-500">
                  Decreases as profitable entries are recorded
                </span>
              </div>
            </div>

            {/* F) Opening Balance */}
            <div>
              <Input
                label="F) Opening Balance (₹)"
                type="number"
                inputMode="decimal"
                step="any"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0"
              />
              <span className="mt-1 block text-[11px] text-gray-500">
                Ledger opening balance. Positive (+) for amount receivable (Debtor balance), negative (-) for amount payable (Creditor balance).
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : party?.id ? 'Update Party' : 'Add Party & Proceed'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
