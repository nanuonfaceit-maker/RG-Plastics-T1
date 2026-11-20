import React, { useState, useEffect, useMemo } from 'react';
import {
  Coins,
  Wallet,
  TrendingUp,
  Building2,
  Calendar,
  Layers,
  Scale,
  Receipt,
  FileSpreadsheet,
  Package,
  Clock,
  Percent,
  Settings,
} from 'lucide-react';
import type { Company } from '@/types/company';
import type { LedgerAccount, AccountGroup, Voucher } from '@/types/accounting';
import type { StockItem } from '@/types/inventory';
import { formatINR, formatDate, computeLedgerStatement } from '@/services/accountingEngine';

interface Props {
  company: Company;
  allCompanies: Company[];
  ledgers: LedgerAccount[];
  groups: AccountGroup[];
  vouchers: Voucher[];
  stockItems: StockItem[];
  onSwitchCompany: (id: string) => void;
  onOpenCompanyModal: () => void;
  onNavigateTab: (
    tab:
      | 'dashboard'
      | 'vouchers'
      | 'daybook'
      | 'chart-of-accounts'
      | 'trial-balance'
      | 'profit-loss'
      | 'balance-sheet'
      | 'stock-summary'
      | 'outstanding'
      | 'gst-report'
      | 'settings'
  ) => void;
  onOpenCreateVoucher: (type?: string) => void;
  onOpenCreateLedger: () => void;
  onExportBackup: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  hotkey: string;
  hotkeyDisplay: React.ReactNode;
  hint?: string;
  action: () => void;
}

