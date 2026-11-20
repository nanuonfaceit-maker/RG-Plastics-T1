import React, { useState } from 'react';
import { X, Folder, ChevronRight, ChevronDown, Users, BookOpen, Layers } from 'lucide-react';
import { Party } from '@/types/transaction';
import { TALLY_PRIMARY_GROUPS, AccountGroup } from '@/types/accounting';
import { formatINR } from '@/lib/calculations';

interface Props {
  open: boolean;
  onClose: () => void;
  parties: Party[];
  onSelectParty?: (partyId: string) => void;
}

export function ChartOfAccountsModal({ open, onClose, parties, onSelectParty }: Props) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'curr-assets': true,
    'sundry-debtors': true,
    'curr-liabilities': true,
    'sundry-creditors': true,
  });

  if (!open) return null;

  function toggleGroup(id: string) {
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // Map parties into groups based on their partyType
  const debtors = parties.filter((p) => p.partyType === 'debtor' || !p.partyType);
  const creditors = parties.filter((p) => p.partyType === 'creditor');
  const expenses = parties.filter((p) => p.partyType === 'expense');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none font-sans">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />

      <div className="relative w-full max-w-3xl bg-white border-2 border-[#004b6e] shadow-2xl text-[#0d222f] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#003859] bg-[#004b6e] text-white">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-[#fed843]" />
            <div>
              <h2 className="text-xs font-bold tracking-wider uppercase text-white">Chart of Accounts (Directory)</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-white hover:text-[#fed843] font-bold cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tree Body */}
        <div className="overflow-y-auto p-3 space-y-2.5 font-mono text-xs bg-[#dbe7ee]">
          {/* 1. ASSETS */}
          <div className="border border-[#8caebd] bg-white p-2.5">
            <div className="flex items-center justify-between font-bold text-[#004b6e] text-xs pb-1 border-b border-[#8caebd]">
              <span className="flex items-center gap-2">
                <Layers size={14} /> 1. Assets
              </span>
              <span className="text-[10px] font-bold text-[#003859]">Nature: Debit (Dr)</span>
            </div>

            <div className="mt-2 space-y-1 pl-2">
              {/* Cash in Hand */}
              <div className="flex items-center justify-between py-1 px-2 bg-[#f0f5f8] border border-[#d0e0eb] text-[#0d222f]">
                <span className="flex items-center gap-2">
                  <Folder size={13} className="text-[#004b6e]" /> Current Assets → Cash-in-Hand (Drawer Cash)
                </span>
                <span className="text-[#004b6e] font-sans font-bold text-[10px]">Primary Asset</span>
              </div>

              {/* Bank Accounts */}
              <div className="flex items-center justify-between py-1 px-2 bg-[#f0f5f8] border border-[#d0e0eb] text-[#0d222f]">
                <span className="flex items-center gap-2">
                  <Folder size={13} className="text-[#004b6e]" /> Current Assets → Bank Accounts
                </span>
                <span className="text-[#004b6e] font-sans font-bold text-[10px]">Bank Book</span>
              </div>

              {/* Sundry Debtors */}
              <div className="bg-[#f0f5f8] p-2 border border-[#8caebd]">
                <button
                  type="button"
                  onClick={() => toggleGroup('sundry-debtors')}
                  className="flex w-full items-center justify-between font-bold text-[#004b6e] hover:text-[#00253d] cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    {expandedGroups['sundry-debtors'] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <Folder size={13} className="text-[#004b6e]" /> Sundry Debtors (Customers / Buyers)
                  </span>
                  <span className="bg-[#004b6e] px-2 py-0.5 text-[10px] text-white font-bold">
                    {debtors.length} Ledgers
                  </span>
                </button>

                {expandedGroups['sundry-debtors'] && (
                  <div className="mt-2 space-y-1 pl-3 border-l-2 border-[#004b6e]">
                    {debtors.length === 0 ? (
                      <p className="text-[11px] text-[#4a6777] py-1">No debtor parties created yet.</p>
                    ) : (
                      debtors.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            onSelectParty?.(p.id);
                            onClose();
                          }}
                          className="flex items-center justify-between py-1 px-2 hover:bg-[#fed843] hover:text-black cursor-pointer text-[#0d222f] transition"
                        >
                          <span className="flex items-center gap-1.5 font-bold">
                            <Users size={12} className="text-[#004b6e]" /> {p.name}
                          </span>
                          <span className="font-mono font-bold text-[#004b6e]">
                            Bal: {formatINR(p.currentBalance || p.openingBalance || 0)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. LIABILITIES */}
          <div className="border border-[#8caebd] bg-white p-2.5">
            <div className="flex items-center justify-between font-bold text-[#004b6e] text-xs pb-1 border-b border-[#8caebd]">
              <span className="flex items-center gap-2">
                <Layers size={14} /> 2. Liabilities
              </span>
              <span className="text-[10px] font-bold text-[#003859]">Nature: Credit (Cr)</span>
            </div>

            <div className="mt-2 space-y-1 pl-2">
              {/* Sundry Creditors */}
              <div className="bg-[#f0f5f8] p-2 border border-[#8caebd]">
                <button
                  type="button"
                  onClick={() => toggleGroup('sundry-creditors')}
                  className="flex w-full items-center justify-between font-bold text-[#004b6e] hover:text-[#00253d] cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    {expandedGroups['sundry-creditors'] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <Folder size={13} className="text-[#004b6e]" /> Sundry Creditors (Suppliers / Vendors)
                  </span>
                  <span className="bg-[#004b6e] px-2 py-0.5 text-[10px] text-white font-bold">
                    {creditors.length} Ledgers
                  </span>
                </button>

                {expandedGroups['sundry-creditors'] && (
                  <div className="mt-2 space-y-1 pl-3 border-l-2 border-[#004b6e]">
                    {creditors.length === 0 ? (
                      <p className="text-[11px] text-[#4a6777] py-1">No creditor parties created yet.</p>
                    ) : (
                      creditors.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            onSelectParty?.(p.id);
                            onClose();
                          }}
                          className="flex items-center justify-between py-1 px-2 hover:bg-[#fed843] hover:text-black cursor-pointer text-[#0d222f] transition"
                        >
                          <span className="flex items-center gap-1.5 font-bold">
                            <Users size={12} className="text-[#004b6e]" /> {p.name}
                          </span>
                          <span className="font-mono font-bold text-[#004b6e]">
                            Bal: {formatINR(p.currentBalance || p.openingBalance || 0)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Suspense Account */}
              <div className="flex items-center justify-between py-1 px-2 bg-[#f0f5f8] border border-[#d0e0eb] text-[#0d222f]">
                <span className="flex items-center gap-2">
                  <Folder size={13} className="text-[#004b6e]" /> Suspense Account (Unidentified Receipts)
                </span>
                <span className="text-[#004b6e] font-sans font-bold text-[10px]">Settlement A/c</span>
              </div>
            </div>
          </div>

          {/* 3. INCOME & 4. EXPENSES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="border border-[#8caebd] bg-white p-2.5">
              <div className="font-bold text-[#004b6e] text-xs pb-1 border-b border-[#8caebd] flex items-center justify-between">
                <span>3. Direct Incomes (Sales)</span>
                <span className="text-[10px] font-bold text-[#059669]">Cr</span>
              </div>
              <p className="mt-1 text-[11px] text-[#4a6777]">Sales Account (Plastic Scrap &amp; Granules)</p>
            </div>

            <div className="border border-[#8caebd] bg-white p-2.5">
              <div className="font-bold text-[#004b6e] text-xs pb-1 border-b border-[#8caebd] flex items-center justify-between">
                <span>4. Direct / Indirect Expenses</span>
                <span className="text-[10px] font-bold text-[#a61a1a]">Dr</span>
              </div>
              <p className="mt-1 text-[11px] text-[#4a6777]">
                Purchases A/c, Staff Salary, Factory Rent, Electricity ({expenses.length} Expense Ledgers)
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 py-1.5 bg-[#00253d] border-t border-[#003859] text-[11px] text-white flex items-center justify-between">
          <span className="text-[#8caebd]">Click any ledger to view full transaction history</span>
          <button
            type="button"
            onClick={onClose}
            className="bg-[#fed843] text-[#00253d] px-3 py-0.5 text-xs font-bold border border-[#c99a00] hover:bg-[#ffe570] cursor-pointer"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}
