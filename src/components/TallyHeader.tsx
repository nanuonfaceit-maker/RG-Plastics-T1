import React from 'react';
import { Search, RefreshCw, HelpCircle, Minus, Square, X as CloseIcon } from 'lucide-react';
import type { Company } from '@/types/company';

interface Props {
  activeCompany?: Company | null;
  allCompanies?: Company[];
  onSwitchCompany?: (id: string) => void;
  onOpenGoTo: () => void;
  onExportCSV: () => void;
  onOpenSettings: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function TallyHeader({
  activeCompany,
  allCompanies = [],
  onSwitchCompany,
  onOpenGoTo,
  onExportCSV,
  onOpenSettings,
  onRefresh,
  isLoading,
}: Props) {
  const companyName = activeCompany?.name || 'RG PLASTICS';

  return (
    <header className="sticky top-0 z-40 select-none font-sans text-xs flex flex-col shadow-md">
      {/* 1. TOP SYSTEM TITLE BAR */}
      <div className="h-8 bg-[#00253d] text-white flex items-center justify-between px-3 border-b border-[#001b2c]">
        {/* Left: Tally Prime Brand Emblem & Active Company */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="bg-[#fed843] text-[#000000] px-1.5 py-0.2 text-[10px] font-black tracking-wider shadow-xs">
              TALLY
            </span>
            <span className="text-white font-black text-xs tracking-tight">
              PRIME
            </span>
            <span className="text-[10px] font-semibold text-[#8caebd] px-1 border-l border-[#0e3c5a] hidden sm:inline">
              9.0 Release
            </span>
          </div>

          <div className="h-3.5 w-px bg-[#0e3c5a] hidden sm:block" />

          {/* Active Company Name & Period */}
          <div className="flex items-center gap-2">
            {allCompanies.length > 1 ? (
              <select
                value={activeCompany?.id}
                onChange={(e) => onSwitchCompany?.(e.target.value)}
                className="bg-[#003859] border border-[#557e96] text-white text-[11px] font-bold px-1.5 py-0.5 outline-none cursor-pointer"
              >
                {allCompanies.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#00253d] text-white">
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-bold text-[12px] text-white tracking-wide">
                {companyName}
              </span>
            )}

            <span className="hidden md:inline bg-[#004b6e] text-[#fed843] text-[10px] font-mono px-1.5 py-0.2 border border-[#557e96] font-bold">
              FY 2026-27
            </span>

            <span className="text-[10px] text-[#8caebd] hidden lg:inline">
              (1-Apr-26 to 31-Mar-27)
            </span>
          </div>
        </div>

        {/* Right: License Badge & Native Window Controls */}
        <div className="flex items-center gap-2">
          {isLoading && (
            <RefreshCw size={12} className="animate-spin text-[#fed843]" />
          )}

          <div className="bg-[#003859] border border-[#557e96] text-[#fed843] px-2 py-0.5 text-[10px] font-bold font-mono tracking-wider hidden sm:block">
            GOLD MULTI-USER
          </div>

          {/* Window Buttons */}
          <div className="flex items-center ml-2 border-l border-[#0e3c5a] pl-2 gap-1 text-[#8caebd]">
            <button
              type="button"
              className="p-1 hover:bg-[#003859] hover:text-white"
              title="Minimize"
            >
              <Minus size={11} />
            </button>
            <button
              type="button"
              className="p-1 hover:bg-[#003859] hover:text-white"
              title="Maximize"
            >
              <Square size={10} />
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-1 hover:bg-[#a61a1a] hover:text-white"
              title="Close / Exit"
            >
              <CloseIcon size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. SECONDARY TALLY ACTION RIBBON */}
      <div className="h-9 bg-[#003859] text-white flex items-center justify-between px-2 sm:px-3 border-b border-[#004b6e]">
        {/* Left Menu Items with Underlined Accelerators */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={onOpenSettings}
            className="px-2 py-1 hover:bg-[#004b6e] hover:text-[#fed843] transition font-medium flex items-center text-[11px]"
            title="Press Alt+K for Company Menu"
          >
            <span className="text-[#fed843] font-bold underline mr-0.5">K</span>: Company
          </button>

          <button
            type="button"
            onClick={onExportCSV}
            className="px-2 py-1 hover:bg-[#004b6e] hover:text-[#fed843] transition font-medium flex items-center text-[11px]"
            title="Press Alt+Y for Data Backup"
          >
            <span className="text-[#fed843] font-bold underline mr-0.5">Y</span>: Data
          </button>

          <button
            type="button"
            onClick={onRefresh}
            className="px-2 py-1 hover:bg-[#004b6e] hover:text-[#fed843] transition font-medium hidden md:flex items-center text-[11px]"
            title="Press Alt+Z for Exchange / Sync"
          >
            <span className="text-[#fed843] font-bold underline mr-0.5">Z</span>: Exchange
          </button>
        </div>

        {/* Center: The Iconic "Go To (Alt+G)" Button */}
        <div className="flex-1 max-w-sm mx-2">
          <button
            type="button"
            onClick={onOpenGoTo}
            className="w-full h-6.5 bg-[#002236] border border-[#557e96] hover:border-[#fed843] px-2.5 flex items-center justify-between text-white text-[11px] group transition shadow-inner"
            title="Press Alt+G to open Go To search"
          >
            <div className="flex items-center gap-2">
              <Search size={12} className="text-[#fed843]" />
              <span className="font-bold tracking-wide">
                <span className="text-[#fed843] underline">G</span>o To
              </span>
              <span className="text-[10px] text-[#8caebd] hidden sm:inline">
                (Ledgers, Vouchers, Reports)
              </span>
            </div>
            <kbd className="bg-[#001724] border border-[#557e96] text-[#fed843] font-mono text-[9px] px-1 font-bold">
              Alt+G
            </kbd>
          </button>
        </div>

        {/* Right Menu Items with Underlined Accelerators */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={onExportCSV}
            className="px-2 py-1 hover:bg-[#004b6e] hover:text-[#fed843] transition font-medium hidden sm:flex items-center text-[11px]"
            title="Press Alt+O for Import"
          >
            <span className="text-[#fed843] font-bold underline mr-0.5">O</span>: Import
          </button>

          <button
            type="button"
            onClick={onExportCSV}
            className="px-2 py-1 hover:bg-[#004b6e] hover:text-[#fed843] transition font-medium flex items-center text-[11px]"
            title="Press Alt+E for Export"
          >
            <span className="text-[#fed843] font-bold underline mr-0.5">E</span>: Export
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="px-2 py-1 hover:bg-[#004b6e] hover:text-[#fed843] transition font-medium hidden lg:flex items-center text-[11px]"
            title="Press Alt+P for Print"
          >
            <span className="text-[#fed843] font-bold underline mr-0.5">P</span>: Print
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="px-2 py-1 hover:bg-[#004b6e] hover:text-[#fed843] transition font-medium flex items-center text-[11px]"
            title="Press F1 for Help"
          >
            <span className="text-[#fed843] font-bold mr-0.5">F1</span>: Help
          </button>
        </div>
      </div>
    </header>
  );
}
