import React, { useState, useEffect } from 'react';
import { X, Building2, Calendar, MapPin, Hash, Check } from 'lucide-react';
import type { Company } from '@/types/company';
import { INDIAN_STATES } from '@/types/company';

interface Props {
  open: boolean;
  onClose: () => void;
  existingCompany?: Company | null;
  onSave: (company: Company) => Promise<void>;
}

export function CompanyModal({ open, onClose, existingCompany, onSave }: Props) {
  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [fyStart, setFyStart] = useState('2026-04-01');
  const [fyEnd, setFyEnd] = useState('2027-03-31');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingCompany) {
      setName(existingCompany.name);
      setTradeName(existingCompany.tradeName || '');
      setAddress(existingCompany.address || '');
      setCity(existingCompany.city || '');
      setState(existingCompany.state || 'Maharashtra');
      setGstin(existingCompany.gstin || '');
      setPan(existingCompany.pan || '');
      setFyStart(existingCompany.financialYearStart || '2026-04-01');
      setFyEnd(existingCompany.financialYearEnd || '2027-03-31');
      setPhone(existingCompany.phone || '');
      setEmail(existingCompany.email || '');
    } else {
      setName('');
      setTradeName('');
      setAddress('');
      setCity('');
      setState('Maharashtra');
      setGstin('');
      setPan('');
      setFyStart('2026-04-01');
      setFyEnd('2027-03-31');
      setPhone('');
      setEmail('');
    }
    setError(null);
  }, [existingCompany, open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Company name is required.');
      return;
    }

    const stateObj = INDIAN_STATES.find((s) => s.name === state);

    const comp: Company = {
      id: existingCompany?.id || `comp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: name.trim(),
      tradeName: tradeName.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      state,
      stateCode: stateObj?.code || '27',
      gstin: gstin.trim().toUpperCase() || undefined,
      pan: pan.trim().toUpperCase() || undefined,
      financialYearStart: fyStart,
      financialYearEnd: fyEnd,
      currency: 'INR',
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      createdAt: existingCompany?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSaving(true);
    setError(null);
    try {
      await onSave(comp);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save company.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 select-none font-sans text-xs">
      <div className="relative w-full max-w-lg bg-white border-2 border-[#004b6e] text-[#0d222f] shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#004b6e] text-white border-b border-[#003859]">
          <div className="flex items-center gap-2">
            <span className="bg-[#fed843] text-black px-1.5 py-0.2 font-black text-[10px]">
              F3
            </span>
            <h2 className="text-xs font-black uppercase tracking-wider text-white">
              {existingCompany ? 'Company Alteration' : 'Company Creation'}
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
              Company Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. RG Plastics Pvt Ltd"
              className="w-full bg-white border border-[#8caebd] px-2.5 py-1 text-sm font-bold text-[#0d222f] focus:bg-[#fed843] focus:text-black focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#004b6e] uppercase tracking-wider mb-0.5">
              Trade / Brand Name
            </label>
            <input
              type="text"
              value={tradeName}
              onChange={(e) => setTradeName(e.target.value)}
              placeholder="e.g. RG Polymers"
              className="w-full bg-white border border-[#8caebd] px-2.5 py-1 text-xs text-[#0d222f] focus:bg-[#fed843] focus:text-black focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-[#004b6e] uppercase tracking-wider mb-0.5">
                State *
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

            <div>
              <label className="block text-[10px] font-bold text-[#004b6e] uppercase tracking-wider mb-0.5">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Pune"
                className="w-full bg-white border border-[#8caebd] px-2 py-1 text-xs text-[#0d222f] focus:bg-[#fed843] focus:text-black focus:outline-none"
              />
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
              placeholder="Full registered factory or office address..."
              className="w-full bg-white border border-[#8caebd] px-2 py-1 text-xs text-[#0d222f] focus:bg-[#fed843] focus:text-black focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-[#004b6e] uppercase tracking-wider mb-0.5">
                GSTIN (Tax ID)
              </label>
              <input
                type="text"
                maxLength={15}
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="27ABCDE1234F1Z5"
                className="w-full bg-white border border-[#8caebd] px-2 py-1 text-xs font-mono font-bold text-[#0d222f] focus:bg-[#fed843] focus:text-black focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#004b6e] uppercase tracking-wider mb-0.5">
                PAN
              </label>
              <input
                type="text"
                maxLength={10}
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                className="w-full bg-white border border-[#8caebd] px-2 py-1 text-xs font-mono font-bold text-[#0d222f] focus:bg-[#fed843] focus:text-black focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-[#004b6e] uppercase tracking-wider mb-0.5">
                Financial Year Begins
              </label>
              <input
                type="date"
                required
                value={fyStart}
                onChange={(e) => setFyStart(e.target.value)}
                className="w-full bg-white border border-[#8caebd] px-2 py-1 text-xs font-mono font-bold text-[#0d222f] focus:bg-[#fed843] focus:text-black focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#004b6e] uppercase tracking-wider mb-0.5">
                Books Beginning From
              </label>
              <input
                type="date"
                required
                value={fyEnd}
                onChange={(e) => setFyEnd(e.target.value)}
                className="w-full bg-white border border-[#8caebd] px-2 py-1 text-xs font-mono font-bold text-[#0d222f] focus:bg-[#fed843] focus:text-black focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-[#004b6e] uppercase tracking-wider mb-0.5">
                Phone / Mobile
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
                placeholder="accounts@rgplastics.in"
                className="w-full bg-white border border-[#8caebd] px-2 py-1 text-xs text-[#0d222f] focus:bg-[#fed843] focus:text-black focus:outline-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-[#8caebd]">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="bg-[#edf4f8] hover:bg-[#a61a1a] hover:text-white border border-[#7ea1b5] px-3 py-1 text-xs font-bold text-[#004b6e] transition"
            >
              Cancel (Esc)
            </button>

            <button
              type="submit"
              disabled={saving}
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
