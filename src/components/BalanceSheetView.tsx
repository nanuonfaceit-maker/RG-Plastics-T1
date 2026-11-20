import React, { useState, useMemo } from 'react';
import {
  Scale,
  Calendar,
  Download,
  Printer,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Building2,
  Wallet,
} from 'lucide-react';
import type { LedgerAccount, Voucher } from '@/types/accounting';
import type { StockItem } from '@/types/inventory';
import {
  computeBalanceSheet,
  formatINR,
  formatDate,
  todayISO,
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

export function BalanceSheetView({
  ledgers,
  vouchers,
  stockItems,
  onSelectLedger,
  onOpenStockSummary,
  onBack,
}: Props) {
  const [asOfDate, setAsOfDate] = useState<string>(todayISO());

  const report = useMemo(() => {
    return computeBalanceSheet(ledgers, vouchers, stockItems, undefined, asOfDate || undefined);
  }, [ledgers, vouchers, stockItems, asOfDate]);

  function handleExportCSV() {
    const rows: string[] = [];
    rows.push('Balance Sheet');
    rows.push(`As on: ${asOfDate || 'Today'}`);
    rows.push('');
    rows.push('LIABILITIES & CAPITAL,AMOUNT (INR),ASSETS,AMOUNT (INR)');

    rows.push(`Capital Accounts,${report.capitalAccounts.total},Fixed Assets,${report.fixedAssets.total}`);
    for (const c of report.capitalAccounts.items) {
      rows.push(`  ${c.name},${c.amount},,`);
    }

    rows.push(`Reserves & Surplus,${report.reservesAndSurplus.total},Investments,${report.investments.total}`);
    rows.push(`  Profit & Loss A/c (Net Profit),${report.netProfitOrLoss},,`);
    for (const r of report.reservesAndSurplus.items) {
      rows.push(`  ${r.name},${r.amount},,`);
    }

    if (report.loansLiability.total > 0) {
      rows.push(`Loans (Liability),${report.loansLiability.total},,`);
      for (const l of report.loansLiability.items) {
        rows.push(`  ${l.name},${l.amount},,`);
      }
    }

    rows.push(`Current Liabilities,${report.currentLiabilities.total},Current Assets,${report.currentAssets.total}`);
    for (const cl of report.currentLiabilities.items) {
      rows.push(`  ${cl.name},${cl.amount},,`);
    }
    for (const ca of report.currentAssets.items) {
      rows.push(`  ,,${ca.name},${ca.amount}`);
    }

    rows.push('');
    rows.push(`TOTAL LIABILITIES,${report.totalLiabilities},TOTAL ASSETS,${report.totalAssets}`);
    rows.push(`Balanced?,${report.isBalanced ? 'YES' : 'NO'},Difference,${report.difference}`);

    downloadCSV(`balance-sheet-${asOfDate}.csv`, rows.join('\n'));
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
            <span className="text-[#fed843] font-bold">Balance Sheet</span>
          </div>
          <h1 className="text-sm font-black tracking-wide text-white uppercase flex items-center gap-2 mt-0.5">
            <span>Balance Sheet</span>
            <span className="text-xs text-[#fed843] font-mono">
              (As on: {formatDate(asOfDate)})
            </span>
          </h1>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <div className="flex items-center gap-1 bg-white border border-[#8caebd] px-2 py-0.5 text-[#0d222f]">
            <Calendar size={12} className="text-[#004b6e]" />
            <span className="text-[10px] font-bold uppercase text-[#004b6e]">As on:</span>
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
        {/* Status indicator bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#f0f5f8] border border-[#8caebd] p-2 text-xs">
          <div className="flex items-center gap-2">
            {report.isBalanced ? (
              <div className="flex items-center justify-center w-5 h-5 bg-[#10b981] text-white font-bold">
                ✓
              </div>
            ) : (
              <div className="flex items-center justify-center w-5 h-5 bg-[#a61a1a] text-white font-bold">
                !
              </div>
            )}
            <div>
              <p className="text-xs font-bold text-[#004b6e]">
                {report.isBalanced ? 'Double-Entry Perfectly Balanced' : 'Imbalance Detected'}
              </p>
              <p className="text-[10px] text-[#4a6777]">
                {report.isBalanced
                  ? 'Total Assets exactly match Total Liabilities and Capital.'
                  : `Variance of ${formatINR(report.difference)} between Assets and Liabilities.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-[#4a6777] block text-[9px] uppercase">Total Liabilities</span>
              <span className="text-xs font-bold text-[#004b6e]">{formatINR(report.totalLiabilities)}</span>
            </div>
            <div className="h-5 w-px bg-[#8caebd]" />
            <div>
              <span className="text-[#4a6777] block text-[9px] uppercase">Total Assets</span>
              <span className="text-xs font-bold text-[#059669]">{formatINR(report.totalAssets)}</span>
            </div>
          </div>
        </div>

        {/* T-Shape Classical Tally Split Table */}
        <div className="bg-white border-2 border-[#004b6e] shadow-md overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#8caebd]">
            {/* 1. LIABILITIES & CAPITAL SIDE (LEFT) */}
            <div className="flex flex-col h-full">
              <div className="bg-[#004b6e] text-white px-3 py-1.5 border-b border-[#003859] flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-wider text-[#fed843]">
                  Liabilities &amp; Capital
                </h2>
                <span className="text-xs font-bold text-white font-mono">
                  {formatINR(report.totalLiabilities)}
                </span>
              </div>

              <div className="p-2 space-y-3 flex-1 text-xs">
                {/* 1.1 Capital Account */}
                <div>
                  <div className="flex justify-between items-center font-bold text-[#004b6e] pb-0.5 border-b border-[#c2d7e4]">
                    <span>Capital Account</span>
                    <span className="font-mono">{formatINR(report.capitalAccounts.total)}</span>
                  </div>
                  <div className="mt-0.5 space-y-0.5">
                    {report.capitalAccounts.items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => onSelectLedger?.(item.id)}
                        className="flex items-center justify-between py-0.5 px-1.5 hover:bg-[#fed843] hover:text-black cursor-pointer transition-colors"
                      >
                        <span className="pl-2 truncate">{item.name}</span>
                        <span className="font-mono">{formatINR(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 1.2 Reserves & Surplus / P&L Net Profit */}
                <div>
                  <div className="flex justify-between items-center font-bold text-[#004b6e] pb-0.5 border-b border-[#c2d7e4]">
                    <span>Reserves &amp; Surplus</span>
                    <span className="font-mono">{formatINR(report.reservesAndSurplus.total)}</span>
                  </div>
                  <div className="mt-0.5 space-y-0.5">
                    <div className="flex items-center justify-between py-0.5 px-1.5 bg-[#f0fdf4] font-semibold text-[#059669]">
                      <span className="pl-2">Profit &amp; Loss A/c (Current Period Net Profit)</span>
                      <span className="font-mono font-bold">{formatINR(report.netProfitOrLoss)}</span>
                    </div>

                    {report.reservesAndSurplus.items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => onSelectLedger?.(item.id)}
                        className="flex items-center justify-between py-0.5 px-1.5 hover:bg-[#fed843] hover:text-black cursor-pointer transition-colors"
                      >
                        <span className="pl-2 truncate">{item.name}</span>
                        <span className="font-mono">{formatINR(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 1.3 Loans (Liability) */}
                {report.loansLiability.total > 0 && (
                  <div>
                    <div className="flex justify-between items-center font-bold text-[#004b6e] pb-0.5 border-b border-[#c2d7e4]">
                      <span>Loans (Liability)</span>
                      <span className="font-mono">{formatINR(report.loansLiability.total)}</span>
                    </div>
                    <div className="mt-0.5 space-y-0.5">
                      {report.loansLiability.items.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => onSelectLedger?.(item.id)}
                          className="flex items-center justify-between py-0.5 px-1.5 hover:bg-[#fed843] hover:text-black cursor-pointer transition-colors"
                        >
                          <span className="pl-2 truncate">{item.name}</span>
                          <span className="font-mono">{formatINR(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 1.4 Current Liabilities */}
                <div>
                  <div className="flex justify-between items-center font-bold text-[#004b6e] pb-0.5 border-b border-[#c2d7e4]">
                    <span>Current Liabilities</span>
                    <span className="font-mono">{formatINR(report.currentLiabilities.total)}</span>
                  </div>
                  <div className="mt-0.5 space-y-0.5">
                    {report.currentLiabilities.items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => onSelectLedger?.(item.id)}
                        className="flex items-center justify-between py-0.5 px-1.5 hover:bg-[#fed843] hover:text-black cursor-pointer transition-colors"
                      >
                        <span className="pl-2 truncate">{item.name}</span>
                        <span className="font-mono">{formatINR(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Liabilities Footer Total */}
              <div className="p-2 bg-[#f0f5f8] border-t-2 border-b-4 border-double border-[#004b6e] flex justify-between items-center font-black text-xs text-[#004b6e]">
                <span className="uppercase tracking-wider">Total</span>
                <span className="font-mono text-sm">{formatINR(report.totalLiabilities)}</span>
              </div>
            </div>

            {/* 2. ASSETS SIDE (RIGHT) */}
            <div className="flex flex-col h-full">
              <div className="bg-[#004b6e] text-white px-3 py-1.5 border-b border-[#003859] flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-wider text-[#fed843]">
                  Assets
                </h2>
                <span className="text-xs font-bold text-white font-mono">
                  {formatINR(report.totalAssets)}
                </span>
              </div>

              <div className="p-2 space-y-3 flex-1 text-xs">
                {/* 2.1 Fixed Assets */}
                <div>
                  <div className="flex justify-between items-center font-bold text-[#004b6e] pb-0.5 border-b border-[#c2d7e4]">
                    <span>Fixed Assets</span>
                    <span className="font-mono">{formatINR(report.fixedAssets.total)}</span>
                  </div>
                  <div className="mt-0.5 space-y-0.5">
                    {report.fixedAssets.items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => onSelectLedger?.(item.id)}
                        className="flex items-center justify-between py-0.5 px-1.5 hover:bg-[#fed843] hover:text-black cursor-pointer transition-colors"
                      >
                        <span className="pl-2 truncate">{item.name}</span>
                        <span className="font-mono">{formatINR(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2.2 Investments */}
                {report.investments.total > 0 && (
                  <div>
                    <div className="flex justify-between items-center font-bold text-[#004b6e] pb-0.5 border-b border-[#c2d7e4]">
                      <span>Investments</span>
                      <span className="font-mono">{formatINR(report.investments.total)}</span>
                    </div>
                    <div className="mt-0.5 space-y-0.5">
                      {report.investments.items.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => onSelectLedger?.(item.id)}
                          className="flex items-center justify-between py-0.5 px-1.5 hover:bg-[#fed843] hover:text-black cursor-pointer transition-colors"
                        >
                          <span className="pl-2 truncate">{item.name}</span>
                          <span className="font-mono">{formatINR(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2.3 Current Assets */}
                <div>
                  <div className="flex justify-between items-center font-bold text-[#004b6e] pb-0.5 border-b border-[#c2d7e4]">
                    <span>Current Assets</span>
                    <span className="font-mono">{formatINR(report.currentAssets.total)}</span>
                  </div>
                  <div className="mt-0.5 space-y-0.5">
                    {report.currentAssets.items.map((item) => {
                      const isClosingStock = item.id === 'closing-stock-asset';
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (isClosingStock) onOpenStockSummary?.();
                            else onSelectLedger?.(item.id);
                          }}
                          className="flex items-center justify-between py-0.5 px-1.5 hover:bg-[#fed843] hover:text-black cursor-pointer transition-colors"
                        >
                          <span className="pl-2 truncate font-semibold">{item.name}</span>
                          <span className="font-mono font-bold text-[#004b6e]">{formatINR(item.amount)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Assets Footer Total */}
              <div className="p-2 bg-[#f0f5f8] border-t-2 border-b-4 border-double border-[#004b6e] flex justify-between items-center font-black text-xs text-[#004b6e]">
                <span className="uppercase tracking-wider">Total</span>
                <span className="font-mono text-sm">{formatINR(report.totalAssets)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
