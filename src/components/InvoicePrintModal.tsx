import React from 'react';
import { Printer, Share2, X, Download, Building2, Check } from 'lucide-react';
import type { Company } from '@/types/company';
import type { Voucher, LedgerAccount } from '@/types/accounting';
import { formatINR, formatDate } from '@/services/accountingEngine';

interface Props {
  open: boolean;
  onClose: () => void;
  voucher: Voucher | null;
  company: Company;
  partyLedger?: LedgerAccount | null;
}

// Convert numbers to Indian Rupees in words
function numberToWordsINR(amount: number): string {
  const n = Math.floor(amount);
  if (n === 0) return 'Zero Rupees Only';

  const units = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertBelowThousand(num: number): string {
    let str = '';
    if (num >= 100) {
      str += units[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    if (num >= 20) {
      str += tens[Math.floor(num / 10)] + ' ';
      num %= 10;
    }
    if (num > 0) {
      str += units[num] + ' ';
    }
    return str.trim();
  }

  let words = '';
  const crore = Math.floor(n / 10000000);
  let rem = n % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem %= 100000;
  const thousand = Math.floor(rem / 1000);
  rem %= 1000;

  if (crore > 0) words += convertBelowThousand(crore) + ' Crore ';
  if (lakh > 0) words += convertBelowThousand(lakh) + ' Lakh ';
  if (thousand > 0) words += convertBelowThousand(thousand) + ' Thousand ';
  if (rem > 0) words += convertBelowThousand(rem);

  return `${words.trim()} Rupees Only`;
}

export function InvoicePrintModal({
  open,
  onClose,
  voucher,
  company,
  partyLedger,
}: Props) {
  if (!open || !voucher) return null;

  const isInterState =
    partyLedger?.state &&
    company.state &&
    partyLedger.state.trim().toLowerCase() !== company.state.trim().toLowerCase();

  // Calculate invoice item totals
  const itemLines = voucher.itemLines || [];
  const taxableTotal = itemLines.reduce((s, i) => s + Number(i.amount || 0), 0);
  const cgstTotal = itemLines.reduce((s, i) => s + Number(i.cgst || 0), 0);
  const sgstTotal = itemLines.reduce((s, i) => s + Number(i.sgst || 0), 0);
  const igstTotal = itemLines.reduce((s, i) => s + Number(i.igst || 0), 0);
  const taxTotal = cgstTotal + sgstTotal + igstTotal;
  const grandTotal = taxableTotal + taxTotal || voucher.lines.reduce((s, l) => (l.type === 'Dr' ? s + l.amount : s), 0);

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `GST Tax Invoice - ${voucher?.voucherNumber}`,
          text: `Invoice #${voucher?.voucherNumber} from ${company.name} for ${partyLedger?.name || 'Customer'}. Total Amount: ${formatINR(grandTotal)}.`,
          url: window.location.href,
        });
      } catch {
        /* User cancelled or not supported */
      }
    } else {
      // Fallback copy to clipboard
      navigator.clipboard.writeText(
        `Invoice #${voucher?.voucherNumber} from ${company.name} to ${partyLedger?.name || 'Customer'}: Total ${formatINR(grandTotal)}`
      );
      alert('Invoice summary copied to clipboard!');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 select-none overflow-y-auto">
      <div className="bg-white text-slate-900 border-2 border-[#004b6e] shadow-2xl max-w-4xl w-full my-auto overflow-hidden font-sans print:p-0 print:border-none print:shadow-none print:m-0 print:w-full">
        {/* Action Toolbar (Hidden in Print) */}
        <div className="bg-[#004b6e] text-white px-3 py-1.5 flex items-center justify-between border-b border-[#003859] print:hidden">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-[#fed843]" />
            <span className="font-bold text-xs uppercase tracking-wider text-white">
              Tally Tax Invoice Preview — {voucher.voucherNumber}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#003859] text-white hover:bg-[#fed843] hover:text-black border border-[#7ea1b5] font-bold transition-colors cursor-pointer"
            >
              <Share2 size={13} />
              <span>Share</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#fed843] text-[#00253d] hover:bg-[#ffe570] font-bold border border-[#c99a00] shadow-xs transition-colors cursor-pointer"
            >
              <Printer size={13} />
              <span>Print / Save PDF (Ctrl+P)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-white hover:text-[#fed843] font-bold cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Invoice Page */}
        <div className="p-6 text-[11px] leading-tight font-sans border-t border-gray-200">
          {/* 1. Header & Title */}
          <div className="text-center pb-2 border-b-2 border-gray-900">
            <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500">
              Tax Invoice (Under Section 31 of CGST Act)
            </p>
            <h1 className="text-xl font-bold uppercase tracking-tight text-gray-900">{company.name}</h1>
            {company.tradeName && <p className="text-xs font-semibold text-gray-700">{company.tradeName}</p>}
            <p className="text-gray-600 mt-0.5">{company.address}, {company.city}, {company.state} - Code: {company.stateCode}</p>
            <p className="font-mono text-xs font-semibold text-gray-800 mt-0.5">
              GSTIN: <span className="font-bold">{company.gstin}</span> | PAN: {company.pan}
            </p>
            <p className="text-gray-500 text-[10px]">Phone: {company.phone} | Email: {company.email}</p>
          </div>

          {/* 2. Invoice & Buyer Meta Grid */}
          <div className="grid grid-cols-2 border-b border-gray-800 py-2.5 text-xs">
            {/* Invoice Meta */}
            <div className="space-y-1 pr-3 border-r border-gray-300">
              <p><span className="font-semibold text-gray-600">Invoice No:</span> <span className="font-bold font-mono text-gray-900">{voucher.voucherNumber}</span></p>
              <p><span className="font-semibold text-gray-600">Invoice Date:</span> <span className="font-medium font-mono">{formatDate(voucher.date)}</span></p>
              {voucher.referenceNo && (
                <p><span className="font-semibold text-gray-600">Ref / Order No:</span> <span className="font-mono">{voucher.referenceNo}</span></p>
              )}
              <p><span className="font-semibold text-gray-600">Place of Supply:</span> <span className="font-medium">{partyLedger?.state || company.state} ({isInterState ? 'Inter-State' : 'Intra-State'})</span></p>
              <p><span className="font-semibold text-gray-600">Reverse Charge:</span> <span>No</span></p>
            </div>

            {/* Buyer Details */}
            <div className="space-y-1 pl-3">
              <p className="font-bold uppercase text-[10px] text-gray-500 tracking-wider">Billed To (Buyer / Consignee):</p>
              <p className="font-bold text-gray-900 text-sm">{partyLedger?.name || 'Cash Customer'}</p>
              {partyLedger?.address && <p className="text-gray-600">{partyLedger.address}, {partyLedger.city || ''}</p>}
              <p><span className="font-semibold text-gray-600">State:</span> {partyLedger?.state || company.state}</p>
              <p><span className="font-semibold text-gray-600">GSTIN / UIN:</span> <span className="font-mono font-bold text-gray-800">{partyLedger?.gstin || 'Unregistered'}</span></p>
              {partyLedger?.phone && <p><span className="font-semibold text-gray-600">Contact:</span> {partyLedger.phone}</p>}
            </div>
          </div>

          {/* 3. Items Table */}
          <div className="my-3">
            <table className="w-full border-collapse border border-gray-800 text-left text-[10px]">
              <thead>
                <tr className="bg-gray-100 text-gray-900 border-b border-gray-800 font-semibold">
                  <th className="border border-gray-800 p-1.5 text-center w-8">#</th>
                  <th className="border border-gray-800 p-1.5">Description of Goods</th>
                  <th className="border border-gray-800 p-1.5 text-center">HSN/SAC</th>
                  <th className="border border-gray-800 p-1.5 text-right">Qty</th>
                  <th className="border border-gray-800 p-1.5 text-right">Rate</th>
                  <th className="border border-gray-800 p-1.5 text-right">Taxable (₹)</th>
                  {!isInterState ? (
                    <>
                      <th className="border border-gray-800 p-1.5 text-right">CGST</th>
                      <th className="border border-gray-800 p-1.5 text-right">SGST</th>
                    </>
                  ) : (
                    <th className="border border-gray-800 p-1.5 text-right">IGST</th>
                  )}
                  <th className="border border-gray-800 p-1.5 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {itemLines.map((line, idx) => {
                  const lineTax = (line.cgst || 0) + (line.sgst || 0) + (line.igst || 0);
                  const lineTotal = line.amount + lineTax;
                  return (
                    <tr key={line.id || idx} className="border-b border-gray-300">
                      <td className="border border-gray-800 p-1.5 text-center font-mono">{idx + 1}</td>
                      <td className="border border-gray-800 p-1.5 font-medium">
                        <p className="font-semibold text-gray-900">{line.itemName}</p>
                        {line.godownName && <p className="text-[9px] text-gray-500">Location: {line.godownName}</p>}
                      </td>
                      <td className="border border-gray-800 p-1.5 text-center font-mono">{line.hsnCode || '—'}</td>
                      <td className="border border-gray-800 p-1.5 text-right font-mono">
                        {line.quantity} {line.unit}
                      </td>
                      <td className="border border-gray-800 p-1.5 text-right font-mono">{formatINR(line.rate)}</td>
                      <td className="border border-gray-800 p-1.5 text-right font-mono font-medium">{formatINR(line.amount)}</td>
                      {!isInterState ? (
                        <>
                          <td className="border border-gray-800 p-1.5 text-right font-mono">
                            {formatINR(line.cgst)} <span className="text-[9px] text-gray-500">({(line.gstRate || 18) / 2}%)</span>
                          </td>
                          <td className="border border-gray-800 p-1.5 text-right font-mono">
                            {formatINR(line.sgst)} <span className="text-[9px] text-gray-500">({(line.gstRate || 18) / 2}%)</span>
                          </td>
                        </>
                      ) : (
                        <td className="border border-gray-800 p-1.5 text-right font-mono">
                          {formatINR(line.igst)} <span className="text-[9px] text-gray-500">({line.gstRate || 18}%)</span>
                        </td>
                      )}
                      <td className="border border-gray-800 p-1.5 text-right font-mono font-bold text-gray-900">{formatINR(lineTotal)}</td>
                    </tr>
                  );
                })}

                {/* If no item lines, show ledger entries */}
                {itemLines.length === 0 && (
                  <tr>
                    <td className="border border-gray-800 p-2 text-center">1</td>
                    <td colSpan={2} className="border border-gray-800 p-2 font-medium">
                      {voucher.narration || 'General Accounting Service / Goods'}
                    </td>
                    <td colSpan={2} className="border border-gray-800 p-2 text-right">1 Nos</td>
                    <td className="border border-gray-800 p-2 text-right font-mono">{formatINR(grandTotal)}</td>
                    <td colSpan={isInterState ? 1 : 2} className="border border-gray-800 p-2 text-right font-mono">₹0.00</td>
                    <td className="border border-gray-800 p-2 text-right font-mono font-bold">{formatINR(grandTotal)}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold border-t-2 border-gray-800 text-[10px]">
                  <td colSpan={5} className="border border-gray-800 p-1.5 uppercase text-right">
                    Subtotals &amp; Taxes
                  </td>
                  <td className="border border-gray-800 p-1.5 text-right font-mono">{formatINR(taxableTotal || grandTotal)}</td>
                  {!isInterState ? (
                    <>
                      <td className="border border-gray-800 p-1.5 text-right font-mono">{formatINR(cgstTotal)}</td>
                      <td className="border border-gray-800 p-1.5 text-right font-mono">{formatINR(sgstTotal)}</td>
                    </>
                  ) : (
                    <td className="border border-gray-800 p-1.5 text-right font-mono">{formatINR(igstTotal)}</td>
                  )}
                  <td className="border border-gray-800 p-1.5 text-right font-mono text-xs">{formatINR(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 4. Total in words & Bank Details */}
          <div className="grid grid-cols-2 gap-4 border border-gray-800 p-2.5 my-2 text-xs">
            <div>
              <p className="font-semibold text-gray-600 text-[10px] uppercase">Invoice Amount in Words:</p>
              <p className="font-bold text-gray-900 italic mt-0.5">{numberToWordsINR(grandTotal)}</p>

              <div className="mt-2 pt-2 border-t border-gray-200 text-[10px] space-y-0.5">
                <p className="font-bold text-gray-700">Bank Details for RTGS / NEFT / IMPS:</p>
                <p><span className="text-gray-500">Bank:</span> HDFC Bank Current A/c</p>
                <p><span className="text-gray-500">Account No:</span> <span className="font-mono font-bold">50200088991122</span></p>
                <p><span className="text-gray-500">IFSC Code:</span> <span className="font-mono font-bold">HDFC0000214</span></p>
                <p><span className="text-gray-500">Branch:</span> Bhosari Industrial Area, Pune</p>
              </div>
            </div>

            <div className="flex flex-col justify-between text-right">
              <div className="space-y-1 text-xs">
                <p><span className="text-gray-600">Taxable Value:</span> <span className="font-mono font-medium">{formatINR(taxableTotal || grandTotal)}</span></p>
                {!isInterState ? (
                  <>
                    <p><span className="text-gray-600">Central Tax (CGST):</span> <span className="font-mono">{formatINR(cgstTotal)}</span></p>
                    <p><span className="text-gray-600">State Tax (SGST):</span> <span className="font-mono">{formatINR(sgstTotal)}</span></p>
                  </>
                ) : (
                  <p><span className="text-gray-600">Integrated Tax (IGST):</span> <span className="font-mono">{formatINR(igstTotal)}</span></p>
                )}
                <div className="pt-1 border-t border-gray-800 flex justify-between items-center text-sm font-bold text-gray-900">
                  <span>Grand Total (INR):</span>
                  <span className="font-mono text-base">{formatINR(grandTotal)}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 text-center border-t border-gray-300">
                <p className="text-[10px] font-semibold text-gray-700">For {company.name}</p>
                <div className="h-8" />
                <p className="text-[10px] text-gray-500">Authorized Signatory</p>
              </div>
            </div>
          </div>

          {/* 5. Terms & Declaration */}
          <div className="pt-2 border-t border-gray-200 text-[9px] text-gray-500 leading-normal flex justify-between">
            <p>1. Goods once sold will not be taken back without prior approval. 2. Subject to Pune jurisdiction.</p>
            <p className="font-mono">Generated via Tally Prime PWA</p>
          </div>
        </div>
      </div>
    </div>
  );
}