export function GatewayOfTally({
  company,
  allCompanies,
  ledgers,
  groups,
  vouchers,
  stockItems,
  onSwitchCompany,
  onOpenCompanyModal,
  onNavigateTab,
  onOpenCreateVoucher,
  onOpenCreateLedger,
  onExportBackup,
}: Props) {
  // Compute Key Financial Metrics
  const kpis = useMemo(() => {
    // 1. Cash Balance
    const cashLedgers = ledgers.filter((l) => l.groupId === 'cash-in-hand');
    const cashTotal = cashLedgers.reduce((sum, l) => {
      const stmt = computeLedgerStatement(l, vouchers);
      const sign = stmt.closingType === 'Dr' ? 1 : -1;
      return sum + sign * stmt.closingBalance;
    }, 0);

    // 2. Bank Balance
    const bankLedgers = ledgers.filter((l) => l.groupId === 'bank-accounts');
    const bankTotal = bankLedgers.reduce((sum, l) => {
      const stmt = computeLedgerStatement(l, vouchers);
      const sign = stmt.closingType === 'Dr' ? 1 : -1;
      return sum + sign * stmt.closingBalance;
    }, 0);

    // 3. Receivables
    const debtorLedgers = ledgers.filter((l) => l.groupId === 'sundry-debtors');
    const receivablesTotal = debtorLedgers.reduce((sum, l) => {
      const stmt = computeLedgerStatement(l, vouchers);
      return sum + (stmt.closingType === 'Dr' ? stmt.closingBalance : 0);
    }, 0);

    // 4. Payables
    const creditorLedgers = ledgers.filter((l) => l.groupId === 'sundry-creditors');
    const payablesTotal = creditorLedgers.reduce((sum, l) => {
      const stmt = computeLedgerStatement(l, vouchers);
      return sum + (stmt.closingType === 'Cr' ? stmt.closingBalance : 0);
    }, 0);

    let totalSales = 0;
    let totalPurchases = 0;

    for (const v of vouchers) {
      if (v.voucherType === 'Sales') {
        const salesDr = v.lines.filter((l) => l.type === 'Dr').reduce((s, l) => s + l.amount, 0);
        totalSales += salesDr;
      } else if (v.voucherType === 'Purchase') {
        const purcCr = v.lines.filter((l) => l.type === 'Cr').reduce((s, l) => s + l.amount, 0);
        totalPurchases += purcCr;
      }
    }

    const lastEntryDate = vouchers.length > 0 ? vouchers[0]?.date : null;

    return {
      cashTotal,
      bankTotal,
      receivablesTotal,
      payablesTotal,
      totalSales,
      totalPurchases,
      lastEntryDate,
    };
  }, [ledgers, vouchers]);

  // Authentic Gateway of Tally Menu Structure
  const menuSections: { title: string; items: MenuItem[] }[] = useMemo(() => [
    {
      title: 'MASTERS',
      items: [
        {
          id: 'create',
          label: 'Create (Ledger / Group / Item)',
          hotkey: 'C',
          hotkeyDisplay: <><span className="text-[#a61a1a] font-bold underline">C</span>reate</>,
          hint: 'Alt+C',
          action: onOpenCreateLedger,
        },
        {
          id: 'alter',
          label: 'Alter Company / Master',
          hotkey: 'A',
          hotkeyDisplay: <><span className="text-[#a61a1a] font-bold underline">A</span>lter</>,
          hint: 'F3',
          action: onOpenCompanyModal,
        },
        {
          id: 'chart',
          label: 'Chart of Accounts',
          hotkey: 'H',
          hotkeyDisplay: <>C<span className="text-[#a61a1a] font-bold underline">h</span>art of Accounts</>,
          hint: `${ledgers.length} Ledgers`,
          action: () => onNavigateTab('chart-of-accounts'),
        },
      ],
    },
    {
      title: 'TRANSACTIONS',
      items: [
        {
          id: 'vouchers',
          label: 'Vouchers',
          hotkey: 'V',
          hotkeyDisplay: <><span className="text-[#a61a1a] font-bold underline">V</span>ouchers</>,
          hint: 'F4–F9',
          action: () => onNavigateTab('vouchers'),
        },
        {
          id: 'daybook',
          label: 'Day Book',
          hotkey: 'D',
          hotkeyDisplay: <><span className="text-[#a61a1a] font-bold underline">D</span>ay Book</>,
          hint: `${vouchers.length} Entries`,
          action: () => onNavigateTab('daybook'),
        },
      ],
    },
    {
      title: 'UTILITIES',
      items: [
        {
          id: 'outstanding',
          label: 'Outstanding Aging Analysis',
          hotkey: 'O',
          hotkeyDisplay: <><span className="text-[#a61a1a] font-bold underline">O</span>utstandings</>,
          hint: 'Aging Bills',
          action: () => onNavigateTab('outstanding'),
        },
      ],
    },
    {
      title: 'REPORTS',
      items: [
        {
          id: 'balance-sheet',
          label: 'Balance Sheet',
          hotkey: 'B',
          hotkeyDisplay: <><span className="text-[#a61a1a] font-bold underline">B</span>alance Sheet</>,
          hint: 'Assets & Liab',
          action: () => onNavigateTab('balance-sheet'),
        },
        {
          id: 'profit-loss',
          label: 'Profit & Loss A/c',
          hotkey: 'P',
          hotkeyDisplay: <><span className="text-[#a61a1a] font-bold underline">P</span>rofit & Loss A/c</>,
          hint: 'Trading & P&L',
          action: () => onNavigateTab('profit-loss'),
        },
        {
          id: 'stock-summary',
          label: 'Stock Summary',
          hotkey: 'S',
          hotkeyDisplay: <><span className="text-[#a61a1a] font-bold underline">S</span>tock Summary</>,
          hint: `${stockItems.length} Items`,
          action: () => onNavigateTab('stock-summary'),
        },
        {
          id: 'trial-balance',
          label: 'Trial Balance',
          hotkey: 'T',
          hotkeyDisplay: <><span className="text-[#a61a1a] font-bold underline">T</span>rial Balance</>,
          hint: 'Dr/Cr Balance',
          action: () => onNavigateTab('trial-balance'),
        },
        {
          id: 'gst-report',
          label: 'GST Reports & Tax Register',
          hotkey: 'G',
          hotkeyDisplay: <><span className="text-[#a61a1a] font-bold underline">G</span>ST Reports</>,
          hint: 'GSTR-1 / 3B',
          action: () => onNavigateTab('gst-report'),
        },
        {
          id: 'quit',
          label: 'Quit',
          hotkey: 'Q',
          hotkeyDisplay: <><span className="text-[#a61a1a] font-bold underline">Q</span>uit</>,
          hint: 'Esc / Settings',
          action: () => onNavigateTab('settings'),
        },
      ],
    },
  ], [ledgers.length, vouchers.length, stockItems.length, onOpenCreateLedger, onOpenCompanyModal, onNavigateTab]);

  // Flattened items for keyboard arrow navigation
  const allItems = useMemo(() => menuSections.flatMap((s) => s.items), [menuSections]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Keyboard navigation: Arrow Up / Down, Enter, Hotkeys
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % allItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        allItems[selectedIndex]?.action();
      } else {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const key = e.key.toUpperCase();
        const matched = allItems.find((item) => item.hotkey === key);
        if (matched) {
          e.preventDefault();
          matched.action();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allItems, selectedIndex]);

  return (
    <div className="select-none font-sans text-xs">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        
        {/* LEFT COLUMN: Tally Split-Pane Left Information Screen */}
        <div className="lg:col-span-6 space-y-2.5">
          {/* Top Banner: Current Period & Date */}
          <div className="bg-[#f0f5f8] border border-[#8caebd] text-[#0d222f] shadow-xs">
            <div className="grid grid-cols-2 text-center border-b border-[#8caebd] bg-[#004b6e] text-white py-1 text-[11px] font-bold">
              <div>CURRENT PERIOD</div>
              <div>CURRENT DATE</div>
            </div>
            <div className="grid grid-cols-2 text-center py-1.5 font-mono text-xs font-semibold">
              <div className="text-[#004b6e]">
                {formatDate(company.financialYearStart)} to {formatDate(company.financialYearEnd)}
              </div>
              <div className="text-[#a61a1a]">
                {kpis.lastEntryDate ? formatDate(kpis.lastEntryDate) : formatDate(new Date().toISOString())}
              </div>
            </div>
          </div>

          {/* Selected Company Table */}
          <div className="bg-[#ffffff] border border-[#8caebd] shadow-xs">
            <div className="grid grid-cols-12 bg-[#004b6e] text-white px-3 py-1 text-[11px] font-bold border-b border-[#003859]">
              <div className="col-span-8 uppercase">NAME OF COMPANY</div>
              <div className="col-span-4 uppercase text-right">DATE OF LAST ENTRY</div>
            </div>

            <div className="p-3">
              <div className="grid grid-cols-12 items-baseline">
                <div className="col-span-8">
                  <h1 className="text-sm font-black text-[#00253d] tracking-wide uppercase">
                    {company.name}
                  </h1>
                  {company.gstin && (
                    <p className="text-[10px] text-[#4a6777] font-mono mt-0.5">GSTIN: {company.gstin}</p>
                  )}
                  {company.state && (
                    <p className="text-[10px] text-[#4a6777]">{company.city ? `${company.city}, ` : ''}{company.state}</p>
                  )}
                </div>

                <div className="col-span-4 text-right font-mono text-xs font-bold text-[#a61a1a]">
                  {kpis.lastEntryDate ? formatDate(kpis.lastEntryDate) : 'No Vouchers'}
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Financial Ledger Position (Authentic Tally Table) */}
          <div className="bg-[#ffffff] border border-[#8caebd] shadow-xs">
            <div className="bg-[#004b6e] text-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide border-b border-[#003859]">
              FINANCIAL POSITION OVERVIEW
            </div>

            <div className="divide-y divide-[#c2d7e4] text-xs">
              <div className="flex items-center justify-between px-3 py-2 hover:bg-[#f2f7fa]">
                <div className="flex items-center gap-2">
                  <Coins size={14} className="text-[#004b6e]" />
                  <span className="font-semibold text-[#0d222f]">Cash-in-Hand (Physical Drawer)</span>
                </div>
                <span className="font-mono font-bold text-[#004b6e] text-sm">
                  {formatINR(kpis.cashTotal)}
                </span>
              </div>

              <div className="flex items-center justify-between px-3 py-2 hover:bg-[#f2f7fa]">
                <div className="flex items-center gap-2">
                  <Wallet size={14} className="text-[#004b6e]" />
                  <span className="font-semibold text-[#0d222f]">Bank Balances (Active Accounts)</span>
                </div>
                <span className="font-mono font-bold text-[#004b6e] text-sm">
                  {formatINR(kpis.bankTotal)}
                </span>
              </div>

              <div
                onClick={() => onNavigateTab('outstanding')}
                className="flex items-center justify-between px-3 py-2 hover:bg-[#fed843] hover:text-black cursor-pointer transition"
              >
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#004b6e]" />
                  <span className="font-semibold">Sundry Debtors (Receivables from Customers)</span>
                </div>
                <span className="font-mono font-bold text-[#004b6e]">
                  {formatINR(kpis.receivablesTotal)} Dr
                </span>
              </div>

              <div
                onClick={() => onNavigateTab('outstanding')}
                className="flex items-center justify-between px-3 py-2 hover:bg-[#fed843] hover:text-black cursor-pointer transition"
              >
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#a61a1a]" />
                  <span className="font-semibold">Sundry Creditors (Payables to Suppliers)</span>
                </div>
                <span className="font-mono font-bold text-[#a61a1a]">
                  {formatINR(kpis.payablesTotal)} Cr
                </span>
              </div>

              <div className="grid grid-cols-2 bg-[#f0f5f8] px-3 py-2 text-[11px] font-mono border-t border-[#8caebd]">
                <div>
                  <span className="text-[#4a6777] block text-[10px] uppercase">Total Sales (Cr)</span>
                  <span className="font-bold text-[#004b6e] text-xs">{formatINR(kpis.totalSales)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[#4a6777] block text-[10px] uppercase">Total Purchases (Dr)</span>
                  <span className="font-bold text-[#a61a1a] text-xs">{formatINR(kpis.totalPurchases)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: The Legendary Gateway of Tally Box */}
        <div className="lg:col-span-6 flex justify-center">
          <div className="w-full max-w-md bg-[#f7fafc] border-2 border-[#004b6e] shadow-lg text-[#0d222f]">
            {/* Gateway Header Banner */}
            <div className="bg-[#004b6e] py-1.5 text-center border-b-2 border-[#003859]">
              <h2 className="text-sm font-black tracking-widest text-[#fed843] uppercase font-mono">
                Gateway of Tally
              </h2>
            </div>

            {/* Menu List */}
            <div className="p-2 sm:p-3 space-y-2.5 text-xs">
              {menuSections.map((sec) => (
                <div key={sec.title}>
                  <p className="text-[10px] font-black uppercase text-[#004b6e] tracking-wider mb-0.5 px-2">
                    {sec.title}
                  </p>

                  <div className="space-y-0.5">
                    {sec.items.map((item) => {
                      const itemFlatIdx = allItems.findIndex((x) => x.id === item.id);
                      const isSelected = itemFlatIdx === selectedIndex;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.action}
                          onMouseEnter={() => setSelectedIndex(itemFlatIdx)}
                          className={`w-full flex items-center justify-between px-3 py-1 font-medium text-left transition cursor-pointer border ${
                            isSelected
                              ? 'bg-[#fed843] text-[#000000] border-[#00253d] font-bold shadow-xs'
                              : 'bg-transparent text-[#0d222f] border-transparent hover:bg-[#fed843] hover:text-[#000000]'
                          }`}
                        >
                          <span className="text-xs">
                            {isSelected ? item.label : item.hotkeyDisplay}
                          </span>
                          <span
                            className={`text-[10px] font-mono ${
                              isSelected ? 'text-black font-bold' : 'text-[#4a6777]'
                            }`}
                          >
                            {item.hint}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Prompt */}
            <div className="bg-[#e4edf2] px-3 py-1.5 border-t border-[#8caebd] flex items-center justify-between text-[10px] text-[#4a6777] font-mono">
              <span>↑↓: Navigate</span>
              <span>Enter: Select</span>
              <span>Hotkeys: Press Key</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
