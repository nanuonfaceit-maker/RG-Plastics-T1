import React, { useState, useMemo } from 'react';
import {
  Package,
  Layers,
  Search,
  Download,
  Filter,
  Plus,
  Warehouse,
  Boxes,
} from 'lucide-react';
import type { StockItem, Godown } from '@/types/inventory';
import type { Voucher } from '@/types/accounting';
import {
  computeStockSummary,
  formatINR,
  formatDate,
} from '@/services/accountingEngine';
import { downloadCSV } from '@/lib/csv';

interface Props {
  stockItems: StockItem[];
  godowns: Godown[];
  vouchers: Voucher[];
  onOpenCreateItem?: () => void;
  onSelectVoucher?: (voucherId: string) => void;
  onBack?: () => void;
}

export function StockSummaryView({
  stockItems,
  godowns,
  vouchers,
  onOpenCreateItem,
  onSelectVoucher,
  onBack,
}: Props) {
  const [selectedGodown, setSelectedGodown] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeItemDrilldown, setActiveItemDrilldown] = useState<string | null>(null);

  const report = useMemo(() => {
    return computeStockSummary(
      stockItems,
      vouchers,
      godowns,
      selectedGodown === 'all' ? undefined : selectedGodown
    );
  }, [stockItems, vouchers, godowns, selectedGodown]);

  const filteredItems = useMemo(() => {
    return report.items.filter((itemSummary) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        itemSummary.item.name.toLowerCase().includes(q) ||
        (itemSummary.item.hsnCode && itemSummary.item.hsnCode.toLowerCase().includes(q))
      );
    });
  }, [report.items, searchQuery]);

  const activeItem = useMemo(() => {
    if (!activeItemDrilldown) return null;
    return stockItems.find((s) => s.id === activeItemDrilldown);
  }, [stockItems, activeItemDrilldown]);

  const drilldownVouchers = useMemo(() => {
    if (!activeItemDrilldown) return [];
    return vouchers.filter((v) =>
      v.itemLines?.some((line) => line.itemId === activeItemDrilldown)
    );
  }, [vouchers, activeItemDrilldown]);

  function handleExportCSV() {
    const rows: string[] = [];
    rows.push('Stock Summary & Inventory Valuation');
    rows.push(`Godown Filter: ${selectedGodown === 'all' ? 'All Godowns' : selectedGodown}`);
    rows.push('');
    rows.push(
      'ITEM NAME,HSN CODE,UNIT,GST %,OPENING QTY,OPENING RATE,OPENING VALUE,INWARD QTY,INWARD VALUE,OUTWARD QTY,OUTWARD VALUE,CLOSING QTY,AVG RATE,CLOSING VALUE'
    );

    for (const r of report.items) {
      rows.push(
        `"${r.item.name}",${r.item.hsnCode || ''},${r.item.unit},${r.item.gstRate}%,${r.openingQty},${r.openingRate},${r.openingValue},${r.inwardQty},${r.inwardValue},${r.outwardQty},${r.outwardValue},${r.closingQty},${r.avgRate},${r.closingValue}`
      );
    }

    rows.push('');
    rows.push(
      `TOTAL,,,${report.totalOpeningValue},,,,${report.totalClosingValue}`
    );

    downloadCSV(`stock-summary-${new Date().toISOString().slice(0, 10)}.csv`, rows.join('\n'));
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
            <span>Inventory</span>
            <span>›</span>
            <span className="text-[#fed843] font-bold">Stock Summary</span>
          </div>
          <h1 className="text-sm font-black tracking-wide text-white uppercase flex items-center gap-2 mt-0.5">
            <span>Stock Summary &amp; Godowns</span>
            <span className="text-xs text-[#fed843] font-mono">
              ({filteredItems.length} Items)
            </span>
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {onOpenCreateItem && (
            <button
              type="button"
              onClick={onOpenCreateItem}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#fed843] hover:bg-[#f5cb28] text-black border border-[#00253d] font-black transition-colors cursor-pointer shadow-xs"
            >
              <Plus size={13} />
              <span>Create Item (Alt+C)</span>
            </button>
          )}

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-white border border-[#8caebd] p-2">
            <p className="text-[10px] font-bold text-[#004b6e] uppercase tracking-wider">Opening Stock</p>
            <p className="text-base font-black text-[#0d222f] mt-0.5 font-mono">{formatINR(report.totalOpeningValue)}</p>
            <p className="text-[9px] text-[#4a6777]">{report.items.length} Items Configured</p>
          </div>

          <div className="bg-white border border-[#8caebd] p-2">
            <p className="text-[10px] font-bold text-[#004b6e] uppercase tracking-wider">Total Inwards</p>
            <p className="text-base font-black text-[#004b6e] mt-0.5 font-mono">{formatINR(report.totalInwardValue)}</p>
            <p className="text-[9px] text-[#4a6777]">Purchases &amp; Additions</p>
          </div>

          <div className="bg-white border border-[#8caebd] p-2">
            <p className="text-[10px] font-bold text-[#004b6e] uppercase tracking-wider">Total Outwards</p>
            <p className="text-base font-black text-[#a61a1a] mt-0.5 font-mono">{formatINR(report.totalOutwardValue)}</p>
            <p className="text-[9px] text-[#4a6777]">Sales &amp; Dispatches</p>
          </div>

          <div className="bg-[#f0fdf4] border border-[#059669] p-2">
            <p className="text-[10px] font-bold text-[#059669] uppercase tracking-wider">Closing Valuation</p>
            <p className="text-base font-black text-[#059669] mt-0.5 font-mono">{formatINR(report.totalClosingValue)}</p>
            <p className="text-[9px] text-[#059669]/80">Weighted Average Value</p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#f0f5f8] border border-[#8caebd] p-2">
          <div className="flex items-center gap-1.5 bg-white border border-[#8caebd] px-2 py-1 w-full md:w-80">
            <Search size={12} className="text-[#4a6777]" />
            <input
              type="text"
              placeholder="Search stock item name or HSN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-[#0d222f] outline-none w-full"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[#004b6e] font-bold flex items-center gap-1 text-[11px]">
              <Warehouse size={13} />
              Godown:
            </span>
            <select
              value={selectedGodown}
              onChange={(e) => setSelectedGodown(e.target.value)}
              className="bg-white border border-[#8caebd] px-2 py-0.5 text-xs font-semibold text-[#0d222f] outline-none"
            >
              <option value="all">All Godowns</option>
              {godowns.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stock Items Table */}
        <div className="bg-white border-2 border-[#004b6e] shadow-md overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#004b6e] text-white border-b border-[#003859] text-[10px] font-bold uppercase tracking-wider">
                <th className="py-1.5 px-2.5 border-r border-[#003859]">Stock Item</th>
                <th className="py-1.5 px-2 text-center border-r border-[#003859]">HSN</th>
                <th className="py-1.5 px-2 text-center border-r border-[#003859]">GST%</th>
                <th className="py-1.5 px-2.5 text-right border-r border-[#003859]">Opening Qty</th>
                <th className="py-1.5 px-2.5 text-right border-r border-[#003859]">Inward Qty</th>
                <th className="py-1.5 px-2.5 text-right border-r border-[#003859]">Outward Qty</th>
                <th className="py-1.5 px-2.5 text-right border-r border-[#003859]">Closing Qty</th>
                <th className="py-1.5 px-2.5 text-right border-r border-[#003859]">Avg Rate</th>
                <th className="py-1.5 px-2.5 text-right">Closing Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c2d7e4]">
              {filteredItems.map((summary) => {
                const item = summary.item;
                const isSelected = activeItemDrilldown === item.id;
                return (
                  <tr
                    key={item.id}
                    onClick={() => setActiveItemDrilldown(isSelected ? null : item.id)}
                    className={`hover:bg-[#fed843] hover:text-black cursor-pointer transition-colors group ${
                      isSelected ? 'bg-[#fed843] text-black font-bold' : ''
                    }`}
                  >
                    <td className="py-1 px-2.5 border-r border-[#c2d7e4] font-medium">
                      <div className="flex items-center gap-1.5">
                        <Boxes size={12} className="text-[#004b6e] group-hover:text-black shrink-0" />
                        <div>
                          <p className="font-bold text-[#004b6e] group-hover:text-black">{item.name}</p>
                          {summary.godownAllocations.length > 0 && (
                            <p className="text-[9px] text-[#4a6777] group-hover:text-black">
                              {summary.godownAllocations.map((g) => `${g.godownName}: ${g.qty} ${item.unit}`).join(' | ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-1 px-2 text-center font-mono text-[#4a6777] group-hover:text-black border-r border-[#c2d7e4]">{item.hsnCode || '—'}</td>
                    <td className="py-1 px-2 text-center text-[#a61a1a] group-hover:text-black font-mono font-bold border-r border-[#c2d7e4]">{item.gstRate}%</td>
                    <td className="py-1 px-2.5 text-right font-mono border-r border-[#c2d7e4]">
                      {summary.openingQty} {item.unit}
                    </td>
                    <td className="py-1 px-2.5 text-right font-mono text-[#004b6e] group-hover:text-black border-r border-[#c2d7e4] font-semibold">
                      {summary.inwardQty > 0 ? `+${summary.inwardQty} ${item.unit}` : '—'}
                    </td>
                    <td className="py-1 px-2.5 text-right font-mono text-[#a61a1a] group-hover:text-black border-r border-[#c2d7e4] font-semibold">
                      {summary.outwardQty > 0 ? `-${summary.outwardQty} ${item.unit}` : '—'}
                    </td>
                    <td className="py-1 px-2.5 text-right font-mono font-black border-r border-[#c2d7e4]">
                      {summary.closingQty} {item.unit}
                    </td>
                    <td className="py-1 px-2.5 text-right font-mono border-r border-[#c2d7e4]">{formatINR(summary.avgRate)}</td>
                    <td className="py-1 px-2.5 text-right font-mono font-black text-[#059669] group-hover:text-black">
                      {formatINR(summary.closingValue)}
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#4a6777] text-xs font-sans">
                    No stock items match your search.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-[#f0f5f8] text-[#004b6e] font-black border-t-2 border-b-4 border-double border-[#004b6e]">
                <td colSpan={3} className="py-2 px-2.5 uppercase tracking-wider text-[10px]">
                  Total Closing Stock Valuation
                </td>
                <td className="py-2 px-2.5 text-right font-mono">{formatINR(report.totalOpeningValue)}</td>
                <td className="py-2 px-2.5 text-right font-mono">{formatINR(report.totalInwardValue)}</td>
                <td className="py-2 px-2.5 text-right font-mono text-[#a61a1a]">{formatINR(report.totalOutwardValue)}</td>
                <td colSpan={2} className="py-2 px-2.5 text-right text-[#4a6777] font-semibold text-[10px]">
                  Weighted Avg Total:
                </td>
                <td className="py-2 px-2.5 text-right font-mono text-[#059669] text-xs">
                  {formatINR(report.totalClosingValue)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Drill-down Movement History */}
        {activeItem && (
          <div className="bg-white border-2 border-[#004b6e] p-2 space-y-2 shadow-md">
            <div className="flex items-center justify-between border-b border-[#8caebd] pb-1.5">
              <div>
                <h3 className="text-xs font-black text-[#004b6e] uppercase flex items-center gap-1.5">
                  <Package size={14} />
                  Movement Register: {activeItem.name}
                </h3>
                <p className="text-[10px] text-[#4a6777]">
                  Unit: {activeItem.unit} | HSN: {activeItem.hsnCode} | GST: {activeItem.gstRate}%
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveItemDrilldown(null)}
                className="bg-[#edf4f8] border border-[#7ea1b5] text-[#a61a1a] hover:bg-[#a61a1a] hover:text-white px-2 py-0.5 text-[10px] font-bold"
              >
                Close Drilldown (Esc)
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#004b6e] text-white border-b border-[#003859] text-[10px] font-bold uppercase">
                    <th className="py-1 px-2 border-r border-[#003859]">Date</th>
                    <th className="py-1 px-2 border-r border-[#003859]">Voucher Type</th>
                    <th className="py-1 px-2 border-r border-[#003859]">Voucher #</th>
                    <th className="py-1 px-2 border-r border-[#003859]">Godown</th>
                    <th className="py-1 px-2 text-right border-r border-[#003859]">Quantity</th>
                    <th className="py-1 px-2 text-right border-r border-[#003859]">Rate</th>
                    <th className="py-1 px-2 text-right border-r border-[#003859]">Amount</th>
                    <th className="py-1 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c2d7e4] font-mono">
                  {drilldownVouchers.map((v) => {
                    const line = v.itemLines?.find((l) => l.itemId === activeItem.id);
                    if (!line) return null;
                    const isPurchase = v.voucherType === 'Purchase' || v.voucherType === 'Credit Note';
                    return (
                      <tr key={v.id} className="hover:bg-[#fed843] hover:text-black">
                        <td className="py-1 px-2 border-r border-[#c2d7e4]">{formatDate(v.date)}</td>
                        <td className="py-1 px-2 border-r border-[#c2d7e4]">
                          <span className="font-bold text-[#004b6e]">
                            {v.voucherType}
                          </span>
                        </td>
                        <td className="py-1 px-2 border-r border-[#c2d7e4] font-bold">{v.voucherNumber}</td>
                        <td className="py-1 px-2 border-r border-[#c2d7e4] text-[#4a6777]">{line.godownName || 'Main Godown'}</td>
                        <td className={`py-1 px-2 text-right font-bold border-r border-[#c2d7e4] ${isPurchase ? 'text-[#004b6e]' : 'text-[#a61a1a]'}`}>
                          {isPurchase ? `+${line.quantity}` : `-${line.quantity}`} {line.unit}
                        </td>
                        <td className="py-1 px-2 text-right border-r border-[#c2d7e4]">{formatINR(line.rate)}</td>
                        <td className="py-1 px-2 text-right font-bold text-[#004b6e] border-r border-[#c2d7e4]">{formatINR(line.amount)}</td>
                        <td className="py-1 px-2 text-center">
                          {onSelectVoucher && (
                            <button
                              type="button"
                              onClick={() => onSelectVoucher(v.id)}
                              className="text-[#004b6e] font-bold hover:underline cursor-pointer"
                            >
                              Open
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {drilldownVouchers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-4 text-center text-[#4a6777] font-sans text-xs">
                        No transactions recorded for this item yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
