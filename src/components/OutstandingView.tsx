import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Download,
  Calendar,
  MessageCircle,
  Phone,
  ChevronRight,
  Clock,
} from 'lucide-react';
import type { LedgerAccount, Voucher } from '@/types/accounting';
import type { Company } from '@/types/company';
import {
  computeOutstandingAging,
  formatINR,
  formatDate,
  todayISO,
} from '@/services/accountingEngine';
import { downloadCSV } from '@/lib/csv';

interface Props {
  company: Company;
  ledgers: LedgerAccount[];
  vouchers: Voucher[];
  onSelectLedger?: (ledgerId: string) => void;
  onBack?: () => void;
}

export function OutstandingView({
  company,
  ledgers,
  vouchers,
  onSelectLedger,
  onBack,
}: Props) {
  const [tab, setTab] = useState<'Receivables' | 'Payables'>('Receivables');
  const [asOfDate, setAsOfDate] = useState<string>(todayISO());
  const [searchQuery, setSearchQuery] = useState<string>('');

  const report = useMemo(() => {
    return computeOutstandingAging(ledgers, vouchers, tab, asOfDate || undefined);
  }, [ledgers, vouchers, tab, asOfDate]);

  const filteredParties = useMemo(() => {
    if (!searchQuery.trim()) return report.parties;
    const q = searchQuery.toLowerCase();
    return report.parties.filter(
      (p) =>
        p.partyName.toLowerCase().includes(q) ||
        (p.gstin && p.gstin.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q))
    );
  }, [report.parties, searchQuery]);

  function handleExportCSV() {
    const rows: string[] = [];
    rows.push(`Outstanding ${tab} Report with Ageing`);
    rows.push(`As on: ${asOfDate || 'Today'}`);
    rows.push('');
    rows.push('PARTY NAME,GSTIN,PHONE,0-30 DAYS,31-60 DAYS,61-90 DAYS,90+ DAYS,TOTAL OUTSTANDING');

    for (const p of report.parties) {
      rows.push(
        `"${p.partyName}",${p.gstin || ''},${p.phone || ''},${p.aging.days0_30},${p.aging.days31_60},${p.aging.days61_90},${p.aging.days90Plus},${p.totalOutstanding}`
      );
    }

    rows.push('');
    rows.push(
      `TOTAL,,,${report.total0_30},${report.total31_60},${report.total61_90},${report.total90Plus},${report.totalOutstanding}`
    );

    downloadCSV(`outstanding-${tab.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`, rows.join('\n'));
  }

  function handleSendWhatsAppReminder(party: (typeof report.parties)[0]) {
    const text = encodeURIComponent(
      `Dear ${party.partyName},\n\nGreetings from ${company.name}.\nThis is a friendly reminder that your outstanding balance is ${formatINR(party.totalOutstanding)} as of ${formatDate(asOfDate)}.\n\nKindly arrange the payment at your earliest convenience.\n\nThank you!`
    );
    const phone = party.phone ? party.phone.replace(/[^0-9]/g, '') : '';
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  }

  return (
    <div className="flex flex-col h-full bg-[#dbe7ee] text-[#0d222f] font-sans text-xs select-none">
      {/* Top Tally Header Banner */}
      <div className="border border-[#003859] bg-[#004b6e] text-white p-2 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#c2d7e4]">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="hover:text-[#fed843] cursor-pointer font-bold"
              >
                Gateway of Tally
              </button>
            )}
            {onBack && <span>›</span>}
            <span>Display More Reports</span>
            <span>›</span>
            <span className="text-[#fed843] font-bold">Outstanding Aging Analysis</span>
          </div>
          <h1 className="text-sm font-black tracking-wide text-white uppercase flex items-center gap-2 mt-0.5">
            <span>Outstanding {tab} &amp; Ageing Analysis</span>
            <span className="text-xs text-[#fed843] font-mono">
              (Total Due: {formatINR(report.totalOutstanding)})
            </span>
          </h1>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {/* Receivables / Payables Toggle */}
          <div className="flex border border-[#8caebd] bg-white">
            <button
              type="button"
              onClick={() => setTab('Receivables')}
              className={`px-3 py-1 text-xs font-bold transition-colors ${
                tab === 'Receivables'
                  ? 'bg-[#fed843] text-black'
                  : 'bg-white text-[#004b6e] hover:bg-[#edf4f8]'
              }`}
            >
              Receivables (Debtors)
            </button>
            <button
              type="button"
              onClick={() => setTab('Payables')}
              className={`px-3 py-1 text-xs font-bold transition-colors ${
                tab === 'Payables'
                  ? 'bg-[#fed843] text-black'
                  : 'bg-white text-[#004b6e] hover:bg-[#edf4f8]'
              }`}
            >
              Payables (Creditors)
            </button>
          </div>

          <div className="flex items-center gap-1 bg-white border border-[#8caebd] px-2 py-0.5">
            <Calendar size={12} className="text-[#004b6e]" />
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="bg-transparent text-[#0d222f] outline-none text-xs font-mono font-bold"
            />
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#edf4f8] hover:bg-[#fed843] hover:text-black border border-[#7ea1b5] text-[#004b6e] font-bold transition-colors cursor-pointer"
          >
            <Download size={12} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="py-2 space-y-2 max-w-6xl w-full mx-auto">
        {/* Aging Bracket Highlights */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <div className="bg-white border border-[#8caebd] p-2 col-span-2 md:col-span-1">
            <p className="text-[10px] font-bold text-[#004b6e] uppercase tracking-wider">Total Outstanding</p>
            <p className="text-base font-black text-[#004b6e] mt-0.5 font-mono">{formatINR(report.totalOutstanding)}</p>
            <p className="text-[9px] text-[#4a6777]">{report.parties.length} Party Ledgers</p>
          </div>

          <div className="bg-white border border-[#8caebd] p-2">
            <p className="text-[10px] font-bold text-[#059669] uppercase tracking-wider">0 – 30 Days (Current)</p>
            <p className="text-base font-black text-[#059669] mt-0.5 font-mono">{formatINR(report.total0_30)}</p>
            <p className="text-[9px] text-[#4a6777]">Within Credit Period</p>
          </div>

          <div className="bg-white border border-[#8caebd] p-2">
            <p className="text-[10px] font-bold text-[#004b6e] uppercase tracking-wider">31 – 60 Days</p>
            <p className="text-base font-black text-[#004b6e] mt-0.5 font-mono">{formatINR(report.total31_60)}</p>
            <p className="text-[9px] text-[#4a6777]">Moderate Aging</p>
          </div>

          <div className="bg-white border border-[#8caebd] p-2">
            <p className="text-[10px] font-bold text-[#f59e0b] uppercase tracking-wider">61 – 90 Days</p>
            <p className="text-base font-black text-[#f59e0b] mt-0.5 font-mono">{formatINR(report.total61_90)}</p>
            <p className="text-[9px] text-[#4a6777]">Follow-up Required</p>
          </div>

          <div className="bg-[#fff1f2] border border-[#a61a1a] p-2">
            <p className="text-[10px] font-bold text-[#a61a1a] uppercase tracking-wider">&gt; 90 Days (Overdue)</p>
            <p className="text-base font-black text-[#a61a1a] mt-0.5 font-mono">{formatINR(report.total90Plus)}</p>
            <p className="text-[9px] text-[#a61a1a]/80">Critical Attention</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-1.5 bg-[#f0f5f8] border border-[#8caebd] p-1.5">
          <Search size={13} className="text-[#4a6777] ml-1" />
          <input
            type="text"
            placeholder={`Search ${tab.toLowerCase()} by party name, phone, or GSTIN...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white border border-[#8caebd] px-2 py-0.5 text-xs text-[#0d222f] outline-none w-full"
          />
        </div>

        {/* Parties List Table */}
        <div className="bg-white border-2 border-[#004b6e] shadow-md overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#004b6e] text-white border-b border-[#003859] text-[10px] font-bold uppercase tracking-wider">
                <th className="py-1.5 px-2.5 border-r border-[#003859]">Party Name</th>
                <th className="py-1.5 px-2.5 border-r border-[#003859]">GSTIN / Contact</th>
                <th className="py-1.5 px-2.5 text-right border-r border-[#003859]">0–30 Days</th>
                <th className="py-1.5 px-2.5 text-right border-r border-[#003859]">31–60 Days</th>
                <th className="py-1.5 px-2.5 text-right border-r border-[#003859]">61–90 Days</th>
                <th className="py-1.5 px-2.5 text-right border-r border-[#003859]">&gt; 90 Days</th>
                <th className="py-1.5 px-2.5 text-right font-bold border-r border-[#003859]">Total Due</th>
                <th className="py-1.5 px-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c2d7e4]">
              {filteredParties.map((p) => (
                <tr key={p.ledgerId} className="hover:bg-[#fed843] hover:text-black transition-colors group">
                  <td
                    onClick={() => onSelectLedger?.(p.ledgerId)}
                    className="py-1 px-2.5 font-bold text-[#004b6e] group-hover:text-black hover:underline cursor-pointer border-r border-[#c2d7e4]"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{p.partyName}</span>
                      <ChevronRight size={11} className="text-[#8caebd] group-hover:text-black" />
                    </div>
                  </td>
                  <td className="py-1 px-2.5 text-[#4a6777] group-hover:text-black font-mono text-[10px] border-r border-[#c2d7e4]">
                    <p>{p.gstin || 'Unregistered'}</p>
                    {p.phone && <p>{p.phone}</p>}
                  </td>
                  <td className="py-1 px-2.5 text-right font-mono text-[#059669] group-hover:text-black border-r border-[#c2d7e4]">
                    {p.aging.days0_30 > 0 ? formatINR(p.aging.days0_30) : '—'}
                  </td>
                  <td className="py-1 px-2.5 text-right font-mono text-[#004b6e] group-hover:text-black border-r border-[#c2d7e4]">
                    {p.aging.days31_60 > 0 ? formatINR(p.aging.days31_60) : '—'}
                  </td>
                  <td className="py-1 px-2.5 text-right font-mono text-[#f59e0b] group-hover:text-black border-r border-[#c2d7e4]">
                    {p.aging.days61_90 > 0 ? formatINR(p.aging.days61_90) : '—'}
                  </td>
                  <td className="py-1 px-2.5 text-right font-mono text-[#a61a1a] group-hover:text-black font-bold border-r border-[#c2d7e4]">
                    {p.aging.days90Plus > 0 ? formatINR(p.aging.days90Plus) : '—'}
                  </td>
                  <td className="py-1 px-2.5 text-right font-mono font-black text-[#004b6e] group-hover:text-black border-r border-[#c2d7e4]">
                    {formatINR(p.totalOutstanding)}
                  </td>
                  <td className="py-1 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppReminder(p)}
                      title="Send WhatsApp payment reminder"
                      className="bg-[#edf4f8] hover:bg-[#059669] hover:text-white text-[#059669] border border-[#7ea1b5] px-2 py-0.5 text-[10px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <MessageCircle size={10} />
                      <span>Reminder</span>
                    </button>
                  </td>
                </tr>
              ))}

              {filteredParties.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#4a6777] font-sans">
                    No outstanding {tab.toLowerCase()} found.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-[#f0f5f8] text-[#004b6e] font-black border-t-2 border-b-4 border-double border-[#004b6e]">
                <td colSpan={2} className="py-2 px-2.5 uppercase tracking-wider text-[10px]">
                  Total Outstanding {tab}
                </td>
                <td className="py-2 px-2.5 text-right font-mono text-[#059669]">{formatINR(report.total0_30)}</td>
                <td className="py-2 px-2.5 text-right font-mono text-[#004b6e]">{formatINR(report.total31_60)}</td>
                <td className="py-2 px-2.5 text-right font-mono text-[#f59e0b]">{formatINR(report.total61_90)}</td>
                <td className="py-2 px-2.5 text-right font-mono text-[#a61a1a]">{formatINR(report.total90Plus)}</td>
                <td className="py-2 px-2.5 text-right font-mono text-sm">
                  {formatINR(report.totalOutstanding)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
