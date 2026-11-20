import React, { useState } from 'react';
import {
  LayoutDashboard,
  Receipt,
  Plus,
  BookOpen,
  Scale,
  TrendingUp,
  FileSpreadsheet,
  Package,
  Clock,
  Percent,
  Settings,
  ChevronRight,
  Menu,
  X,
  Keyboard,
} from 'lucide-react';
import type { TallyVoucherType } from '@/types/accounting';
import type { Company } from '@/types/company';
import { TallyHeader } from './TallyHeader';
import { TallyButtonBar } from './TallyButtonBar';
import { TallyBottomBar } from './TallyBottomBar';

export type AppNavTab =
  | 'dashboard'
  | 'vouchers'
  | 'daybook'
  | 'trial-balance'
  | 'profit-loss'
  | 'balance-sheet'
  | 'stock-summary'
  | 'outstanding'
  | 'gst-report'
  | 'chart-of-accounts';

interface Props {
  active: AppNavTab;
  activeCompany?: Company | null;
  onNavigate: (tab: AppNavTab) => void;
  onSelectVoucherType: (type: TallyVoucherType) => void;
  onOpenGoTo: () => void;
  onOpenChartOfAccounts: () => void;
  onExportBackup: () => void;
  onOpenCompanyModal: () => void;
  onOpenSettings: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  currentVoucherType?: string | null;
  children: React.ReactNode;
}

interface NavSection {
  title: string;
  items: {
    key: AppNavTab;
    label: string;
    shortcut: string;
    icon: React.ElementType;
  }[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Masters',
    items: [
      { key: 'dashboard', label: 'Gateway of Tally', shortcut: 'G', icon: LayoutDashboard },
      { key: 'chart-of-accounts', label: 'Chart of Accounts', shortcut: 'C', icon: BookOpen },
    ],
  },
  {
    title: 'Transactions',
    items: [
      { key: 'vouchers', label: 'Vouchers Creation', shortcut: 'V', icon: Plus },
      { key: 'daybook', label: 'Day Book', shortcut: 'D', icon: Receipt },
    ],
  },
  {
    title: 'Reports',
    items: [
      { key: 'balance-sheet', label: 'Balance Sheet', shortcut: 'B', icon: FileSpreadsheet },
      { key: 'profit-loss', label: 'Profit & Loss A/c', shortcut: 'P', icon: TrendingUp },
      { key: 'trial-balance', label: 'Trial Balance', shortcut: 'T', icon: Scale },
    ],
  },
  {
    title: 'Inventory & GST',
    items: [
      { key: 'stock-summary', label: 'Stock Summary', shortcut: 'S', icon: Package },
      { key: 'outstanding', label: 'Outstanding Aging', shortcut: 'O', icon: Clock },
      { key: 'gst-report', label: 'GST Invoicing', shortcut: 'R', icon: Percent },
    ],
  },
];

