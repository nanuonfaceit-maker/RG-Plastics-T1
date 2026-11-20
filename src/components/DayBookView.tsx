import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Filter,
  Search,
  Download,
  Plus,
  Eye,
  Pencil,
  Copy,
  Trash2,
  FileSpreadsheet,
} from 'lucide-react';
import type { Voucher, TallyVoucherType } from '@/types/accounting';
import { formatINR, formatDate, round2 } from '@/services/accountingEngine';

interface Props {
  vouchers: Voucher[];
  onSelectVoucher: (id: string) => void;
  onEditVoucher: (voucher: Voucher) => void;
  onDuplicateVoucher: (voucher: Voucher) => void;
  onDeleteVoucher: (id: string) => Promise<void>;
  onOpenCreateVoucher: (type?: TallyVoucherType) => void;
}

export function DayBookView({
  vouchers,
  onSelectVoucher,
  onEditVoucher,
  onDuplicateVoucher,
  onDeleteVoucher,
  onOpenCreateVoucher,
}: Props) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return vouchers.filter((v) => {
      if (fromDate && v.date < fromDate) return false;
      if (toDate && v.date > toDate) return false;
      if (selectedType !== 'ALL' && v.voucherType !== selectedType) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesNum = v.voucherNumber.toLowerCase().includes(q);
        const matchesNarration = (v.narration || '').toLowerCase().includes(q);
        const matchesParty = v.lines.some((l) => l.ledgerName.toLowerCase().includes(q));
        if (!matchesNum && !matchesNarration && !matchesParty) return false;
      }
      return true;
    });
  }, [vouchers, fromDate, toDate, selectedType, search]);

  const totalAmount = useMemo(() => {
    return filtered.reduce((sum, v) => {
      const drSum = v.lines
        .filter((l) => l.type === 'Dr')
        .reduce((s, l) => s + (Number(l.amount) || 0), 0);
      return sum + drSum;
    }, 0);
  }, [filtered]);

  function exportCSV() {
    const headers = ['Date', 'Voucher Type', 'Voucher No', 'Particulars (Dr)', 'Particulars (Cr)', 'Debit Amount', 'Credit Amount', 'Narration'];
    const rows = filtered.map((v) => {
      const drLines = v.lines.filter((l) => l.type === 'Dr').map((l) => `${l.ledgerName} (₹${l.amount})`).join('; ');
      const crLines = v.lines.filter((l) => l.type === 'Cr').map((l) => `${l.ledgerName} (₹${l.amount})`).join('; ');
      const total = v.lines.filter((l) => l.type === 'Dr').reduce((s, l) => s + l.amount, 0);
      return [
        v.date,
        v.voucherType,
        v.voucherNumber,
        `"${drLines}"`,
        `"${crLines}"`,
        total.toFixed(2),
        total.toFixed(2),
        `"${(v.narration || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `daybook-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-2 select-none font-sans text-xs">
      {/* Tally Header Banner */}
      <div className="bg-[#004b6e] text-white p-2 border border-[#003859] flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div>
          <h1 className="text-sm font-black tracking-wide text-white uppercase flex items-center gap-2">
            <span>Day Book</span>
            <span className="bg-[#fed843] text-black px-1.5 py-0.2 font-mono font-bold text-xs">
              {filtered.length} Vouchers
            </span>
          </h1>
          <p className="text-[10px] text-[#c2d7e4]">
            Chronological audit register of all journal and accounting entries
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={exportCSV}
            className="bg-[#edf4f8] hover:bg-[#fed843] hover:text-black border border-[#7ea1b5] text-[#004b6e] px-2.5 py-1 text-xs font-bold flex items-center gap-1 transition"
          >
            <Download size={13} className="text-[#a61a1a]" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenCreateVoucher('Sales')}
            className="bg-[#fed843] hover:bg-[#f5cb28] text-black border border-[#00253d] px-3 py-1 text-xs font-black flex items-center gap-1 transition shadow-xs"
          >
            <Plus size={13} />
            <span>Create Voucher (V)</span>
          </button>
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-[#f0f5f8] p-2 border border-[#8caebd] text-xs">
        <div>
          <label className="block text-[10px] font-bold text-[#004b6e] uppercase mb-0.5">
            Search
          </label>
          <div className="relative">
            <Search size={12} className="absolute left-2 top-2 text-[#4a6777]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Voucher No, Party..."
              className="w-full bg-white border border-[#8caebd] pl-6 pr-2 py-1 text-xs text-[#0d222f] focus:bg-[#fed843] focus:text-black focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-[#004b6e] uppercase mb-0.5">
            Voucher Type
          </label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full bg-white border border-[#8caebd] px-2 py-1 text-xs font-semibold text-[#0d222f] focus:bg-[#fed843] focus:text-black focus:outline-none"
          >
            <option value="ALL">All Vouchers</option>
            <option value="Sales">Sales (F8)</option>
            <option value="Purchase">Purchase (F9)</option>
            <option value="Payment">Payment (F5)</option>
            <option value="Receipt">Receipt (F6)</option>
            <option value="Contra">Contra (F4)</option>
            <option value="Journal">Journal (F7)</option>
            <option value="Debit Note">Debit Note</option>
            <option value="Credit Note">Credit Note</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-[#004b6e] uppercase mb-0.5">
            From Date
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full bg-white border border-[#8caebd] px-2 py-1 text-xs text-[#0d222f] font-mono focus:bg-[#fed843] focus:text-black focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-[#004b6e] uppercase mb-0.5">
            To Date
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full bg-white border border-[#8caebd] px-2 py-1 text-xs text-[#0d222f] font-mono focus:bg-[#fed843] focus:text-black focus:outline-none"
          />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white border-2 border-[#004b6e] shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#004b6e] text-white text-[10px] font-bold uppercase tracking-wider">
                <th className="py-1.5 px-2.5 w-24 border-r border-[#003859]">Date</th>
                <th className="py-1.5 px-2.5 w-24 border-r border-[#003859]">Type</th>
                <th className="py-1.5 px-2.5 w-28 border-r border-[#003859]">Voucher No</th>
                <th className="py-1.5 px-2.5 border-r border-[#003859]">Particulars (Counter Ledger)</th>
                <th className="py-1.5 px-2.5 w-32 text-right border-r border-[#003859]">Debit (₹)</th>
                <th className="py-1.5 px-2.5 w-32 text-right border-r border-[#003859]">Credit (₹)</th>
                <th className="py-1.5 px-2 w-20 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c2d7e4] font-mono text-[#0d222f]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs text-[#4a6777] font-sans">
                    No transactions found for the selected criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((v) => {
                  const drLines = v.lines.filter((l) => l.type === 'Dr');
                  const crLines = v.lines.filter((l) => l.type === 'Cr');
                  const totalVoucherAmt = drLines.reduce((s, l) => s + Number(l.amount || 0), 0);

                  const primaryParty =
                    v.voucherType === 'Sales' || v.voucherType === 'Payment' || v.voucherType === 'Debit Note'
                      ? drLines[0]?.ledgerName
                      : crLines[0]?.ledgerName;

                  return (
                    <tr
                      key={v.id}
                      className="hover:bg-[#fed843] hover:text-black cursor-pointer transition group"
                      onClick={() => onSelectVoucher(v.id)}
                    >
                      <td className="py-1 px-2.5 border-r border-[#c2d7e4] font-semibold">
                        {formatDate(v.date)}
                      </td>
                      <td className="py-1 px-2.5 border-r border-[#c2d7e4]">
                        <span className="font-bold text-[#004b6e] group-hover:text-black">
                          {v.voucherType}
                        </span>
                      </td>
                      <td className="py-1 px-2.5 border-r border-[#c2d7e4] font-bold">
                        {v.voucherNumber}
                      </td>
                      <td className="py-1 px-2.5 border-r border-[#c2d7e4] font-sans">
                        <div className="font-semibold">{primaryParty || v.lines[0]?.ledgerName}</div>
                        {v.narration && (
                          <div className="text-[10px] text-[#4a6777] group-hover:text-black truncate italic">
                            {v.narration}
                          </div>
                        )}
                      </td>
                      <td className="py-1 px-2.5 text-right font-bold text-[#004b6e] group-hover:text-black border-r border-[#c2d7e4]">
                        {formatINR(totalVoucherAmt)}
                      </td>
                      <td className="py-1 px-2.5 text-right font-bold text-[#a61a1a] group-hover:text-black border-r border-[#c2d7e4]">
                        {formatINR(totalVoucherAmt)}
                      </td>
                      <td
                        className="py-1 px-2 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditVoucher(v)}
                            className="p-1 hover:text-[#004b6e]"
                            title="Edit Voucher"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDuplicateVoucher(v)}
                            className="p-1 hover:text-[#004b6e]"
                            title="Duplicate Voucher"
                          >
                            <Copy size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteVoucher(v.id)}
                            className="p-1 hover:text-[#a61a1a]"
                            title="Delete Voucher"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="bg-[#f0f5f8] border-t-2 border-b-4 border-double border-[#004b6e] font-mono text-xs font-black">
                <td colSpan={4} className="py-1.5 px-3 text-right text-[#004b6e] uppercase">
                  Total of {filtered.length} Vouchers:
                </td>
                <td className="py-1.5 px-2.5 text-right text-[#004b6e]">
                  {formatINR(totalAmount)}
                </td>
                <td className="py-1.5 px-2.5 text-right text-[#a61a1a]">
                  {formatINR(totalAmount)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
