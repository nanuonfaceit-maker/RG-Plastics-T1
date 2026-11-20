import React, { useState, useMemo } from 'react';
import {
  Folder,
  Plus,
  Search,
  BookOpen,
  ChevronRight,
  ChevronDown,
  Pencil,
} from 'lucide-react';
import type { LedgerAccount, AccountGroup, Voucher } from '@/types/accounting';
import { formatINRWithDrCr, computeLedgerStatement } from '@/services/accountingEngine';

interface Props {
  ledgers: LedgerAccount[];
  groups: AccountGroup[];
  vouchers: Voucher[];
  onSelectLedger: (ledgerId: string) => void;
  onOpenCreateLedger: () => void;
  onEditLedger: (ledger: LedgerAccount) => void;
}

export function ChartOfAccountsView({
  ledgers,
  groups,
  vouchers,
  onSelectLedger,
  onOpenCreateLedger,
  onEditLedger,
}: Props) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groupMap = useMemo(() => {
    const map = new Map<string, { group: AccountGroup; ledgers: LedgerAccount[] }>();
    for (const g of groups) {
      map.set(g.id, { group: g, ledgers: [] });
    }
    for (const l of ledgers) {
      const g = map.get(l.groupId);
      if (g) {
        g.ledgers.push(l);
      } else {
        map.set(l.groupId, {
          group: { id: l.groupId, name: l.groupName || 'Other', nature: l.nature || 'Asset' },
          ledgers: [l],
        });
      }
    }
    return map;
  }, [groups, ledgers]);

  const filteredGroupList = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result: { group: AccountGroup; ledgers: LedgerAccount[] }[] = [];

    for (const entry of groupMap.values()) {
      if (!q) {
        result.push(entry);
      } else {
        const matchesGroup = entry.group.name.toLowerCase().includes(q);
        const matchingLedgers = entry.ledgers.filter(
          (l) => l.name.toLowerCase().includes(q) || (l.gstin && l.gstin.toLowerCase().includes(q))
        );
        if (matchesGroup || matchingLedgers.length > 0) {
          result.push({
            group: entry.group,
            ledgers: matchesGroup ? entry.ledgers : matchingLedgers,
          });
        }
      }
    }

    return result.sort((a, b) => a.group.name.localeCompare(b.group.name));
  }, [groupMap, search]);

  function toggleGroup(id: string) {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="space-y-2 select-none font-sans text-xs">
      {/* Top Tally Header Banner */}
      <div className="border border-[#003859] bg-[#004b6e] text-white p-2 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div>
          <h1 className="text-sm font-black tracking-wide text-white uppercase flex items-center gap-2">
            <span>Chart of Accounts</span>
            <span className="bg-[#fed843] text-black px-1.5 py-0.2 font-mono font-bold text-xs">
              {ledgers.length} Ledgers
            </span>
          </h1>
          <p className="text-[10px] text-[#c2d7e4]">
            Hierarchical directory grouped by Primary Groups and Account Natures
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenCreateLedger}
            className="flex items-center gap-1 px-3 py-1 bg-[#fed843] hover:bg-[#f5cb28] text-black border border-[#00253d] font-black transition-colors cursor-pointer shadow-xs"
          >
            <Plus size={13} />
            <span>Create Ledger (Alt+C)</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-[#f0f5f8] p-1.5 border border-[#8caebd]">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2 text-[#4a6777]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ledgers or account groups..."
            className="w-full bg-white border border-[#8caebd] pl-7 pr-2 py-1 text-xs text-[#0d222f] focus:bg-[#fed843] focus:text-black focus:outline-none font-semibold"
          />
        </div>
      </div>

      {/* Groups List */}
      <div className="space-y-1.5">
        {filteredGroupList.map(({ group, ledgers: grpLedgers }) => {
          const isCollapsed = collapsed[group.id];
          return (
            <div
              key={group.id}
              className="border-2 border-[#004b6e] bg-white overflow-hidden shadow-xs"
            >
              {/* Group Header */}
              <div
                onClick={() => toggleGroup(group.id)}
                className="flex items-center justify-between px-3 py-1.5 bg-[#004b6e] text-white hover:bg-[#003859] cursor-pointer transition select-none"
              >
                <div className="flex items-center gap-1.5 font-black text-xs text-white">
                  {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                  <Folder size={13} className="text-[#fed843]" />
                  <span className="tracking-wide uppercase">{group.name}</span>
                  <span className="text-[10px] text-[#fed843] font-normal font-mono">
                    [{group.nature}]
                  </span>
                </div>
                <span className="bg-[#00253d] px-1.5 py-0.2 text-[9px] font-mono text-[#fed843] border border-[#557e96] font-bold">
                  {grpLedgers.length} Ledgers
                </span>
              </div>

              {/* Ledgers inside group */}
              {!isCollapsed && (
                <div className="divide-y divide-[#c2d7e4]">
                  {grpLedgers.length === 0 ? (
                    <div className="p-2 text-[10px] text-[#4a6777] italic pl-6">
                      No ledgers under this account group.
                    </div>
                  ) : (
                    grpLedgers.map((l) => {
                      const stmt = computeLedgerStatement(l, vouchers);
                      return (
                        <div
                          key={l.id}
                          className="flex items-center justify-between py-1.5 px-3 hover:bg-[#fed843] hover:text-black transition cursor-pointer group"
                          onClick={() => onSelectLedger(l.id)}
                        >
                          <div className="pl-4">
                            <p className="text-xs font-bold text-[#004b6e] group-hover:text-black">
                              {l.name}
                            </p>
                            <p className="text-[9px] text-[#4a6777] group-hover:text-black font-mono">
                              Opening: {formatINRWithDrCr(l.openingBalance, l.openingType)}
                              {l.gstin ? ` • GSTIN: ${l.gstin}` : ''}
                              {l.state ? ` • ${l.state}` : ''}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right font-mono">
                              <span className="text-[9px] text-[#4a6777] group-hover:text-black block uppercase">
                                Closing Bal
                              </span>
                              <span className="text-xs font-black text-[#004b6e] group-hover:text-black">
                                {formatINRWithDrCr(stmt.closingBalance, stmt.closingType)}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditLedger(l);
                              }}
                              className="p-1 text-[#4a6777] hover:text-[#004b6e]"
                              title="Alter Ledger"
                            >
                              <Pencil size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
