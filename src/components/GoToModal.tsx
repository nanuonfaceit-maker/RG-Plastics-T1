import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  BookOpen,
  Receipt,
  Users,
  Plus,
  Wallet,
  Scale,
  TrendingUp,
  FileSpreadsheet,
  Package,
  Clock,
  Percent,
  X,
  ChevronRight,
  Building2,
} from 'lucide-react';
import type { LedgerAccount, TallyVoucherType } from '@/types/accounting';
import type { AppNavTab } from './AppShell';

interface Props {
  open: boolean;
  onClose: () => void;
  ledgers: LedgerAccount[];
  onNavigateView: (view: AppNavTab) => void;
  onSelectVoucher: (type: TallyVoucherType) => void;
  onSelectLedger?: (ledgerId: string) => void;
  onOpenCreateLedger?: () => void;
  onOpenCompanyModal?: () => void;
}

interface ActionItem {
  id: string;
  category: 'Transactions' | 'Reports' | 'Masters' | 'Ledgers';
  title: string;
  subtitle?: string;
  shortcut?: string;
  icon: React.ElementType;
  handler: () => void;
}

export function GoToModal({
  open,
  onClose,
  ledgers = [],
  onNavigateView,
  onSelectVoucher,
  onSelectLedger,
  onOpenCreateLedger,
  onOpenCompanyModal,
}: Props) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard shortcut listener to toggle modal: Alt+G
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.altKey || e.metaKey) && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        if (open) onClose();
      } else if (e.key === 'Escape' && open) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [open, onClose]);

  const baseActions: ActionItem[] = [
    // Navigation / Reports
    {
      id: 'nav-gateway',
      category: 'Masters',
      title: 'Gateway of Tally',
      subtitle: 'Main executive dashboard and navigation gateway',
      shortcut: 'G',
      icon: Building2,
      handler: () => {
        onNavigateView('dashboard');
        onClose();
      },
    },
    {
      id: 'rep-daybook',
      category: 'Reports',
      title: 'Day Book',
      subtitle: 'Audit log of all chronologically recorded transactions',
      shortcut: 'D',
      icon: Receipt,
      handler: () => {
        onNavigateView('daybook');
        onClose();
      },
    },
    {
      id: 'rep-trial',
      category: 'Reports',
      title: 'Trial Balance',
      subtitle: 'Dr/Cr trial balance verification grouped by accounting heads',
      shortcut: 'T',
      icon: Scale,
      handler: () => {
        onNavigateView('trial-balance');
        onClose();
      },
    },
    {
      id: 'rep-pnl',
      category: 'Reports',
      title: 'Profit & Loss A/c',
      subtitle: 'Trading account (Gross Profit) and Indirect expenses (Net Profit)',
      shortcut: 'P',
      icon: TrendingUp,
      handler: () => {
        onNavigateView('profit-loss');
        onClose();
      },
    },
    {
      id: 'rep-bs',
      category: 'Reports',
      title: 'Balance Sheet',
      subtitle: 'T-Format Capital, Liabilities & Assets statement',
      shortcut: 'B',
      icon: FileSpreadsheet,
      handler: () => {
        onNavigateView('balance-sheet');
        onClose();
      },
    },
    {
      id: 'rep-stock',
      category: 'Reports',
      title: 'Stock Summary & Godowns',
      subtitle: 'Inventory stock item valuation and godown distributions',
      shortcut: 'S',
      icon: Package,
      handler: () => {
        onNavigateView('stock-summary');
        onClose();
      },
    },
    {
      id: 'rep-outstanding',
      category: 'Reports',
      title: 'Outstanding Aging Analysis',
      subtitle: 'Debtors receivables & Creditors payables with 30/60/90+ day aging',
      shortcut: 'O',
      icon: Clock,
      handler: () => {
        onNavigateView('outstanding');
        onClose();
      },
    },
    {
      id: 'rep-gst',
      category: 'Reports',
      title: 'GST Summary & Tax Invoices',
      subtitle: 'GSTR-1 output tax, GSTR-2B input credit, and net tax payable',
      shortcut: 'R',
      icon: Percent,
      handler: () => {
        onNavigateView('gst-report');
        onClose();
      },
    },
    {
      id: 'rep-coa',
      category: 'Reports',
      title: 'Chart of Accounts',
      subtitle: 'Standard Tally Primary Groups and ledgers',
      shortcut: 'C',
      icon: BookOpen,
      handler: () => {
        onNavigateView('chart-of-accounts');
        onClose();
      },
    },

    // Transactions
    {
      id: 'act-sale',
      category: 'Transactions',
      title: 'Sales Voucher (F8)',
      subtitle: 'Record sale of finished goods or items to customer',
      shortcut: 'F8',
      icon: Receipt,
      handler: () => {
        onSelectVoucher('Sales');
        onClose();
      },
    },
    {
      id: 'act-purchase',
      category: 'Transactions',
      title: 'Purchase Voucher (F9)',
      subtitle: 'Record purchase of raw materials or stock from supplier',
      shortcut: 'F9',
      icon: Receipt,
      handler: () => {
        onSelectVoucher('Purchase');
        onClose();
      },
    },
    {
      id: 'act-payment',
      category: 'Transactions',
      title: 'Payment Voucher (F5)',
      subtitle: 'Cash / Bank payment to supplier or expense',
      shortcut: 'F5',
      icon: Wallet,
      handler: () => {
        onSelectVoucher('Payment');
        onClose();
      },
    },
    {
      id: 'act-receipt',
      category: 'Transactions',
      title: 'Receipt Voucher (F6)',
      subtitle: 'Cash / Bank receipt from customer',
      shortcut: 'F6',
      icon: Wallet,
      handler: () => {
        onSelectVoucher('Receipt');
        onClose();
      },
    },
    {
      id: 'act-contra',
      category: 'Transactions',
      title: 'Contra Voucher (F4)',
      subtitle: 'Internal funds transfer (Cash to Bank or Bank to Cash)',
      shortcut: 'F4',
      icon: Receipt,
      handler: () => {
        onSelectVoucher('Contra');
        onClose();
      },
    },
    {
      id: 'act-journal',
      category: 'Transactions',
      title: 'Journal Voucher (F7)',
      subtitle: 'Adjustment, depreciation, and double-entry journals',
      shortcut: 'F7',
      icon: Receipt,
      handler: () => {
        onSelectVoucher('Journal');
        onClose();
      },
    },

    // Masters
    {
      id: 'act-create-ledger',
      category: 'Masters',
      title: 'Create Ledger Account',
      subtitle: 'Add new customer, supplier, bank, or expense ledger',
      shortcut: 'Alt+C',
      icon: Plus,
      handler: () => {
        onOpenCreateLedger?.();
        onClose();
      },
    },
    {
      id: 'act-alter-company',
      category: 'Masters',
      title: 'Alter Company Information (F3)',
      subtitle: 'Edit company address, GSTIN, PAN, and FY period',
      shortcut: 'F3',
      icon: Building2,
      handler: () => {
        onOpenCompanyModal?.();
        onClose();
      },
    },
  ];

  const ledgerActions: ActionItem[] = ledgers
    .filter((l) => l.isActive !== false)
    .map((l) => ({
      id: `led-${l.id}`,
      category: 'Ledgers' as const,
      title: `${l.name}`,
      subtitle: `Group: ${l.groupName || l.groupId} | Opening: ₹${l.openingBalance || 0} ${l.openingType}`,
      icon: Users,
      handler: () => {
        onSelectLedger?.(l.id);
        onClose();
      },
    }));

  const allActions = [...baseActions, ...ledgerActions];

  const filtered = query.trim()
    ? allActions.filter((item) => {
        const q = query.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
          item.category.toLowerCase().includes(q)
        );
      })
    : allActions;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].handler();
      }
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-3 bg-black/60 select-none font-sans text-xs">
      <div className="w-full max-w-xl bg-white border-2 border-[#004b6e] shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header Ribbon */}
        <div className="bg-[#004b6e] text-white px-3 py-1.5 flex items-center justify-between border-b border-[#003859]">
          <div className="flex items-center gap-2">
            <span className="bg-[#fed843] text-black px-1.5 py-0.2 font-black text-[10px]">
              GO TO
            </span>
            <span className="font-black text-xs uppercase tracking-wide">
              Quick Search &amp; Navigation
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:text-[#fed843] font-bold"
          >
            <X size={14} />
          </button>
        </div>

        {/* Search input bar */}
        <div className="p-2 bg-[#f0f5f8] border-b border-[#8caebd] flex items-center gap-2">
          <Search size={14} className="text-[#004b6e] shrink-0 ml-1" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a report, voucher, or ledger name (e.g. Day Book, Sales, Cash)..."
            className="w-full bg-white border border-[#8caebd] px-2 py-1 text-xs text-[#0d222f] font-semibold outline-none focus:bg-[#fed843] focus:text-black"
          />
          <kbd className="hidden sm:inline-block bg-[#edf4f8] px-1.5 py-0.5 text-[9px] font-mono font-bold text-[#a61a1a] border border-[#8caebd]">
            Esc to close
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#edf4f8]">
          {filtered.map((item, idx) => {
            const Icon = item.icon;
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={item.id}
                onClick={item.handler}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex items-center justify-between px-3 py-1.5 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[#fed843] text-black font-bold'
                    : 'text-[#0d222f] hover:bg-[#fed843] hover:text-black'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div
                    className={`flex h-6 w-6 items-center justify-center border shrink-0 ${
                      isSelected
                        ? 'bg-black text-[#fed843] border-black'
                        : 'bg-[#edf4f8] text-[#004b6e] border-[#8caebd]'
                    }`}
                  >
                    <Icon size={12} />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold truncate leading-tight">{item.title}</p>
                    {item.subtitle && (
                      <p
                        className={`text-[10px] truncate leading-tight mt-0.5 ${
                          isSelected ? 'text-black/80' : 'text-[#4a6777]'
                        }`}
                      >
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span
                    className={`text-[9px] font-mono uppercase px-1.5 py-0.2 border ${
                      isSelected
                        ? 'bg-black text-[#fed843] border-black font-bold'
                        : 'bg-[#f0f5f8] text-[#4a6777] border-[#8caebd]'
                    }`}
                  >
                    {item.category}
                  </span>
                  {item.shortcut && (
                    <kbd className="text-[9px] font-mono font-black text-[#a61a1a] bg-white px-1 border border-[#8caebd]">
                      {item.shortcut}
                    </kbd>
                  )}
                  <ChevronRight size={12} className={isSelected ? 'text-black' : 'text-[#8caebd]'} />
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-8 text-center text-xs text-[#4a6777]">
              <p>No matching reports, vouchers, or ledgers found for &ldquo;{query}&rdquo;.</p>
              <p className="mt-1">Tip: Type &quot;Day Book&quot;, &quot;Profit&quot;, or &quot;Sales&quot;.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#8caebd] bg-[#f0f5f8] px-3 py-1.5 text-[10px] text-[#4a6777] flex items-center justify-between font-mono">
          <span>↑↓: Navigate • Enter: Select</span>
          <span className="font-bold text-[#004b6e]">TallyPrime Go To</span>
        </div>
      </div>
    </div>
  );
}
