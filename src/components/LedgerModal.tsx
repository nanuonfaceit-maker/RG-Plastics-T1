import React, { useState, useEffect } from 'react';
import { X, BookOpen, Check, Trash2 } from 'lucide-react';
import type { LedgerAccount, AccountGroup, BalanceType } from '@/types/accounting';
import { TALLY_PRIMARY_GROUPS } from '@/types/accounting';
import { INDIAN_STATES } from '@/types/company';

interface Props {
  open: boolean;
  onClose: () => void;
  companyId: string;
  groups: AccountGroup[];
  existingLedger?: LedgerAccount | null;
  onSave: (ledger: LedgerAccount) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function LedgerModal({
  open,
  onClose,
  companyId,
  groups,
  existingLedger,
  onSave,
  onDelete,
}: Props) {
  const [name, setName] = useState('');
  const [groupId, setGroupId] = useState('sundry-debtors');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [openingType, setOpeningType] = useState<BalanceType>('Dr');
  const [gstin, setGstin] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allGroups = groups.length > 0 ? groups : TALLY_PRIMARY_GROUPS;

  useEffect(() => {
    if (existingLedger) {
      setName(existingLedger.name);
      setGroupId(existingLedger.groupId);
      setOpeningBalance(String(existingLedger.openingBalance || 0));
      setOpeningType(existingLedger.openingType || 'Dr');
      setGstin(existingLedger.gstin || '');
      setState(existingLedger.state || 'Maharashtra');
      setAddress(existingLedger.address || '');
      setPhone(existingLedger.phone || '');
      setEmail(existingLedger.email || '');
    } else {
      setName('');
      setGroupId('sundry-debtors');
      setOpeningBalance('0');
      setOpeningType('Dr');
      setGstin('');
      setState('Maharashtra');
      setAddress('');
      setPhone('');
      setEmail('');
    }
    setError(null);
  }, [existingLedger, open]);

  function handleGroupChange(newGroupId: string) {
    setGroupId(newGroupId);
    const grp = allGroups.find((g) => g.id === newGroupId);
    if (grp) {
      if (grp.nature === 'Asset' || grp.nature === 'Expense') {
        setOpeningType('Dr');
      } else {
        setOpeningType('Cr');
      }
    }
  }

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Ledger name is required.');
      return;
    }

    const selGroup = allGroups.find((g) => g.id === groupId);