export function AppShell({
  active,
  activeCompany,
  onNavigate,
  onSelectVoucherType,
  onOpenGoTo,
  onOpenChartOfAccounts,
  onExportBackup,
  onOpenCompanyModal,
  onOpenSettings,
  onRefresh,
  isLoading,
  currentVoucherType,
  children,
}: Props) {
  return (
    <div className="min-h-screen bg-[#dbe7ee] text-[#0d222f] flex flex-col font-sans selection:bg-[#fed843] selection:text-[#000000]">
      {/* 1. Global Tally Header */}
      <TallyHeader
        activeCompany={activeCompany}
        onOpenGoTo={onOpenGoTo}
        onExportCSV={onExportBackup}
        onOpenSettings={onOpenSettings}
        onRefresh={onRefresh}
        isLoading={isLoading}
      />

      {/* 2. Main Workspace Layout with Left Sidebar + Content + Right Button Bar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar (Desktop Tally Menu) */}
        <aside className="hidden lg:flex w-52 flex-col bg-[#c9dce7] border-r border-[#8caebd] select-none text-xs">
          <div className="p-2.5 border-b border-[#8caebd] bg-[#004b6e] text-white flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#8caebd]">Navigation</p>
              <p className="text-xs font-bold text-white tracking-wide">Gateway Menu</p>
            </div>
            {activeCompany && (
              <span className="text-[9px] font-mono text-[#000000] bg-[#fed843] px-1.5 py-0.5 border border-[#00253d] font-bold">
                {activeCompany.stateCode || '27'}
              </span>
            )}
          </div>

          <nav className="flex-1 p-1.5 space-y-2 overflow-y-auto">
            {NAV_SECTIONS.map((section) => (
              <div key={section.title} className="space-y-0.5">
                <p className="px-2 pt-1 text-[9px] font-bold uppercase tracking-wider text-[#004b6e]">
                  {section.title}
                </p>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = active === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => onNavigate(item.key)}
                      className={`w-full flex items-center justify-between px-2 py-1.5 font-medium transition-colors cursor-pointer border ${
                        isActive
                          ? 'bg-[#fed843] text-[#000000] border-[#00253d] font-bold shadow-xs'
                          : 'bg-[#edf4f8] text-[#0d222f] border-[#a4c3d4] hover:bg-[#fed843] hover:text-[#000000] hover:border-[#00253d]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <Icon
                          size={13}
                          className={isActive ? 'text-[#000000]' : 'text-[#004b6e]'}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <kbd
                        className={`text-[9px] font-mono px-1 border font-bold ${
                          isActive
                            ? 'text-[#000000] bg-transparent border-[#000000]'
                            : 'text-[#a61a1a] bg-white border-[#8caebd]'
                        }`}
                      >
                        {item.shortcut}
                      </kbd>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="p-2 border-t border-[#8caebd] bg-[#bdd5e3] space-y-1">
            <button
              type="button"
              onClick={onOpenCompanyModal}
              className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold bg-[#edf4f8] border border-[#7ea1b5] text-[#004b6e] hover:bg-[#fed843] hover:text-[#000000] hover:border-[#00253d] transition cursor-pointer"
            >
              <span>Alter Company (F3)</span>
              <kbd className="text-[9px] font-mono font-bold text-[#a61a1a] bg-white px-1 border border-[#8caebd]">
                F3
              </kbd>
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold bg-[#edf4f8] border border-[#7ea1b5] text-[#4a6777] hover:bg-[#fed843] hover:text-[#000000] hover:border-[#00253d] transition cursor-pointer"
            >
              <Settings size={13} className="text-[#004b6e]" />
              <span>Backup &amp; Settings (Q)</span>
            </button>
          </div>
        </aside>

        {/* Center Main Stage */}
        <main className="flex-1 overflow-y-auto bg-[#dbe7ee] p-2 sm:p-3 pb-12 min-w-0">
          <div className="max-w-6xl mx-auto h-full">
            {children}
          </div>
        </main>

        {/* Right Vertical Function Key Button Bar (Tally Prime's Signature) */}
        <div className="hidden md:block">
          <TallyButtonBar
            currentVoucherType={currentVoucherType}
            onSelectVoucherType={onSelectVoucherType}
            onOpenCompany={onOpenCompanyModal}
            onOpenSettings={onOpenSettings}
          />
        </div>
      </div>

      {/* Mobile Bottom Navigation Strip */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#8caebd] bg-[#00253d] text-white lg:hidden">
        <div className="grid grid-cols-5 text-center">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className={`flex flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition ${
              active === 'dashboard'
                ? 'text-[#fed843] font-bold bg-[#003859]'
                : 'text-[#8caebd] hover:text-white'
            }`}
          >
            <LayoutDashboard size={16} />
            <span>Gateway</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('vouchers')}
            className={`flex flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition ${
              active === 'vouchers'
                ? 'text-[#fed843] font-bold bg-[#003859]'
                : 'text-[#8caebd] hover:text-white'
            }`}
          >
            <Plus size={16} />
            <span>Vouchers</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('daybook')}
            className={`flex flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition ${
              active === 'daybook'
                ? 'text-[#fed843] font-bold bg-[#003859]'
                : 'text-[#8caebd] hover:text-white'
            }`}
          >
            <Receipt size={16} />
            <span>Day Book</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('profit-loss')}
            className={`flex flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition ${
              active === 'profit-loss' || active === 'balance-sheet' || active === 'trial-balance'
                ? 'text-[#fed843] font-bold bg-[#003859]'
                : 'text-[#8caebd] hover:text-white'
            }`}
          >
            <TrendingUp size={16} />
            <span>Reports</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('stock-summary')}
            className={`flex flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition ${
              active === 'stock-summary' || active === 'gst-report'
                ? 'text-[#fed843] font-bold bg-[#003859]'
                : 'text-[#8caebd] hover:text-white'
            }`}
          >
            <Package size={16} />
            <span>Inventory</span>
          </button>
        </div>
      </nav>

      {/* 3. Global Tally Bottom Status Bar (Desktop) */}
      <div className="hidden lg:block">
        <TallyBottomBar currentView={active} />
      </div>
    </div>
  );
}
