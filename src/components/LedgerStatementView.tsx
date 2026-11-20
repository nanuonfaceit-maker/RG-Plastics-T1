import React, { useState, useMemo } from 'react';
import { ArrowLeft, Download, Pencil, Calendar, BookOpen } from 'lucide-react';
import type { LedgerAccount, Voucher } from '@/types/accounting';
import { computeLedgerStatement, formatINR, formatINRWithDrCr, formatDate } from '@/services/accountingEngine';

interface Props {
  ledger: LedgerAccount;
  allLedgers: LedgerAccount[];
  vouchers: Voucher[];
  onBack: () => void;
  onSelectVoucher: (id: string) => void;
  onEditLedger?: () => void;
  onChangeLedger?: (ledgerId: string) => void;
}

export function LedgerStatementView({
  ledger,
  allLedgers,
  vouchers,
  onBack,
  onSelectVoucher,
  onEditLedger,
  onChangeLedger,
}: Props) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const statement = useMemo(() => {
    return computeLedgerStatement(ledger, vouchers, fromDate || undefined, toDate || undefined);
  }, [ledger, vouchers, fromDate, toDate]);

  function exportCSV() {
    const headers = ['Date', 'Particulars', 'Voucher Type', 'Voucher No', 'Debit (₹)', 'Credit (₹)', 'Balance (₹)', 'Dr/Cr'];
    const rows = [
      ['', 'Opening Balance', '', '', '', '', statement.openingBalance.toFixed(2), statement.openingType],
      ...statement.entries.map((e) => [
        e.date,
        `"${e.particulars.replace(/"/g, '""')}"`,
        e.voucherType,
        e.voucherNumber,
        e.debit ? e.debit.toFixed(2) : '',
        e.credit ? e.credit.toFixed(2) : '',
        e.runningBalance.toFixed(2),
        e.runningType,
      ]),
      ['', 'Closing Balance', '', '', statement.totalDebit.toFixed(2), statement.totalCredit.toFixed(2), statement.closingBalance.toFixed(2), statement.closingType],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((r) => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ledger-${ledger.name.replace(/\s+/g, '_')}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-2 select-none font-sans text-xs">
      {/* Top Tally Header Banner */}
      <div className="border border-[#003859] bg-[#004b6e] text-white p-2 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="bg-[#00253d] border border-[#557e96] hover:bg-[#fed843] hover:text-black px-2 py-0.5 text-xs font-bold transition flex items-center gap-1"
          >
            <ArrowLeft size={12} />
            <span>Esc</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              {onChangeLedger ? (
                <select
                  value={ledger.id}
                  onChange={(e) => onChangeLedger(e.target.value)}
                  className="bg-white border border-[#8caebd] text-[#0d222f] font-bold text-xs px-2 py-0.5 outline-none"
                >
                  {allLedgers.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              ) : (
                <h1 className="text-sm font-black tracking-wide text-white uppercase">{ledger.name}</h1>
              )}
              <span className="bg-[#fed843] text-black px-1.5 py-0.2 text-[10px] font-mono font-bold">
                {ledger.groupName}
              </span>
            </div>
            <p className="text-[10px] text-[#c2d7e4]">
              Opening Balance: {formatINRWithDrCr(statement.openingBalance, statement.openingType)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onEditLedger && (
            <button
              type="button"
              onClick={onEditLedger}
              className="bg-[#edf4f8] hover:bg-[#fed843] hover:text-black border border-[#7ea1b5] text-[#004b6e] px-2.5 py-1 text-xs font-bold flex items-center gap-1 transition"
            >
              <Pencil size={12} />
              <span>Alter Ledger</span>
            </button>
          )}
          <button
            type="button"
            onClick={exportCSV}
            className="bg-[#edf4f8] hover:bg-[#fed843] hover:text-black border border-[#7ea1b5] text-[#004b6e] px-2.5 py-1 text-xs font-bold flex items-center gap-1 transition"
          >
            <Download size={12} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Date Filter & Closing Balance Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <div className="sm:col-span-2 bg-[#f0f5f8] p-2 border border-[#8caebd] flex items-center gap-1.5 text-xs">
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

        <div className="sm:col-span-2 bg-white p-2 border-2 border-[#004b6e] flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[9px] font-bold uppercase text-[#4a6777] block">Closing Balance</span>
            <span className="text-sm font-black text-[#004b6e] font-mono">
              {formatINRWithDrCr(statement.closingBalance, statement.closingType)}
            </span>
          </div>
          <div className="text-right text-[10px] font-mono text-[#4a6777]">
            <p>Total Dr: {formatINR(statement.totalDebit)}</p>
            <p>Total Cr: {formatINR(statement.totalCredit)}</p>
          </div>
        </div>
      </div>

      {/* Statement Table */}
      <div className="bg-white border-2 border-[#004b6e] shadow-md overflow-hidden font-mono text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#004b6e] text-white border-b border-[#003859] text-[10px] font-bold uppercase tracking-wider font-sans">
                <th className="py-1.5 px-2.5 w-24 border-r border-[#003859]">Date</th>
                <th className="py-1.5 px-2.5 border-r border-[#003859]">Particulars (Opposite Ledger)</th>
                <th className="py-1.5 px-2.5 w-24 border-r border-[#003859]">Vch Type</th>
                <th className="py-1.5 px-2.5 w-28 border-r border-[#003859]">Vch No</th>
                <th className="py-1.5 px-2.5 w-32 text-right border-r border-[#003859]">Debit (Dr) (₹)</th>
                <th className="py-1.5 px-2.5 w-32 text-right border-r border-[#003859]">Credit (Cr) (₹)</th>
                <th className="py-1.5 px-2.5 w-36 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c2d7e4] text-[#0d222f]">
              {/* Opening Row */}
              <tr className="bg-[#f0f5f8] text-[#4a6777] italic font-sans font-semibold">
                <td className="py-1 px-2.5 border-r border-[#c2d7e4]">{formatDate(fromDate || '2026-04-01')}</td>
                <td colSpan={5} className="py-1 px-2.5 border-r border-[#c2d7e4]">
                  Opening Balance b/f
                </td>
                <td className="py-1 px-2.5 text-right font-mono font-bold text-[#004b6e] not-italic">
                  {formatINRWithDrCr(statement.openingBalance, statement.openingType)}
                </td>
              </tr>

              {/* Transactions */}
              {statement.entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#4a6777] font-sans not-italic">
                    No transactions recorded for this ledger in the selected period.
                  </td>
                </tr>
              ) : (
                statement.entries.map((entry) => (
                  <tr
                    key={entry.voucherId}
                    onClick={() => onSelectVoucher(entry.voucherId)}
                    className="hover:bg-[#fed843] hover:text-black cursor-pointer transition group"
                  >
                    <td className="py-1 px-2.5 text-[#4a6777] group-hover:text-black border-r border-[#c2d7e4]">{formatDate(entry.date)}</td>
                    <td className="py-1 px-2.5 font-sans font-semibold text-[#0d222f] group-hover:text-black truncate max-w-sm border-r border-[#c2d7e4]">
                      {entry.particulars}
                    </td>
                    <td className="py-1 px-2.5 font-sans font-bold text-[#004b6e] group-hover:text-black border-r border-[#c2d7e4]">{entry.voucherType}</td>
                    <td className="py-1 px-2.5 font-bold border-r border-[#c2d7e4]">{entry.voucherNumber}</td>
                    <td className="py-1 px-2.5 text-right font-bold text-[#004b6e] group-hover:text-black border-r border-[#c2d7e4]">
                      {entry.debit ? formatINR(entry.debit) : '-'}
                    </td>
                    <td className="py-1 px-2.5 text-right font-bold text-[#a61a1a] group-hover:text-black border-r border-[#c2d7e4]">
                      {entry.credit ? formatINR(entry.credit) : '-'}
                    </td>
                    <td className="py-1 px-2.5 text-right font-bold text-[#004b6e] group-hover:text-black">
                      {formatINRWithDrCr(entry.runningBalance, entry.runningType)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-[#f0f5f8] border-t-2 border-b-4 border-double border-[#004b6e] font-black text-xs">
                <td colSpan={4} className="py-1.5 px-2.5 text-right font-sans text-[#004b6e] uppercase">
                  Current Total:
                </td>
                <td className="py-1.5 px-2.5 text-right text-[#004b6e]">
                  {formatINR(statement.totalDebit)}
                </td>
                <td className="py-1.5 px-2.5 text-right text-[#a61a1a]">
                  {formatINR(statement.totalCredit)}
                </td>
                <td className="py-1.5 px-2.5 text-right text-[#004b6e] font-bold">
                  {formatINRWithDrCr(statement.closingBalance, statement.closingType)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
