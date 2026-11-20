import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Calendar,
  Download,
  Printer,
  ChevronRight,
  TrendingUp,
  Receipt,
  Scale,
  Percent,
} from 'lucide-react';
import type { Voucher, LedgerAccount } from '@/types/accounting';
import type { Company } from '@/types/company';
import {
  computeGstSummary,
  formatINR,
  formatDate,
} from '@/services/accountingEngine';
import { downloadCSV } from '@/lib/csv';
import { InvoicePrintModal } from './InvoicePrintModal';

interface Props {
  company: Company;
  vouchers: Voucher[];
  ledgers: LedgerAccount[];
  onSelectVoucher?: (voucherId: string) => void;
  onBack?: () => void;
}

export function GstReportView({
  company,
  vouchers,
  ledgers,
  onSelectVoucher,
  onBack,
}: Props) {
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'sales' | 'purchases'>('sales');
  const [printVoucher, setPrintVoucher] = useState<Voucher | null>(null);

  const report = useMemo(() => {
    return computeGstSummary(vouchers, fromDate || undefined, toDate || undefined);
  }, [vouchers, fromDate, toDate]);

  // Filter sales and purchase vouchers
  const salesVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      if (v.voucherType !== 'Sales') return false;
      if (fromDate && v.date < fromDate) return false;
      if (toDate && v.date > toDate) return false;
      return true;
    });
  }, [vouchers, fromDate, toDate]);

  const purchaseVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      if (v.voucherType !== 'Purchase') return false;
      if (fromDate && v.date < fromDate) return false;
      if (toDate && v.date > toDate) return false;
      return true;
    });
  }, [vouchers, fromDate, toDate]);

  const printPartyLedger = useMemo(() => {
    if (!printVoucher) return null;
    const partyFromGroup = ledgers.find(
      (l) =>
        (l.groupId === 'sundry-debtors' || l.groupId === 'sundry-creditors') &&
        printVoucher.lines.some((vl) => vl.ledgerId === l.id)
    );
    if (partyFromGroup) return partyFromGroup;

    const isCrParty = printVoucher.voucherType === 'Purchase' || printVoucher.voucherType === 'Credit Note';
    const partyLine = isCrParty
      ? printVoucher.lines.find((l) => l.type === 'Cr')
      : printVoucher.lines.find((l) => l.type === 'Dr');
    return ledgers.find((l) => l.id === partyLine?.ledgerId) || null;
  }, [printVoucher, ledgers]);

  function handleExportCSV() {
    const rows: string[] = [];
    rows.push('GST Summary Report (GSTR-1 & GSTR-3B Computation)');
    rows.push(`Period: ${fromDate || 'All'} to ${toDate || 'All'}`);
    rows.push(`GSTIN: ${company.gstin}`);
    rows.push('');
    rows.push('SUPPLY CATEGORY,TAXABLE VALUE,CGST,SGST,IGST,TOTAL TAX');
    rows.push(
      `Outward Taxable Supplies (Sales),${report.outwardSupplies.taxableValue},${report.outwardSupplies.cgst},${report.outwardSupplies.sgst},${report.outwardSupplies.igst},${report.outwardSupplies.totalTax}`
    );
    rows.push(
      `Eligible ITC (Purchases),${report.inwardSupplies.taxableValue},${report.inwardSupplies.cgst},${report.inwardSupplies.sgst},${report.inwardSupplies.igst},${report.inwardSupplies.totalTax}`
    );
    rows.push(
      `Net Tax Payable / (Credit),,${report.netPayable.cgst},${report.netPayable.sgst},${report.netPayable.igst},${report.netPayable.total}`
    );

    downloadCSV(`gst-summary-${new Date().toISOString().slice(0, 10)}.csv`, rows.join('\n'));
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
            <span>Statutory &amp; Taxation</span>
            <span>›</span>
            <span className="text-[#fed843] font-bold">GST Reports</span>
          </div>
          <h1 className="text-sm font-black tracking-wide text-white uppercase flex items-center gap-2 mt-0.5">
            <span>GST Summary &amp; Tax Invoices</span>
            <span className="text-xs text-[#fed843] font-mono">
              (GSTIN: {company.gstin || 'Not Configured'})
            </span>
          </h1>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <div className="flex items-center gap-1 bg-white border border-[#8caebd] px-2 py-0.5">
            <Calendar size={12} className="text-[#004b6e]" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent text-[#0d222f] outline-none text-xs font-mono font-bold"
              placeholder="From"
            />
            <span className="text-[#4a6777] font-bold text-[10px]">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent text-[#0d222f] outline-none text-xs font-mono font-bold"
              placeholder="To"
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
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {/* 1. Output Tax */}
          <div className="bg-white border border-[#8caebd] p-2.5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-[#004b6e] uppercase tracking-wider">Output Tax (Sales)</p>
                <p className="text-lg font-black text-[#004b6e] mt-0.5 font-mono">{formatINR(report.outwardSupplies.totalTax)}</p>
              </div>
              <span className="px-1.5 py-0.2 text-[9px] font-black bg-[#fed843] text-black border border-[#00253d]">
                GSTR-1
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-[#8caebd] space-y-0.5 text-xs">
              <div className="flex justify-between text-[#0d222f] font-semibold">
                <span>Taxable Value:</span>
                <span className="font-mono">{formatINR(report.outwardSupplies.taxableValue)}</span>
              </div>
              <div className="flex justify-between text-[#4a6777] text-[10px] font-mono">
                <span>CGST: {formatINR(report.outwardSupplies.cgst)}</span>
                <span>SGST: {formatINR(report.outwardSupplies.sgst)}</span>
                <span>IGST: {formatINR(report.outwardSupplies.igst)}</span>
              </div>
            </div>
          </div>

          {/* 2. Input Tax Credit */}
          <div className="bg-white border border-[#8caebd] p-2.5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-[#a61a1a] uppercase tracking-wider">Input Tax Credit (Purchases)</p>
                <p className="text-lg font-black text-[#a61a1a] mt-0.5 font-mono">{formatINR(report.inwardSupplies.totalTax)}</p>
              </div>
              <span className="px-1.5 py-0.2 text-[9px] font-black bg-[#edf4f8] text-[#004b6e] border border-[#7ea1b5]">
                GSTR-2B
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-[#8caebd] space-y-0.5 text-xs">
              <div className="flex justify-between text-[#0d222f] font-semibold">
                <span>Taxable Value:</span>
                <span className="font-mono">{formatINR(report.inwardSupplies.taxableValue)}</span>
              </div>
              <div className="flex justify-between text-[#4a6777] text-[10px] font-mono">
                <span>CGST: {formatINR(report.inwardSupplies.cgst)}</span>
                <span>SGST: {formatINR(report.inwardSupplies.sgst)}</span>
                <span>IGST: {formatINR(report.inwardSupplies.igst)}</span>
              </div>
            </div>
          </div>

          {/* 3. Net GST Payable */}
          <div className={`p-2.5 border ${
            report.netPayable.total >= 0 ? 'bg-white border-[#8caebd]' : 'bg-[#f0fdf4] border-[#059669]'
          }`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#004b6e]">
                  {report.netPayable.total >= 0 ? 'Net Tax Payable (Challan)' : 'Net ITC Carried Forward'}
                </p>
                <p className={`text-lg font-black mt-0.5 font-mono ${report.netPayable.total >= 0 ? 'text-[#a61a1a]' : 'text-[#059669]'}`}>
                  {formatINR(Math.abs(report.netPayable.total))}
                </p>
              </div>
              <span className="px-1.5 py-0.2 text-[9px] font-black bg-[#004b6e] text-white border border-[#003859]">
                GSTR-3B
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-[#8caebd] space-y-0.5 text-xs">
              <div className="flex justify-between text-[#0d222f] font-semibold">
                <span>Output - Input ITC:</span>
                <span className="font-mono font-bold">{formatINR(report.netPayable.total)}</span>
              </div>
              <div className="flex justify-between text-[#4a6777] text-[10px] font-mono">
                <span>Net CGST: {formatINR(report.netPayable.cgst)}</span>
                <span>Net SGST: {formatINR(report.netPayable.sgst)}</span>
                <span>Net IGST: {formatINR(report.netPayable.igst)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher for Outward vs Inward Registers */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('sales')}
            className={`px-3 py-1 font-bold text-xs border transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'sales'
                ? 'bg-[#004b6e] text-[#fed843] border-[#003859] shadow-xs'
                : 'bg-white text-[#004b6e] border-[#8caebd] hover:bg-[#edf4f8]'
            }`}
          >
            <Receipt size={13} />
            <span>Outward Supplies / Sales (GSTR-1) ({salesVouchers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('purchases')}
            className={`px-3 py-1 font-bold text-xs border transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'purchases'
                ? 'bg-[#004b6e] text-[#fed843] border-[#003859] shadow-xs'
                : 'bg-white text-[#004b6e] border-[#8caebd] hover:bg-[#edf4f8]'
            }`}
          >
            <Receipt size={13} />
            <span>Inward Supplies / Purchases (GSTR-2B) ({purchaseVouchers.length})</span>
          </button>
        </div>

        {/* Sales Vouchers (Tax Invoices) Table */}
        {activeTab === 'sales' && (
          <div className="bg-white border-2 border-[#004b6e] shadow-md overflow-hidden">
            <div className="bg-[#004b6e] px-3 py-1.5 border-b border-[#003859] flex items-center justify-between text-white">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#fed843] flex items-center gap-1.5">
                <Receipt size={14} />
                Outward Supplies (Tax Invoices - GSTR-1 Register)
              </h2>
              <span className="text-[10px] text-[#c2d7e4] font-mono">
                {salesVouchers.length} Invoices recorded
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#004b6e] text-white border-b border-[#003859] text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-1.5 px-2.5 border-r border-[#003859]">Date</th>
                    <th className="py-1.5 px-2.5 border-r border-[#003859]">Invoice No</th>
                    <th className="py-1.5 px-2.5 border-r border-[#003859]">Buyer / Recipient</th>
                    <th className="py-1.5 px-2.5 text-right border-r border-[#003859]">Taxable Value</th>
                    <th className="py-1.5 px-2.5 text-right border-r border-[#003859]">CGST</th>
                    <th className="py-1.5 px-2.5 text-right border-r border-[#003859]">SGST</th>
                    <th className="py-1.5 px-2.5 text-right border-r border-[#003859]">IGST</th>
                    <th className="py-1.5 px-2.5 text-right border-r border-[#003859]">Invoice Total</th>
                    <th className="py-1.5 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c2d7e4]">
                  {salesVouchers.map((v) => {
                    const partyLine = v.lines.find((l) => l.type === 'Dr');
                    const itemLines = v.itemLines || [];
                    const taxable = itemLines.reduce((s, i) => s + Number(i.amount || 0), 0);
                    const cgst = itemLines.reduce((s, i) => s + Number(i.cgst || 0), 0);
                    const sgst = itemLines.reduce((s, i) => s + Number(i.sgst || 0), 0);
                    const igst = itemLines.reduce((s, i) => s + Number(i.igst || 0), 0);
                    const total = partyLine?.amount || taxable + cgst + sgst + igst;

                    return (
                      <tr key={v.id} className="hover:bg-[#fed843] hover:text-black transition-colors group">
                        <td className="py-1 px-2.5 font-mono border-r border-[#c2d7e4]">{formatDate(v.date)}</td>
                        <td className="py-1 px-2.5 font-mono font-bold text-[#004b6e] group-hover:text-black border-r border-[#c2d7e4]">{v.voucherNumber}</td>
                        <td className="py-1 px-2.5 font-semibold text-[#0d222f] group-hover:text-black border-r border-[#c2d7e4]">
                          {partyLine?.ledgerName || 'Cash Sale'}
                        </td>
                        <td className="py-1 px-2.5 text-right font-mono border-r border-[#c2d7e4]">{formatINR(taxable || total)}</td>
                        <td className="py-1 px-2.5 text-right font-mono border-r border-[#c2d7e4]">{formatINR(cgst)}</td>
                        <td className="py-1 px-2.5 text-right font-mono border-r border-[#c2d7e4]">{formatINR(sgst)}</td>
                        <td className="py-1 px-2.5 text-right font-mono border-r border-[#c2d7e4]">{formatINR(igst)}</td>
                        <td className="py-1 px-2.5 text-right font-mono font-bold text-[#004b6e] group-hover:text-black border-r border-[#c2d7e4]">{formatINR(total)}</td>
                        <td className="py-1 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => setPrintVoucher(v)}
                            className="px-2 py-0.5 bg-[#edf4f8] hover:bg-[#004b6e] hover:text-white text-[#004b6e] border border-[#7ea1b5] text-[10px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            <Printer size={11} />
                            <span>Tax Invoice</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {salesVouchers.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-[#4a6777] font-sans">
                        No sales tax invoices recorded in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Purchase Vouchers (Inward Tax Invoices) Table */}
        {activeTab === 'purchases' && (
          <div className="bg-white border-2 border-[#004b6e] shadow-md overflow-hidden">
            <div className="bg-[#004b6e] px-3 py-1.5 border-b border-[#003859] flex items-center justify-between text-white">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#fed843] flex items-center gap-1.5">
                <Receipt size={14} />
                Inward Supplies (Eligible ITC - GSTR-2B Register)
              </h2>
              <span className="text-[10px] text-[#c2d7e4] font-mono">
                {purchaseVouchers.length} Inward Invoices recorded
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#004b6e] text-white border-b border-[#003859] text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-1.5 px-2.5 border-r border-[#003859]">Date</th>
                    <th className="py-1.5 px-2.5 border-r border-[#003859]">Voucher / Ref No</th>
                    <th className="py-1.5 px-2.5 border-r border-[#003859]">Supplier / Vendor</th>
                    <th className="py-1.5 px-2.5 text-right border-r border-[#003859]">Taxable Value</th>
                    <th className="py-1.5 px-2.5 text-right border-r border-[#003859]">Input CGST</th>
                    <th className="py-1.5 px-2.5 text-right border-r border-[#003859]">Input SGST</th>
                    <th className="py-1.5 px-2.5 text-right border-r border-[#003859]">Input IGST</th>
                    <th className="py-1.5 px-2.5 text-right border-r border-[#003859]">Total Value</th>
                    <th className="py-1.5 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c2d7e4]">
                  {purchaseVouchers.map((v) => {
                    const partyLine = v.lines.find((l) => l.type === 'Cr');
                    const itemLines = v.itemLines || [];
                    const taxable = itemLines.reduce((s, i) => s + Number(i.amount || 0), 0);
                    const cgst = itemLines.reduce((s, i) => s + Number(i.cgst || 0), 0);
                    const sgst = itemLines.reduce((s, i) => s + Number(i.sgst || 0), 0);
                    const igst = itemLines.reduce((s, i) => s + Number(i.igst || 0), 0);
                    const total = partyLine?.amount || taxable + cgst + sgst + igst;

                    return (
                      <tr key={v.id} className="hover:bg-[#fed843] hover:text-black transition-colors group">
                        <td className="py-1 px-2.5 font-mono border-r border-[#c2d7e4]">{formatDate(v.date)}</td>
                        <td className="py-1 px-2.5 font-mono font-bold text-[#004b6e] group-hover:text-black border-r border-[#c2d7e4]">
                          {v.voucherNumber} {v.referenceNo ? `(${v.referenceNo})` : ''}
                        </td>
                        <td className="py-1 px-2.5 font-semibold text-[#0d222f] group-hover:text-black border-r border-[#c2d7e4]">
                          {partyLine?.ledgerName || 'Cash Purchase'}
                        </td>
                        <td className="py-1 px-2.5 text-right font-mono border-r border-[#c2d7e4]">{formatINR(taxable || total)}</td>
                        <td className="py-1 px-2.5 text-right font-mono border-r border-[#c2d7e4]">{formatINR(cgst)}</td>
                        <td className="py-1 px-2.5 text-right font-mono border-r border-[#c2d7e4]">{formatINR(sgst)}</td>
                        <td className="py-1 px-2.5 text-right font-mono border-r border-[#c2d7e4]">{formatINR(igst)}</td>
                        <td className="py-1 px-2.5 text-right font-mono font-bold text-[#004b6e] group-hover:text-black border-r border-[#c2d7e4]">{formatINR(total)}</td>
                        <td className="py-1 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => setPrintVoucher(v)}
                            className="px-2 py-0.5 bg-[#edf4f8] hover:bg-[#004b6e] hover:text-white text-[#004b6e] border border-[#7ea1b5] text-[10px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            <Printer size={11} />
                            <span>View / Print</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {purchaseVouchers.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-[#4a6777] font-sans">
                        No purchase invoices recorded in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Invoice Print Modal */}
        {printVoucher && (
          <InvoicePrintModal
            open={Boolean(printVoucher)}
            voucher={printVoucher}
            company={company}
            partyLedger={printPartyLedger}
            onClose={() => setPrintVoucher(null)}
          />
        )}
      </div>
    </div>
  );
}
