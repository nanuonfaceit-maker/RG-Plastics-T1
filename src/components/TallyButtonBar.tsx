import React from 'react';
import type { TallyVoucherType } from '@/types/accounting';

interface Props {
  currentVoucherType?: string | null;
  onSelectVoucherType: (type: TallyVoucherType) => void;
  onOpenDateFilter?: () => void;
  onOpenCompany?: () => void;
  onOpenSettings?: () => void;
}

interface ButtonItem {
  keyLabel: string;
  actionLabel: string;
  isAlt?: boolean;
  voucherType?: TallyVoucherType;
  action?: 'date' | 'company' | 'settings';
}

const BUTTONS: ButtonItem[] = [
  { keyLabel: 'F2', actionLabel: 'Date', action: 'date' },
  { keyLabel: 'F3', actionLabel: 'Company', action: 'company' },
  { keyLabel: 'F4', actionLabel: 'Contra', voucherType: 'Contra' },
  { keyLabel: 'F5', actionLabel: 'Payment', voucherType: 'Payment' },
  { keyLabel: 'F6', actionLabel: 'Receipt', voucherType: 'Receipt' },
  { keyLabel: 'F7', actionLabel: 'Journal', voucherType: 'Journal' },
  { keyLabel: 'F8', actionLabel: 'Sales', voucherType: 'Sales' },
  { keyLabel: 'F9', actionLabel: 'Purchase', voucherType: 'Purchase' },
  { keyLabel: 'F8', actionLabel: 'Credit Note', isAlt: true, voucherType: 'Credit Note' },
  { keyLabel: 'F9', actionLabel: 'Debit Note', isAlt: true, voucherType: 'Debit Note' },
];

export function TallyButtonBar({
  currentVoucherType,
  onSelectVoucherType,
  onOpenDateFilter,
  onOpenCompany,
  onOpenSettings,
}: Props) {
  function handleClick(item: ButtonItem) {
    if (item.voucherType) {
      onSelectVoucherType(item.voucherType);
    } else if (item.action === 'date') {
      onOpenDateFilter?.();
    } else if (item.action === 'company') {
      onOpenCompany?.();
    } else if (item.action === 'settings') {
      onOpenSettings?.();
    }
  }

  return (
    <aside className="w-28 sm:w-32 xl:w-36 flex-shrink-0 bg-[#c2d7e4] border-l border-[#8caebd] select-none p-1 flex flex-col gap-1 min-h-[calc(100vh-4.25rem)] text-[11px] font-sans">
      <div className="bg-[#004b6e] text-white px-2 py-1 text-[10px] font-black uppercase tracking-wider text-center border border-[#003859]">
        BUTTON BAR
      </div>

      <div className="flex flex-col gap-1 mt-0.5">
        {BUTTONS.map((item, idx) => {
          const isActive = item.voucherType && currentVoucherType === item.voucherType;
          return (
            <button
              key={`${item.keyLabel}-${item.actionLabel}-${idx}`}
              type="button"
              onClick={() => handleClick(item)}
              className={`h-8 px-2 flex items-center justify-between text-left font-semibold border transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#fed843] text-[#000000] border-[#00253d] font-bold shadow-xs'
                  : 'bg-[#edf4f8] text-[#0d222f] border-[#7ea1b5] hover:bg-[#fed843] hover:text-[#000000] hover:border-[#00253d]'
              }`}
            >
              <span className="font-mono text-[10px] tracking-tight">
                {item.isAlt ? (
                  <span className="underline decoration-1 underline-offset-2 font-bold">{item.keyLabel}</span>
                ) : (
                  item.keyLabel
                )}
                :
              </span>
              <span className="truncate ml-1 text-[11px]">{item.actionLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Tally Quick Reference Footnote */}
      <div className="mt-auto p-1.5 bg-[#edf4f8] border border-[#7ea1b5] text-[9px] text-[#4a6777] leading-tight">
        <p className="font-bold text-[#004b6e]">Keyboard Shortcuts</p>
        <p className="mt-0.5"><span className="font-mono font-bold text-[#a61a1a]">F4–F9</span>: Vouchers</p>
        <p><span className="font-mono font-bold text-[#a61a1a]">Esc</span>: Previous Screen</p>
        <p><span className="font-mono font-bold text-[#a61a1a]">Ctrl+A</span>: Quick Accept</p>
      </div>
    </aside>
  );
}
