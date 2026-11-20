import React, { useState, useEffect } from 'react';
import { Package, X, Check, Building2, Plus } from 'lucide-react';
import type { StockItem, Godown } from '@/types/inventory';
import { formatINR, round2 } from '@/services/accountingEngine';

interface Props {
  open: boolean;
  onClose: () => void;
  companyId: string;
  godowns: Godown[];
  existingItem?: StockItem | null;
  onSaveItem: (item: StockItem) => Promise<void>;
  onSaveGodown?: (godown: Godown) => Promise<void>;
}

export function StockItemModal({
  open,
  onClose,
  companyId,
  godowns,
  existingItem,
  onSaveItem,
  onSaveGodown,
}: Props) {
  const [activeTab, setActiveTab] = useState<'item' | 'godown'>('item');

  // Stock Item form state
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('Kgs');
  const [hsnCode, setHsnCode] = useState('3901');
  const [gstRate, setGstRate] = useState<number>(18);
  const [openingQty, setOpeningQty] = useState<string>('0');
  const [openingRate, setOpeningRate] = useState<string>('0');
  const [godownId, setGodownId] = useState<string>('');

  // Godown form state
  const [godownName, setGodownName] = useState('');
  const [godownLocation, setGodownLocation] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingItem) {
      setActiveTab('item');
      setName(existingItem.name);
      setUnit(existingItem.unit || 'Kgs');
      setHsnCode(existingItem.hsnCode || '3901');
      setGstRate(existingItem.gstRate || 18);
      setOpeningQty(String(existingItem.openingQty || 0));
      setOpeningRate(String(existingItem.openingRate || 0));
      setGodownId(existingItem.godownId || godowns[0]?.id || '');
    } else {
      setName('');
      setUnit('Kgs');
      setHsnCode('3901');
      setGstRate(18);
      setOpeningQty('0');
      setOpeningRate('0');
      setGodownId(godowns[0]?.id || '');
    }
    setError(null);
  }, [existingItem, godowns, open]);

  if (!open) return null;

  const qty = parseFloat(openingQty) || 0;
  const rate = parseFloat(openingRate) || 0;
  const openingValue = round2(qty * rate);

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a valid stock item name.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const item: StockItem = {
        id: existingItem?.id || `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        companyId,
        name: name.trim(),
        unit: unit.trim() || 'Kgs',
        hsnCode: hsnCode.trim() || undefined,
        gstRate,
        openingQty: qty,
        openingRate: rate,
        openingValue,
        godownId: godownId || undefined,
      };
      await onSaveItem(item);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save stock item.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNewGodown(e: React.FormEvent) {
    e.preventDefault();
    if (!godownName.trim()) {
      setError('Please enter a valid godown / warehouse name.');
      return;
    }

    if (!onSaveGodown) return;

    setSaving(true);
    setError(null);
    try {
      const gd: Godown = {
        id: `gd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        companyId,
        name: godownName.trim(),
        location: godownLocation.trim() || undefined,
        isDefault: godowns.length === 0,
      };
      await onSaveGodown(gd);
      setGodownName('');
      setGodownLocation('');
      setActiveTab('item');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save godown.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 select-none font-sans text-xs">
      <div className="bg-white border-2 border-[#004b6e] text-[#0d222f] max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Title Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#004b6e] text-white border-b border-[#003859]">
          <div className="flex items-center gap-2">
            <Package size={15} className="text-[#fed843]" />
            <h2 className="text-xs font-black uppercase tracking-wider text-white">
              {existingItem ? 'Stock Item Alteration' : 'Stock Item / Godown Creation'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:text-[#fed843] p-1 font-bold cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Tab Strip */}
        {!existingItem && (
          <div className="flex border-b border-[#8caebd] bg-[#f0f5f8] px-3 pt-2 gap-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('item')}
              className={`px-3 py-1 font-bold border-t border-x cursor-pointer ${
                activeTab === 'item'
                  ? 'bg-white border-[#8caebd] border-b-transparent text-[#004b6e]'
                  : 'bg-[#edf4f8] border-transparent text-[#4a6777] hover:text-black'
              }`}
            >
              Stock Item
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('godown')}
              className={`px-3 py-1 font-bold border-t border-x cursor-pointer flex items-center gap-1 ${
                activeTab === 'godown'
                  ? 'bg-white border-[#8caebd] border-b-transparent text-[#004b6e]'
                  : 'bg-[#edf4f8] border-transparent text-[#4a6777] hover:text-black'
              }`}
            >
              <Plus size={11} />
              <span>New Godown / Location</span>
            </button>
          </div>
        )}

        {error && (
          <div className="p-2 bg-[#fff1f2] border-b border-[#a61a1a] text-[#a61a1a] font-semibold text-[11px]">
            {error}
          </div>
        )}

        {/* Tab 1: Stock Item Form */}
        {activeTab === 'item' && (
          <form onSubmit={handleSaveItem} className="p-4 space-y-3">
            <div>
              <label className="block text-[#004b6e] text-[10px] mb-0.5 font-bold uppercase tracking-wider">
                Name of Item <span className="text-[#a61a1a]">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. PP Granules Natural / HDPE Scrap Grade A"
                required
                className="w-full bg-white border border-[#8caebd] focus:border-[#004b6e] px-2.5 py-1 text-xs font-semibold text-[#0d222f] outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[#004b6e] text-[10px] mb-0.5 font-bold uppercase tracking-wider">
                  Unit
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full bg-white border border-[#8caebd] px-2 py-1 text-xs font-semibold outline-none"
                >
                  <option value="Kgs">Kgs (Kilograms)</option>
                  <option value="Nos">Nos (Numbers)</option>
                  <option value="Tonnes">Tonnes (MT)</option>
                  <option value="Bags">Bags (25 Kg)</option>
                  <option value="Pcs">Pcs (Pieces)</option>
                  <option value="Mtr">Mtr (Meters)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#004b6e] text-[10px] mb-0.5 font-bold uppercase tracking-wider">
                  HSN / SAC Code
                </label>
                <input
                  type="text"
                  value={hsnCode}
                  onChange={(e) => setHsnCode(e.target.value)}
                  placeholder="e.g. 3901"
                  className="w-full bg-white border border-[#8caebd] px-2 py-1 text-xs font-mono font-semibold outline-none"
                />
              </div>

              <div>
                <label className="block text-[#004b6e] text-[10px] mb-0.5 font-bold uppercase tracking-wider">
                  GST Rate (%)
                </label>
                <select
                  value={gstRate}
                  onChange={(e) => setGstRate(Number(e.target.value))}
                  className="w-full bg-white border border-[#8caebd] px-2 py-1 text-xs font-bold outline-none font-mono"
                >
                  <option value={0}>0% (Exempt)</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18% (Standard)</option>
                  <option value={28}>28%</option>
                </select>
              </div>
            </div>

            <div className="p-2.5 bg-[#f0f5f8] border border-[#8caebd] space-y-2">
              <p className="text-[10px] font-black uppercase text-[#004b6e] tracking-wider">
                Opening Balance Details
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[#4a6777] text-[9px] mb-0.5 font-bold uppercase">
                    Opening Quantity
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={openingQty}
                    onChange={(e) => setOpeningQty(e.target.value)}
                    className="w-full bg-white border border-[#8caebd] px-2 py-1 text-xs font-mono font-bold text-right outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#4a6777] text-[9px] mb-0.5 font-bold uppercase">
                    Rate per Unit (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={openingRate}
                    onChange={(e) => setOpeningRate(e.target.value)}
                    className="w-full bg-white border border-[#8caebd] px-2 py-1 text-xs font-mono font-bold text-right outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#4a6777] text-[9px] mb-0.5 font-bold uppercase">
                    Opening Value (₹)
                  </label>
                  <div className="w-full bg-[#e2ecf2] border border-[#8caebd] px-2 py-1 text-xs font-mono font-black text-right text-[#004b6e]">
                    {formatINR(openingValue)}
                  </div>
                </div>
              </div>

              {godowns.length > 0 && (
                <div>
                  <label className="block text-[#4a6777] text-[9px] mb-0.5 font-bold uppercase">
                    Default Godown Location
                  </label>
                  <select
                    value={godownId}
                    onChange={(e) => setGodownId(e.target.value)}
                    className="w-full bg-white border border-[#8caebd] px-2 py-1 text-xs font-semibold outline-none"
                  >
                    {godowns.map((gd) => (
                      <option key={gd.id} value={gd.id}>
                        {gd.name} {gd.location ? `(${gd.location})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#8caebd]">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 bg-[#edf4f8] text-[#4a6777] hover:text-black border border-[#8caebd] font-bold cursor-pointer"
              >
                Cancel (Esc)
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1 bg-[#fed843] hover:bg-[#ffe570] text-[#00253d] font-bold border border-[#c99a00] shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check size={13} />
                <span>{saving ? 'Saving…' : existingItem ? 'Accept Alteration (Ctrl+A)' : 'Accept Item (Ctrl+A)'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: New Godown Form */}
        {activeTab === 'godown' && (
          <form onSubmit={handleSaveNewGodown} className="p-4 space-y-3">
            <div>
              <label className="block text-[#004b6e] text-[10px] mb-0.5 font-bold uppercase tracking-wider">
                Godown / Warehouse Name <span className="text-[#a61a1a]">*</span>
              </label>
              <input
                type="text"
                value={godownName}
                onChange={(e) => setGodownName(e.target.value)}
                placeholder="e.g. Factory Godown Bhosari / Warehouse 2"
                required
                className="w-full bg-white border border-[#8caebd] px-2.5 py-1 text-xs font-semibold text-[#0d222f] outline-none"
              />
            </div>

            <div>
              <label className="block text-[#004b6e] text-[10px] mb-0.5 font-bold uppercase tracking-wider">
                Physical Location / Address
              </label>
              <input
                type="text"
                value={godownLocation}
                onChange={(e) => setGodownLocation(e.target.value)}
                placeholder="e.g. Sector 7, Bhosari MIDC, Pune"
                className="w-full bg-white border border-[#8caebd] px-2.5 py-1 text-xs font-semibold outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#8caebd]">
              <button
                type="button"
                onClick={() => setActiveTab('item')}
                className="px-3 py-1 bg-[#edf4f8] text-[#4a6777] hover:text-black border border-[#8caebd] font-bold cursor-pointer"
              >
                Back to Item
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1 bg-[#fed843] hover:bg-[#ffe570] text-[#00253d] font-bold border border-[#c99a00] shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check size={13} />
                <span>{saving ? 'Saving…' : 'Create Godown'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
