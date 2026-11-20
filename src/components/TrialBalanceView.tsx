import React, { useState, useMemo } from 'react';
import {
  Scale,
  Calendar,
  Download,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import type { LedgerAccount, AccountGroup, Voucher } from '@/types/accounting';
import { computeTrialBalance, formatINR, formatDate } from '@/services/accountingEngine';

interface Props {
  ledgers: LedgerAccount[];
  groups: AccountGroup[];
  vouchers: Voucher[];
  onSelectLedger: (ledgerId: string) => void;
}

export function TrialBalanceView({
  ledgers,
  groups,
  vouchers,
  onSelectLedger,
}: Props) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const report = useMemo(() => {
    return computeTrialBalance(ledgers, groups, vouchers, fromDate || undefined, toDate || undefined);
  }, [ledgers, groups, vouchers, fromDate, toDate]);

  function toggleGroup(groupId: string) {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  }

  function exportCSV() {
    const headers = ['Account Group / Ledger', 'Closing Debit (INR)', 'Closing Credit (INR)'];
    const rows: string[][] = [];

    for (const g of report.groups) {
      rows.push([`[GROUP] ${g.group.name}`, g.closingDebit.toFixed(2), g.closingCredit.toFixed(2)]);
      for (const item of g.items) {
        rows.push([
          `  ${item.ledgerName}`,
          item.closingDebit ? item.closingDebit.toFixed(2) : '0.00',
          item.closingCredit ? item.closingCredit.toFixed(2) : '0.00',
        ]);
      }
    }

    rows.push(['TOTAL', report.totalClosingDebit.toFixed(2), report.totalClosingCredit.toFixed(2)]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `trial-balance-${new Date().toISOString().slice(0, 10)}.csv`);
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
            <span>Trial Balance</span>
            {report.isBalanced ? (
              <span className="bg-[#10b981] text-white px-1.5 py-0.2 font-mono font-bold text-xs flex items-center gap-1">
                <ShieldCheck size={12} /> Balanced
              </span>
            ) : (
              <span className="bg-[#a61a1a] text-white px-1.5 py-0.2 font-mono font-bold text-xs flex items-center gap-1">
                <AlertTriangle size={12} /> Imbalance: {formatINR(report.difference)}
              </span>
            )}
          </h1>
          <p className="text-[10px] text-[#c2d7e4]">
            Ledger-wise Dr/Cr balance verification
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
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-[#f0f5f8] p-2 border border-[#8caebd] text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase text-[#004b6e]">Period:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-white border border-[#8caebd] px-2 py-0.5 text-[#0d222f] font-mono text-xs focus:bg-[#fed843] focus:text-black focus:outline-none"
          />
          <span className="text-[#4a6777] font-bold text-[10px]">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="bg-white border border-[#8caebd] px-2 py-0.5 text-[#0d222f] font-mono text-xs focus:bg-[#fed843] focus:text-black focus:outline-none"
          />
        </div>
        {(fromDate || toDate) && (
          <button
            type="button"
            onClick={() => {
              setFromDate('');
              setToDate('');
            }}
            className="text-[11px] text-[#a61a1a] font-bold hover:underline"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border-2 border-[#004b6e] shadow-md overflow-hidden font-mono text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#004b6e] text-white text-[10px] font-bold uppercase tracking-wider">
                <th className="py-1.5 px-3 font-sans border-r border-[#003859]">Particulars (Account Group / Ledger)</th>
                <th className="py-1.5 px-3 w-40 text-right border-r border-[#003859]">Debit (Dr) (₹)</th>
                <th className="py-1.5 px-3 w-40 text-right">Credit (Cr) (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c2d7e4]">
              {report.groups.map((grpSummary) => {
                const isCollapsed = collapsedGroups[grpSummary.group.id];
                return (
                  <React.Fragment key={grpSummary.group.id}>
                    {/* Group Header Row */}
                    <tr
                      onClick={() => toggleGroup(grpSummary.group.id)}
                      className="bg-[#edf4f8] hover:bg-[#fed843] hover:text-black cursor-pointer transition select-none group font-bold"
                    >
                      <td className="py-1 px-3 text-[#004b6e] group-hover:text-black flex items-center gap-1.5 font-sans border-r border-[#c2d7e4]">
                        {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                        <span className="tracking-wide uppercase text-[11px]">{grpSummary.group.name}</span>
                        <span className="text-[10px] text-[#4a6777] font-normal group-hover:text-black">
                          ({grpSummary.items.length} ledgers)
                        </span>
                      </td>
                      <td className="py-1 px-3 text-right text-[#004b6e] group-hover:text-black border-r border-[#c2d7e4]">
                        {grpSummary.closingDebit ? formatINR(grpSummary.closingDebit) : '-'}
                      </td>
                      <td className="py-1 px-3 text-right text-[#a61a1a] group-hover:text-black">
                        {grpSummary.closingCredit ? formatINR(grpSummary.closingCredit) : '-'}
                      </td>
                    </tr>

                    {/* Ledgers under this group */}
                    {!isCollapsed &&
                      grpSummary.items.map((item) => (
                        <tr
                          key={item.ledgerId}
                          onClick={() => onSelectLedger(item.ledgerId)}
                          className="hover:bg-[#fed843] hover:text-black cursor-pointer transition text-[#0d222f]"
                        >
                          <td className="py-0.5 pl-8 pr-3 font-sans flex items-center justify-between border-r border-[#c2d7e4]">
                            <span className="font-medium">{item.ledgerName}</span>
                            <span className="text-[9px] text-[#4a6777] font-mono">
                              Period Dr: {formatINR(item.periodDebit)} | Cr: {formatINR(item.periodCredit)}
                            </span>
                          </td>
                          <td className="py-0.5 px-3 text-right border-r border-[#c2d7e4] font-bold text-[#004b6e]">
                            {item.closingDebit ? formatINR(item.closingDebit) : '-'}
                          </td>
                          <td className="py-0.5 px-3 text-right font-bold text-[#a61a1a]">
                            {item.closingCredit ? formatINR(item.closingCredit) : '-'}
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-[#f0f5f8] border-t-2 border-b-4 border-double border-[#004b6e] font-black text-xs">
                <td className="py-2 px-3 font-sans text-right text-[#004b6e] uppercase">
                  Grand Total:
                </td>
                <td className="py-2 px-3 text-right text-[#004b6e]">
                  {formatINR(report.totalClosingDebit)}
                </td>
                <td className="py-2 px-3 text-right text-[#a61a1a]">
                  {formatINR(report.totalClosingCredit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