    const ledger: LedgerAccount = {
      id: existingLedger?.id || `led-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      companyId,
      name: name.trim(),
      groupId,
      groupName: selGroup?.name || 'Current Assets',
      nature: selGroup?.nature || 'Asset',
      openingBalance: parseFloat(openingBalance) || 0,
      openingType,
      isActive: true,
      gstin: gstin.trim().toUpperCase() || undefined,
      state: state || undefined,
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      isSystem: existingLedger?.isSystem || false,
    };

    setSaving(true);
    setError(null);
    try {
      await onSave(ledger);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save ledger.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!existingLedger || !onDelete) return;
    if (existingLedger.isSystem) {
      setError('System ledgers (Cash, P&L) cannot be deleted.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete ledger "${existingLedger.name}"?`)) return;

    setDeleting(true);
    setError(null);
    try {
      await onDelete(existingLedger.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete ledger.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 select-none font-sans text-xs">
      <div className="relative w-full max-w-lg bg-white border-2 border-[#004b6e] text-[#0d222f] shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#004b6e] text-white border-b border-[#003859]">
          <div className="flex items-center gap-2">
            <span className="bg-[#fed843] text-black px-1.5 py-0.2 font-black text-[10px]">
              {existingLedger ? 'ALT' : 'NEW'}
            </span>
            <h2 className="text-xs font-black uppercase tracking-wider text-white">
              {existingLedger ? 'Ledger Alteration' : 'Ledger Creation'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:text-[#fed843] p-1 font-bold"
          >
            <X size={14} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 space-y-3 text-xs">
          {error && (
            <div className="bg-[#ffebee] border border-[#a61a1a] p-2 text-xs text-[#a61a1a] font-bold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-[#004b6e] uppercase tracking-wider mb-0.5">
              Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Polymers Ltd"
              className="w-full bg-white border border-[#8caebd] px-2.5 py-1 text-sm font-bold text-[#0d222f] focus:bg-[#fed843] focus:text-black focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#004b6e] uppercase tracking-wider mb-0.5">
              Under (Account Group) *
            </label>
            <select
              value={groupId}
              onChange={(e) => handleGroupChange(e.target.value)}
              className="w-full bg-white border border-[#8caebd] px-2.5 py-1 text-xs font-bold text-[#0d222f] focus:bg-[#fed843] focus:text-black focus:outline-none"
            >
              {allGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.nature})
                </option>
              ))}
            </select>
          </div>

          {/* Opening Balance */}
          <div className="grid grid-cols-3 gap-2 p-2 bg-[#f0f5f8] border border-[#8caebd]">
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-[#004b6e] uppercase tracking-wider mb-0.5">
                Opening Balance (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white border border-[#8caebd] px-2 py-0.5 text-xs text-[#0d222f] font-mono font-bold focus:bg-[#fed843] focus:text-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#004b6e] uppercase tracking-wider mb-0.5">
                Dr / Cr
              </label>
              <select
                value={openingType}
                onChange={(e) => setOpeningType(e.target.value as BalanceType)}
                className="w-full bg-white border border-[#8caebd] px-2 py-0.5 text-xs font-bold font-mono text-[#004b6e] focus:bg-[#fed843] focus:text-black focus:outline-none"
              >
                <option value="Dr">Dr</option>
                <option value="Cr">Cr</option>
              </select>
            </div>
          </div>

          {/* Statutory / Tax Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-[#8caebd]">
            <div>
              <label className="block text-[10px] font-bold text-[#004b6e] uppercase tracking-wider mb-0.5">
                GSTIN (Optional)
              </label>
              <input
                type="text"
                maxLength={15}
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="27AABCA5555M1Z2"
                className="w-full bg-white border border-[#8caebd] px-2 py-1 text-xs font-mono font-bold text-[#0d222f] uppercase focus:bg-[#fed843] focus:text-black focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#004b6e] uppercase tracking-wider mb-0.5">
                State
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full bg-white border border-[#8caebd] px-2 py-1 text-xs font-semibold text-[#0d222f] focus:bg-[#fed843] focus:text-black focus:outline-none"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.name}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#004b6e] uppercase tracking-wider mb-0.5">
              Address
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Party registered address..."
              className="w-full bg-white border border-[#8caebd] px-2 py-1 text-xs text-[#0d222f] focus:bg-[#fed843] focus:text-black focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-[#004b6e] uppercase tracking-wider mb-0.5">
                Contact Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full bg-white border border-[#8caebd] px-2 py-1 text-xs text-[#0d222f] focus:bg-[#fed843] focus:text-black focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#004b6e] uppercase tracking-wider mb-0.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="party@example.com"
                className="w-full bg-white border border-[#8caebd] px-2 py-1 text-xs text-[#0d222f] focus:bg-[#fed843] focus:text-black focus:outline-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-[#8caebd]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving || deleting}
                className="bg-[#edf4f8] hover:bg-[#a61a1a] hover:text-white border border-[#7ea1b5] px-3 py-1 text-xs font-bold text-[#004b6e] transition"
              >
                Cancel (Esc)
              </button>

              {existingLedger && onDelete && !existingLedger.isSystem && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting || saving}
                  className="bg-[#ffebee] hover:bg-[#a61a1a] hover:text-white border border-[#a61a1a] px-2 py-1 text-xs font-bold text-[#a61a1a] transition flex items-center gap-1"
                >
                  <Trash2 size={12} />
                  <span>Delete</span>
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={saving || deleting}
              className="bg-[#fed843] hover:bg-[#f5cb28] text-black border border-[#00253d] px-5 py-1 text-xs font-black shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <Check size={14} />
              <span>{saving ? 'Saving...' : 'Accept (Ctrl+A)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
