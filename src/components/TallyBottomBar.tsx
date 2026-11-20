import React from 'react';

interface Props {
  currentView: string;
}

export function TallyBottomBar({ currentView }: Props) {
  function getBreadcrumb(viewName: string): string {
    switch (viewName) {
      case 'dashboard':
        return 'Gateway of Tally';
      case 'vouchers':
        return 'Gateway of Tally > Transactions > Accounting Voucher Creation';
      case 'daybook':
        return 'Gateway of Tally > Transactions > Day Book';
      case 'trial-balance':
        return 'Gateway of Tally > Reports > Trial Balance';
      case 'profit-loss':
        return 'Gateway of Tally > Reports > Profit & Loss A/c';
      case 'balance-sheet':
        return 'Gateway of Tally > Reports > Balance Sheet';
      case 'stock-summary':
        return 'Gateway of Tally > Inventory > Stock Summary & Godowns';
      case 'outstanding':
        return 'Gateway of Tally > Display More Reports > Outstanding Aging Analysis';
      case 'gst-report':
        return 'Gateway of Tally > Statutory & Taxation > GST Summary & Tax Invoices';
      case 'chart-of-accounts':
        return 'Gateway of Tally > Masters > Chart of Accounts';
      default:
        return 'Gateway of Tally';
    }
  }

  return (
    <footer className="fixed bottom-0 inset-x-0 z-30 h-7 bg-[#00253d] text-[#c2d7e4] border-t border-[#003859] px-3 flex items-center justify-between text-[11px] select-none font-sans">
      {/* Left: Breadcrumb Trail */}
      <div className="flex items-center gap-1.5 truncate">
        <span className="text-[#fed843] font-black">›</span>
        <span className="truncate font-semibold text-white">{getBreadcrumb(currentView)}</span>
      </div>

      {/* Center: Keyboard Legend */}
      <div className="hidden md:flex items-center gap-3 text-[#8caebd] text-[10px]">
        <span><kbd className="text-[#fed843] font-bold">Esc</kbd>: Quit</span>
        <span><kbd className="text-[#fed843] font-bold">Enter</kbd>: Select</span>
        <span><kbd className="text-[#fed843] font-bold">Alt+G</kbd>: Go To</span>
        <span><kbd className="text-[#fed843] font-bold">F4–F9</kbd>: Vouchers</span>
        <span><kbd className="text-[#fed843] font-bold">Ctrl+A</kbd>: Accept</span>
      </div>

      {/* Right: Tally Engine Status */}
      <div className="flex items-center gap-2 text-[#8caebd] text-[10px] font-mono">
        <span className="flex h-1.5 w-1.5 bg-[#10b981]" />
        <span className="hidden sm:inline text-white font-semibold">TallyPrime 9.0</span>
        <span className="hidden lg:inline text-[#fed843]">| Ctrl+N: Calculator</span>
      </div>
    </footer>
  );
}
