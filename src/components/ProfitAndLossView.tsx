import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Calendar,
  Download,
  Printer,
  ChevronRight,
  Scale,
} from 'lucide-react';
import type { LedgerAccount, Voucher } from '@/types/accounting';
import type { StockItem } from '@/types/inventory';
import {
  computeProfitAndLoss,
  formatINR,
  formatDate,
} from '@/services/accountingEngine';
import { downloadCSV } from '@/lib/csv';

interface Props {
  ledgers: LedgerAccount[];
  vouchers: Voucher[];
  stockItems: StockItem[];
  onSelectLedger?: (ledgerId: string) => void;
  onOpenStockSummary?: () => void;
  onBack?: () => void;
}

export function ProfitAndLossView({
  ledgers,
  vouchers,
  stockItems,
  onSelectLedger,
  onOpenStockSummary,
  onBack,
}: Props) {
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const report = useMemo(() => {
    return computeProfitAndLoss(ledgers, vouchers, stockItems, fromDate || undefined, toDate || undefined);
  }, [ledgers, vouchers, stockItems, fromDate, toDate]);

  function handleExportCSV() {
    const rows: string[] = [];
    rows.push('Profit & Loss Statement (Trading & P&L)');
    rows.push(`Period: ${fromDate || 'From Beginning'} to ${toDate || 'Today'}`);
    rows.push('');
    rows.push('PARTICULARS (EXPENSES / DEBIT),AMOUNT (INR),PARTICULARS (INCOME / CREDIT),AMOUNT (INR)');

    rows.push(`Opening Stock,${report.openingStock},Sales,${report.totalSales}`);
    for (const p of report.purchases) {
      rows.push(`Purchase: ${p.name},${p.amount},,`);
    }
    for (const d of report.directExpenses) {
      rows.push(`Direct Exp: ${d.name},${d.amount},,`);
    }
    for (const s of report.sales) {
      rows.push(`,,Sales: ${s.name},${s.amount}`);
    }
    rows.push(`,,Closing Stock,${report.closingStock}`);
    if (report.isGrossProfit) {
      rows.push(`Gross Profit c/f,${report.grossProfit},,`);
    } else {
      rows.push(`,,Gross Loss c/f,${report.grossLoss}`);
    }

    rows.push('');
    rows.push('--- INDIRECT EXPENSES & INCOMES ---,,,');
    for (const indExp of report.indirectExpenses) {
      rows.push(`${indExp.name},${indExp.amount},,`);
    }
    for (const indInc of report.indirectIncomes) {
      rows.push(`,,${indInc.name},${indInc.amount}`);
    }
    if (report.isNetProfit) {
      rows.push(`NET PROFIT,${report.netProfit},,`);
    } else {
      rows.push(`,,NET LOSS,${report.netLoss}`);
    }

    downloadCSV(`profit-and-loss-${new Date().toISOString().slice(0, 10)}.csv`, rows.join('\n'));
  }

  function handlePrint() {
    window.print();
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
            <span>Reports</span>
            <span>›</span>
            <span className="text-[#fed843] font-bold">Profit &amp; Loss A/c</span>
          </div>
          <h1 className="text-sm font-black tracking-wide text-white uppercase flex items-center gap-2 mt-0.5">
            <span>Profit &amp; Loss Statement</span>
            <span className="text-xs text-[#fed843] font-mono">
              (For 1-Apr-2026 to 31-Mar-2027)
            </span>
          </h1>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <div className="flex items-center gap-1 bg-white border border-[#8caebd] px-2 py-0.5 text-[#0d222f]">
            <Calendar size={12} className="text-[#004b6e]" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent text-[#0d222f] outline-none text-xs font-mono font-bold"
            />
            <span className="text-[#4a6777] font-bold text-[10px]">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
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

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#edf4f8] hover:bg-[#fed843] hover:text-black border border-[#7ea1b5] text-[#004b6e] font-bold transition-colors cursor-pointer"
          >
            <Printer size={12} />
            <span>Print</span>
          </button>
        </div>
      </div>

      <div className="py-2 space-y-2 max-w-6xl w-full mx-auto">
        {/* KPI Highlights Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-white border border-[#8caebd] p-2">
            <p className="text-[10px] font-bold text-[#004b6e] uppercase tracking-wider">Gross Sales</p>
            <p className="text-base font-black text-[#004b6e] mt-0.5 font-mono">{formatINR(report.totalSales)}</p>
            <p className="text-[9px] text-[#4a6777]">{report.sales.length} Sales Accounts</p>
          </div>

          <div className="bg-white border border-[#8caebd] p-2">
            <p className="text-[10px] font-bold text-[#004b6e] uppercase tracking-wider">Purchases</p>
            <p className="text-base font-black text-[#a61a1a] mt-0.5 font-mono">{formatINR(report.totalPurchases)}</p>
            <p className="text-[9px] text-[#4a6777]">{report.purchases.length} Purchase Accounts</p>
          </div>

          <div className="bg-white border border-[#8caebd] p-2">
            <p className="text-[10px] font-bold text-[#004b6e] uppercase tracking-wider">Gross Profit</p>
            <p className={`text-base font-black mt-0.5 font-mono ${report.isGrossProfit ? 'text-[#059669]' : 'text-[#a61a1a]'}`}>
              {formatINR(report.isGrossProfit ? report.grossProfit : report.grossLoss)}
            </p>
            <p className="text-[9px] text-[#4a6777]">
              {report.isGrossProfit ? 'Trading Surplus' : 'Trading Deficit'}
            </p>
          </div>

          <div className={`border p-2 ${
            report.isNetProfit ? 'bg-[#f0fdf4] border-[#059669]' : 'bg-[#fff1f2] border-[#a61a1a]'
          }`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#004b6e]">Net Profit / (Loss)</p>
            <p className={`text-base font-black mt-0.5 font-mono ${report.isNetProfit ? 'text-[#059669]' : 'text-[#a61a1a]'}`}>
              {formatINR(report.isNetProfit ? report.netProfit : report.netLoss)}
            </p>
            <p className="text-[9px] text-[#4a6777]">
              {report.isNetProfit ? 'Transferred to Capital' : 'Deducted from Capital'}
            </p>
          </div>
        </div>

        {/* 1. TRADING ACCOUNT (GROSS PROFIT CALCULATION) */}
        <div className="bg-white border-2 border-[#004b6e] shadow-md overflow-hidden">
          <div className="bg-[#004b6e] text-white px-3 py-1.5 border-b border-[#003859] flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#fed843] flex items-center gap-1.5">
              <Scale size={14} />
              Trading Account (Direct Incomes &amp; Direct Expenses)
            </h2>
            <span className="text-[10px] text-[#c2d7e4] font-mono hidden sm:inline">
              Gross Profit = (Sales + Closing Stock) - (Opening Stock + Purchases + Direct Expenses)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#8caebd]">
            {/* Debit Side: Opening Stock + Purchases + Direct Expenses */}
            <div className="p-2 space-y-1.5 text-xs">
              <div className="font-bold text-[#a61a1a] pb-1 border-b border-[#8caebd] flex justify-between uppercase text-[10px]">
                <span>Particulars (Debit / Expense)</span>
                <span>Amount (INR)</span>
              </div>

              {/* Opening Stock */}
              <div
                onClick={onOpenStockSummary}
                className="flex items-center justify-between py-1 px-1.5 hover:bg-[#fed843] hover:text-black cursor-pointer transition-colors"
              >
                <div>
                  <p className="font-semibold">Opening Stock</p>
                  <p className="text-[9px] text-[#4a6777]">Valuation at FY start</p>
                </div>
                <span className="font-mono font-bold">{formatINR(report.openingStock)}</span>
              </div>

              {/* Purchases */}
              {report.purchases.map((p) => (
                <div
                  key={p.ledgerId}
                  onClick={() => onSelectLedger?.(p.ledgerId)}
                  className="flex items-center justify-between py-0.5 px-1.5 hover:bg-[#fed843] hover:text-black cursor-pointer transition-colors"
                >
                  <span className="truncate pr-2 font-medium">{p.name}</span>
                  <span className="font-mono font-bold text-[#004b6e]">{formatINR(p.amount)}</span>
                </div>
              ))}

              {/* Direct Expenses */}
              {report.directExpenses.map((d) => (
                <div
                  key={d.ledgerId}
                  onClick={() => onSelectLedger?.(d.ledgerId)}
                  className="flex items-center justify-between py-0.5 px-1.5 hover:bg-[#fed843] hover:text-black cursor-pointer transition-colors"
                >
                  <span className="truncate pr-2">{d.name}</span>
                  <span className="font-mono font-bold text-[#004b6e]">{formatINR(d.amount)}</span>
                </div>
              ))}

              {/* Gross Profit c/f */}
              {report.isGrossProfit && (
                <div className="flex items-center justify-between py-1 px-1.5 bg-[#f0fdf4] font-bold text-[#059669] border border-[#059669]/30 mt-1">
                  <span>Gross Profit c/f to P&amp;L</span>
                  <span className="font-mono">{formatINR(report.grossProfit)}</span>
                </div>
              )}

              <div className="pt-2 border-t-2 border-b-4 border-double border-[#004b6e] flex justify-between font-black text-xs text-[#004b6e]">
                <span>Total Trading Debit</span>
                <span className="font-mono">
                  {formatINR(report.totalTradingDebit + (report.isGrossProfit ? report.grossProfit : 0))}
                </span>
              </div>
            </div>

            {/* Credit Side: Sales + Direct Incomes + Closing Stock */}
            <div className="p-2 space-y-1.5 text-xs">
              <div className="font-bold text-[#059669] pb-1 border-b border-[#8caebd] flex justify-between uppercase text-[10px]">
                <span>Particulars (Credit / Revenue)</span>
                <span>Amount (INR)</span>
              </div>

              {/* Sales Ledgers */}
              {report.sales.map((s) => (
                <div
                  key={s.ledgerId}
                  onClick={() => onSelectLedger?.(s.ledgerId)}
                  className="flex items-center justify-between py-0.5 px-1.5 hover:bg-[#fed843] hover:text-black cursor-pointer transition-colors"
                >
                  <span className="truncate pr-2 font-medium">{s.name}</span>
                  <span className="font-mono font-bold text-[#004b6e]">{formatINR(s.amount)}</span>
                </div>
              ))}

              {/* Direct Incomes */}
              {report.directIncomes.map((di) => (
                <div
                  key={di.ledgerId}
                  onClick={() => onSelectLedger?.(di.ledgerId)}
                  className="flex items-center justify-between py-0.5 px-1.5 hover:bg-[#fed843] hover:text-black cursor-pointer transition-colors"
                >
                  <span className="truncate pr-2">{di.name}</span>
                  <span className="font-mono font-bold text-[#004b6e]">{formatINR(di.amount)}</span>
                </div>
              ))}

              {/* Closing Stock */}
              <div
                onClick={onOpenStockSummary}
                className="flex items-center justify-between py-1 px-1.5 hover:bg-[#fed843] hover:text-black cursor-pointer transition-colors"
              >
                <div>
                  <p className="font-semibold">Closing Stock</p>
                  <p className="text-[9px] text-[#4a6777]">Weighted average valuation</p>
                </div>
                <span className="font-mono font-bold text-[#059669]">{formatINR(report.closingStock)}</span>
              </div>

              {/* Gross Loss c/f */}
              {!report.isGrossProfit && report.grossLoss > 0 && (
                <div className="flex items-center justify-between py-1 px-1.5 bg-[#fff1f2] font-bold text-[#a61a1a] border border-[#a61a1a]/30 mt-1">
                  <span>Gross Loss c/f to P&amp;L</span>
                  <span className="font-mono">{formatINR(report.grossLoss)}</span>
                </div>
              )}

              <div className="pt-2 border-t-2 border-b-4 border-double border-[#004b6e] flex justify-between font-black text-xs text-[#004b6e]">
                <span>Total Trading Credit</span>
                <span className="font-mono">
                  {formatINR(report.totalTradingCredit + (!report.isGrossProfit ? report.grossLoss : 0))}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. PROFIT & LOSS ACCOUNT (NET PROFIT CALCULATION) */}
        <div className="bg-white border-2 border-[#004b6e] shadow-md overflow-hidden">
          <div className="bg-[#004b6e] text-white px-3 py-1.5 border-b border-[#003859] flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#fed843] flex items-center gap-1.5">
              <TrendingUp size={14} />
              Profit &amp; Loss Account (Indirect Expenses &amp; Incomes)
            </h2>
            <span className="text-[10px] text-[#c2d7e4] font-mono hidden sm:inline">
              Net Profit = (Gross Profit + Indirect Incomes) - Indirect Expenses
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#8caebd]">
            {/* Debit Side: Indirect Expenses */}
            <div className="p-2 space-y-1.5 text-xs">
              <div className="font-bold text-[#a61a1a] pb-1 border-b border-[#8caebd] flex justify-between uppercase text-[10px]">
                <span>Particulars (Debit / Overhead)</span>
                <span>Amount (INR)</span>
              </div>

              {/* Gross Loss b/f */}
              {!report.isGrossProfit && report.grossLoss > 0 && (
                <div className="flex items-center justify-between py-1 px-1.5 bg-[#fff1f2] text-[#a61a1a] font-bold">
                  <span>Gross Loss b/f</span>
                  <span className="font-mono">{formatINR(report.grossLoss)}</span>
                </div>
              )}

              {/* Indirect Expenses */}
              {report.indirectExpenses.map((exp) => (
                <div
                  key={exp.ledgerId}
                  onClick={() => onSelectLedger?.(exp.ledgerId)}
                  className="flex items-center justify-between py-0.5 px-1.5 hover:bg-[#fed843] hover:text-black cursor-pointer transition-colors"
                >
                  <span className="truncate pr-2">{exp.name}</span>
                  <span className="font-mono font-bold text-[#004b6e]">{formatINR(exp.amount)}</span>
                </div>
              ))}

              {/* Net Profit */}
              {report.isNetProfit && (
                <div className="flex items-center justify-between py-1 px-1.5 bg-[#f0fdf4] font-bold text-[#059669] border border-[#059669]/30 mt-1">
                  <span>Nett Profit (Transferred to Capital)</span>
                  <span className="font-mono">{formatINR(report.netProfit)}</span>
                </div>
              )}

              <div className="pt-2 border-t-2 border-b-4 border-double border-[#004b6e] flex justify-between font-black text-xs text-[#004b6e]">
                <span>Total P&amp;L Debit</span>
                <span className="font-mono">
                  {formatINR(report.totalPnLDebit + (report.isNetProfit ? report.netProfit : 0))}
                </span>
              </div>
            </div>

            {/* Credit Side: Gross Profit b/f + Indirect Incomes */}
            <div className="p-2 space-y-1.5 text-xs">
              <div className="font-bold text-[#059669] pb-1 border-b border-[#8caebd] flex justify-between uppercase text-[10px]">
                <span>Particulars (Credit / Income)</span>
                <span>Amount (INR)</span>
              </div>

              {/* Gross Profit b/f */}
              {report.isGrossProfit && (
                <div className="flex items-center justify-between py-1 px-1.5 bg-[#f0fdf4] text-[#059669] font-bold">
                  <span>Gross Profit b/f</span>
                  <span className="font-mono">{formatINR(report.grossProfit)}</span>
                </div>
              )}

              {/* Indirect Incomes */}
              {report.indirectIncomes.map((inc) => (
                <div
                  key={inc.ledgerId}
                  onClick={() => onSelectLedger?.(inc.ledgerId)}
                  className="flex items-center justify-between py-0.5 px-1.5 hover:bg-[#fed843] hover:text-black cursor-pointer transition-colors"
                >
                  <span className="truncate pr-2">{inc.name}</span>
                  <span className="font-mono font-bold text-[#004b6e]">{formatINR(inc.amount)}</span>
                </div>
              ))}

              {/* Net Loss */}
              {!report.isNetProfit && report.netLoss > 0 && (
                <div className="flex items-center justify-between py-1 px-1.5 bg-[#fff1f2] font-bold text-[#a61a1a] border border-[#a61a1a]/30 mt-1">
                  <span>Nett Loss (Deducted from Capital)</span>
                  <span className="font-mono">{formatINR(report.netLoss)}</span>
                </div>
              )}

              <div className="pt-2 border-t-2 border-b-4 border-double border-[#004b6e] flex justify-between font-black text-xs text-[#004b6e]">
                <span>Total P&amp;L Credit</span>
                <span className="font-mono">
                  {formatINR(report.totalPnLCredit + (!report.isNetProfit ? report.netLoss : 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
