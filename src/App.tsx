import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Check,
  Download,
  Upload,
  AlertTriangle,
  RotateCcw,
  Building2,
  Database,
  Plus,
  ShieldCheck,
  X,
  Keyboard,
} from 'lucide-react';
import type { Company } from '@/types/company';
import type {
  AccountGroup,
  LedgerAccount,
  Voucher,
  TallyVoucherType,
} from '@/types/accounting';
import type { StockItem, Godown } from '@/types/inventory';
import {
  getDB,
  getCompanies,
  saveCompany,
  getActiveCompanyId,
  setActiveCompanyId,
  getGroups,
  saveGroup,
  getLedgers,
  saveLedger,
  deleteLedger,
  getVouchers,
  saveVoucher,
  deleteVoucher,
  getStockItems,
  saveStockItem,
  getGodowns,
  saveGodown,
  exportBackup,
  importBackup,
} from '@/services/db';
import { exportFullDatabaseVault, downloadVaultJSON } from '@/lib/data';
import { initializeDatabaseWithSeedData, DEMO_COMPANY } from '@/services/seedData';
import { AppShell, AppNavTab } from '@/components/AppShell';
import { GatewayOfTally } from '@/components/GatewayOfTally';
import { VoucherEntryScreen } from '@/components/VoucherEntryScreen';
import { DayBookView } from '@/components/DayBookView';
import { TrialBalanceView } from '@/components/TrialBalanceView';
import { ProfitAndLossView } from '@/components/ProfitAndLossView';
import { BalanceSheetView } from '@/components/BalanceSheetView';
import { StockSummaryView } from '@/components/StockSummaryView';
import { OutstandingView } from '@/components/OutstandingView';
import { GstReportView } from '@/components/GstReportView';
import { ChartOfAccountsView } from '@/components/ChartOfAccountsView';
import { LedgerStatementView } from '@/components/LedgerStatementView';
import { CompanyModal } from '@/components/CompanyModal';
import { LedgerModal } from '@/components/LedgerModal';
import { StockItemModal } from '@/components/StockItemModal';
import { GoToModal } from '@/components/GoToModal';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [groups, setGroups] = useState<AccountGroup[]>([]);
  const [ledgers, setLedgers] = useState<LedgerAccount[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [godowns, setGodowns] = useState<Godown[]>([]);

  // Navigation State
  const [view, setView] = useState<AppNavTab>('dashboard');
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null);

  // Voucher Entry State
  const [voucherType, setVoucherType] = useState<TallyVoucherType>('Sales');
  const [editVoucher, setEditVoucher] = useState<Voucher | null>(null);

  // Ledger Edit State
  const [editLedger, setEditLedger] = useState<LedgerAccount | null>(null);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);

  // Stock Item State
  const [editStockItem, setEditStockItem] = useState<StockItem | null>(null);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);

  // Company Modal State
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);

  // Modals
  const [isGoToOpen, setIsGoToOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Feedback Toast
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // 1. Data Loader
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      await initializeDatabaseWithSeedData();

      const companies = await getCompanies();
      setAllCompanies(companies);

      const currentCompanyId = await getActiveCompanyId();
      let currentCompany = companies.find((c) => c.id === currentCompanyId);

      if (!currentCompany && companies.length > 0) {
        currentCompany = companies[0];
        await setActiveCompanyId(currentCompany.id);
      }

      setActiveCompany(currentCompany || null);

      if (currentCompany) {
        const [gList, lList, vList, sList, gdList] = await Promise.all([
          getGroups(currentCompany.id),
          getLedgers(currentCompany.id),
          getVouchers(currentCompany.id),
          getStockItems(currentCompany.id),
          getGodowns(currentCompany.id),
        ]);

        setGroups(gList);
        setLedgers(lList);
        setVouchers(vList);
        setStockItems(sList);
        setGodowns(gdList);
      }
    } catch (err) {
      console.error('Failed to load accounting data:', err);
      showToast('Error loading database. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Handlers for switching company
  async function handleSwitchCompany(id: string) {
    await setActiveCompanyId(id);
    const target = allCompanies.find((c) => c.id === id);
    if (target) {
      setActiveCompany(target);
      const [gList, lList, vList, sList, gdList] = await Promise.all([
        getGroups(target.id),
        getLedgers(target.id),
        getVouchers(target.id),
        getStockItems(target.id),
        getGodowns(target.id),
      ]);
      setGroups(gList);
      setLedgers(lList);
      setVouchers(vList);
      setStockItems(sList);
      setGodowns(gdList);
      showToast(`Switched to ${target.name}`);
    }
  }

  // Save Voucher
  async function handleSaveVoucher(v: Voucher) {
    if (!activeCompany) return;
    const toSave: Voucher = {
      ...v,
      companyId: activeCompany.id,
      updatedAt: new Date().toISOString(),
    };
    await saveVoucher(toSave);
    const updated = await getVouchers(activeCompany.id);
    setVouchers(updated);
    setEditVoucher(null);
    showToast(`Voucher ${v.voucherNumber} saved successfully`);
    setView('daybook');
  }

  // Delete Voucher
  async function handleDeleteVoucher(id: string) {
    if (!activeCompany) return;
    await deleteVoucher(id);
    const updated = await getVouchers(activeCompany.id);
    setVouchers(updated);
    showToast('Voucher deleted');
  }

  // Duplicate Voucher
  function handleDuplicateVoucher(v: Voucher) {
    setEditVoucher({
      ...v,
      id: `vch-${Date.now()}`,
      voucherNumber: '',
      date: new Date().toISOString().slice(0, 10),
    });
    setVoucherType(v.voucherType);
    setSelectedLedgerId(null);
    setView('vouchers');
  }

  // Save Ledger
  async function handleSaveLedger(l: LedgerAccount) {
    if (!activeCompany) return;
    await saveLedger(l);
    const updated = await getLedgers(activeCompany.id);
    setLedgers(updated);
    setIsLedgerModalOpen(false);
    setEditLedger(null);
    showToast(`Ledger "${l.name}" saved`);
  }

  // Delete Ledger
  async function handleDeleteLedger(id: string) {
    if (!activeCompany) return;
    const isReferenced = vouchers.some((v) => v.lines.some((l) => l.ledgerId === id));
    if (isReferenced) {
      alert(
        'Cannot delete ledger: Transactions/vouchers exist referencing this ledger account. Please delete or modify the referencing vouchers first.'
      );
      return;
    }
    await deleteLedger(id);
    const updated = await getLedgers(activeCompany.id);
    setLedgers(updated);
    setIsLedgerModalOpen(false);
    setEditLedger(null);
    if (selectedLedgerId === id) setSelectedLedgerId(null);
    showToast('Ledger deleted');
  }

  // Save Company
  async function handleSaveCompany(c: Company) {
    await saveCompany(c);
    await setActiveCompanyId(c.id);
    const updatedList = await getCompanies();
    setAllCompanies(updatedList);
    setActiveCompany(c);
    const [gList, lList, vList, sList, gdList] = await Promise.all([
      getGroups(c.id),
      getLedgers(c.id),
      getVouchers(c.id),
      getStockItems(c.id),
      getGodowns(c.id),
    ]);
    setGroups(gList);
    setLedgers(lList);
    setVouchers(vList);
    setStockItems(sList);
    setGodowns(gdList);
    setIsCompanyModalOpen(false);
    showToast(`Company profile updated`);
  }

  // Save Stock Item
  async function handleSaveStockItem(s: StockItem) {
    if (!activeCompany) return;
    await saveStockItem(s);
    const updated = await getStockItems(activeCompany.id);
    setStockItems(updated);
    setIsStockModalOpen(false);
    setEditStockItem(null);
    showToast(`Stock item "${s.name}" saved`);
  }

  // Save Godown
  async function handleSaveGodown(gd: Godown) {
    if (!activeCompany) return;
    await saveGodown(gd);
    const updated = await getGodowns(activeCompany.id);
    setGodowns(updated);
    showToast(`Godown "${gd.name}" added`);
  }

  // Export JSON Backup
  const handleExportBackup = useCallback(async () => {
    try {
      const json = await exportBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tally-prime-backup-${activeCompany?.name || 'company'}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Full backup downloaded as JSON');
    } catch {
      showToast('Failed to export backup.');
    }
  }, [activeCompany, showToast]);

  // Import JSON Backup
  async function handleImportBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const res = await importBackup(text);
      if (res.success) {
        showToast(res.message);
        await loadData();
        setIsSettingsOpen(false);
      } else {
        alert(res.message);
      }
    } catch {
      alert('Invalid backup file. Ensure it is a valid Tally PWA JSON file.');
    }
    e.target.value = '';
  }

  // Reset to Demo Seed Data
  async function handleResetToDemoData() {
    if (!confirm('Are you sure you want to restore demo company and seed data? Any new entries will be preserved or re-seeded.')) {
      return;
    }
    await initializeDatabaseWithSeedData();
    await loadData();
    showToast('Reset to demo data complete.');
    setIsSettingsOpen(false);
  }

  // Navigation router helpers
  const handleNavigate = useCallback((tab: AppNavTab) => {
    setSelectedLedgerId(null);
    if (tab === 'vouchers') {
      setEditVoucher(null);
    }
    setView(tab);
  }, []);

  const handleSelectVoucherType = useCallback((type: TallyVoucherType) => {
    setVoucherType(type);
    setEditVoucher(null);
    setSelectedLedgerId(null);
    setView('vouchers');
    showToast(`Voucher Entry: ${type}`);
  }, [showToast]);

  function handleSelectLedgerDrilldown(ledgerId: string) {
    setSelectedLedgerId(ledgerId);
  }

  // =========================================================================
  // CENTRALIZED GLOBAL KEYBOARD SHORTCUTS MANAGER (CAPTURES AT TOP WINDOW LEVEL)
  // =========================================================================
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      // 1. ESCAPE: High Priority Back & Modal Dismiss
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();

        if (target && isInput) {
          target.blur();
        }

        if (isGoToOpen) {
          setIsGoToOpen(false);
          return;
        }
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
          return;
        }
        if (isCompanyModalOpen) {
          setIsCompanyModalOpen(false);
          return;
        }
        if (isStockModalOpen) {
          setIsStockModalOpen(false);
          setEditStockItem(null);
          return;
        }
        if (isLedgerModalOpen) {
          setIsLedgerModalOpen(false);
          setEditLedger(null);
          return;
        }
        if (selectedLedgerId) {
          setSelectedLedgerId(null);
          return;
        }
        if (view === 'vouchers') {
          // Allow VoucherEntryScreen to handle its own Escape confirmation
          return;
        }
        if (view !== 'dashboard') {
          setView('dashboard');
          setEditVoucher(null);
          return;
        }
        return;
      }

      // 2. Alt / Option / Command Accelerators (Cross-Platform Mac & PC)
      const isKey = (code: string, char: string, macDiacritic?: string) =>
        e.code === code ||
        e.key.toLowerCase() === char.toLowerCase() ||
        (macDiacritic ? e.key === macDiacritic : false);

      // Alt+G / Option+G / Cmd+G: Go To Quick Search
      if ((e.altKey || e.metaKey) && isKey('KeyG', 'g', '©')) {
        e.preventDefault();
        e.stopPropagation();
        setIsGoToOpen((prev) => !prev);
        return;
      }

      // Alt+C / Option+C: Quick Create Ledger / Master
      // For Cmd+C, allow normal copy if inside an input or if text is selected
      if (
        (e.altKey && isKey('KeyC', 'c', 'ç')) ||
        (e.metaKey && isKey('KeyC', 'c', 'ç') && !isInput && !window.getSelection()?.toString())
      ) {
        e.preventDefault();
        e.stopPropagation();
        setEditLedger(null);
        setIsLedgerModalOpen(true);
        return;
      }

      // Alt+E / Option+E / Cmd+E: Export Backup / Data
      if ((e.altKey || e.metaKey) && (isKey('KeyE', 'e', '´') || e.code === 'KeyE')) {
        e.preventDefault();
        e.stopPropagation();
        void handleExportBackup();
        return;
      }

      // Alt+K / Option+K / Cmd+K: Company Alteration
      if ((e.altKey || e.metaKey) && isKey('KeyK', 'k', '˚')) {
        e.preventDefault();
        e.stopPropagation();
        setIsCompanyModalOpen(true);
        return;
      }

      // Alt+Y / Option+Y / Cmd+Y: Data & Backup Center
      if ((e.altKey || e.metaKey) && isKey('KeyY', 'y', '¥')) {
        e.preventDefault();
        e.stopPropagation();
        setIsSettingsOpen(true);
        return;
      }

      // Alt+Z / Option+Z: Exchange / Reload Data
      if ((e.altKey || e.metaKey) && isKey('KeyZ', 'z')) {
        e.preventDefault();
        e.stopPropagation();
        void loadData();
        showToast('Database refreshed');
        return;
      }

      // Alt+O / Option+O / Cmd+O: Import Data
      if ((e.altKey || (e.metaKey && !isInput)) && isKey('KeyO', 'o', 'ø')) {
        e.preventDefault();
        e.stopPropagation();
        setIsSettingsOpen(true);
        return;
      }

      // Alt+P / Option+P / Cmd+P: Print
      if ((e.altKey || e.metaKey) && isKey('KeyP', 'p', 'π')) {
        e.preventDefault();
        e.stopPropagation();
        window.print();
        return;
      }

      // 5. FUNCTION KEYS: F4 to F9 (and Alt+F8, Alt+F9)
      if (e.key === 'F4') {
        e.preventDefault();
        e.stopPropagation();
        handleSelectVoucherType('Contra');
        return;
      }

      if (e.key === 'F5') {
        e.preventDefault();
        e.stopPropagation();
        handleSelectVoucherType('Payment');
        return;
      }

      if (e.key === 'F6') {
        e.preventDefault();
        e.stopPropagation();
        handleSelectVoucherType('Receipt');
        return;
      }

      if (e.key === 'F7') {
        e.preventDefault();
        e.stopPropagation();
        handleSelectVoucherType('Journal');
        return;
      }

      if (e.key === 'F8') {
        e.preventDefault();
        e.stopPropagation();
        if (e.altKey) {
          handleSelectVoucherType('Credit Note');
        } else {
          handleSelectVoucherType('Sales');
        }
        return;
      }

      if (e.key === 'F9') {
        e.preventDefault();
        e.stopPropagation();
        if (e.altKey) {
          handleSelectVoucherType('Debit Note');
        } else {
          handleSelectVoucherType('Purchase');
        }
        return;
      }

      if (e.key === 'F2') {
        e.preventDefault();
        e.stopPropagation();
        showToast('Tip: Use Date filter inputs on reports & Day Book');
        return;
      }

      if (e.key === 'F3') {
        e.preventDefault();
        e.stopPropagation();
        setIsCompanyModalOpen(true);
        return;
      }

      // 6. Ctrl+A / Cmd+A: Accept (Save form)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        if (view === 'vouchers') {
          e.preventDefault();
          e.stopPropagation();
          window.dispatchEvent(new CustomEvent('tally-accept'));
          return;
        }
      }

      // 7. SINGLE-LETTER NAVIGATION SHORTCUTS (Active across all views when NOT typing inside an input)
      if (view !== 'vouchers' && !isInput && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (isGoToOpen || isSettingsOpen || isCompanyModalOpen || isLedgerModalOpen || isStockModalOpen) {
          return;
        }

        const k = e.key.toUpperCase();
        switch (k) {
          case 'G':
            e.preventDefault();
            handleNavigate('gst-report');
            break;
          case 'V':
            e.preventDefault();
            handleSelectVoucherType('Sales');
            break;
          case 'D':
            e.preventDefault();
            handleNavigate('daybook');
            break;
          case 'T':
            e.preventDefault();
            handleNavigate('trial-balance');
            break;
          case 'P':
            e.preventDefault();
            handleNavigate('profit-loss');
            break;
          case 'B':
            e.preventDefault();
            handleNavigate('balance-sheet');
            break;
          case 'S':
            e.preventDefault();
            handleNavigate('stock-summary');
            break;
          case 'O':
            e.preventDefault();
            handleNavigate('outstanding');
            break;
          case 'R':
            e.preventDefault();
            handleNavigate('gst-report');
            break;
          case 'C':
            e.preventDefault();
            setEditLedger(null);
            setIsLedgerModalOpen(true);
            break;
          case 'A':
            e.preventDefault();
            setIsCompanyModalOpen(true);
            break;
          case 'H':
            e.preventDefault();
            handleNavigate('chart-of-accounts');
            break;
          case 'Q':
            e.preventDefault();
            setIsSettingsOpen(true);
            break;
        }
      }
    }

    // Attach with capture: true so we intercept function keys before browser defaults
    window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
  }, [
    isGoToOpen,
    isSettingsOpen,
    isCompanyModalOpen,
    isLedgerModalOpen,
    isStockModalOpen,
    selectedLedgerId,
    view,
    handleSelectVoucherType,
    handleNavigate,
    handleExportBackup,
    showToast,
  ]);

  const selectedLedger = useMemo(() => {
    if (!selectedLedgerId) return null;
    return ledgers.find((l) => l.id === selectedLedgerId) || null;
  }, [selectedLedgerId, ledgers]);

  if (loading && !activeCompany) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#dbe7ee] text-[#00253d] font-mono text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-none border-2 border-[#004b6e] border-t-transparent" />
          <p className="font-bold tracking-wider uppercase text-xs text-[#003859]">Loading Tally Prime Engine &amp; Offline IndexedDB…</p>
        </div>
      </main>
    );
  }

  return (
    <AppShell
      active={view}
      activeCompany={activeCompany}
      onNavigate={handleNavigate}
      onSelectVoucherType={handleSelectVoucherType}
      onOpenGoTo={() => setIsGoToOpen(true)}
      onOpenChartOfAccounts={() => handleNavigate('chart-of-accounts')}
      onExportBackup={handleExportBackup}
      onOpenCompanyModal={() => setIsCompanyModalOpen(true)}
      onOpenSettings={() => setIsSettingsOpen(true)}
      onRefresh={loadData}
      isLoading={loading}
      currentVoucherType={view === 'vouchers' ? voucherType : null}
    >
      {/* 1. Drill-down: Ledger Account Statement */}
      {selectedLedger ? (
        <LedgerStatementView
          ledger={selectedLedger}
          allLedgers={ledgers}
          vouchers={vouchers}
          onBack={() => setSelectedLedgerId(null)}
          onSelectVoucher={(vId) => {
            const v = vouchers.find((item) => item.id === vId);
            if (v) {
              setEditVoucher(v);
              setVoucherType(v.voucherType);
              setSelectedLedgerId(null);
              setView('vouchers');
            }
          }}
          onEditLedger={() => {
            setEditLedger(selectedLedger);
            setIsLedgerModalOpen(true);
          }}
          onChangeLedger={(lId) => setSelectedLedgerId(lId)}
        />
      ) : (
        <>
          {/* 2. Gateway of Tally (Dashboard Home) */}
          {view === 'dashboard' && activeCompany && (
            <GatewayOfTally
              company={activeCompany}
              allCompanies={allCompanies}
              ledgers={ledgers}
              groups={groups}
              vouchers={vouchers}
              stockItems={stockItems}
              onSwitchCompany={handleSwitchCompany}
              onOpenCompanyModal={() => setIsCompanyModalOpen(true)}
              onNavigateTab={(tab) => {
                if (tab === 'settings') setIsSettingsOpen(true);
                else handleNavigate(tab);
              }}
              onOpenCreateVoucher={(type) => {
                if (type) setVoucherType(type as TallyVoucherType);
                setEditVoucher(null);
                setView('vouchers');
              }}
              onOpenCreateLedger={() => {
                setEditLedger(null);
                setIsLedgerModalOpen(true);
              }}
              onExportBackup={handleExportBackup}
            />
          )}

          {/* 3. Voucher Entry Screen (F4 - F9) - Dynamic key ensures full re-mount on type change */}
          {view === 'vouchers' && activeCompany && (
            <VoucherEntryScreen
              key={`${voucherType}-${editVoucher?.id || 'new'}`}
              company={activeCompany}
              existingVoucher={editVoucher}
              initialType={voucherType}
              ledgers={ledgers}
              stockItems={stockItems}
              godowns={godowns}
              allVouchers={vouchers}
              onSave={handleSaveVoucher}
              onCancel={() => setView('daybook')}
              onOpenCreateLedger={() => {
                setEditLedger(null);
                setIsLedgerModalOpen(true);
              }}
            />
          )}

          {/* 4. Day Book */}
          {view === 'daybook' && (
            <DayBookView
              vouchers={vouchers}
              onSelectVoucher={(id) => {
                const v = vouchers.find((item) => item.id === id);
                if (v) {
                  setEditVoucher(v);
                  setVoucherType(v.voucherType);
                  setView('vouchers');
                }
              }}
              onEditVoucher={(v) => {
                setEditVoucher(v);
                setVoucherType(v.voucherType);
                setView('vouchers');
              }}
              onDuplicateVoucher={handleDuplicateVoucher}
              onDeleteVoucher={handleDeleteVoucher}
              onOpenCreateVoucher={(type) => {
                if (type) setVoucherType(type);
                setEditVoucher(null);
                setView('vouchers');
              }}
            />
          )}

          {/* 5. Trial Balance */}
          {view === 'trial-balance' && (
            <TrialBalanceView
              ledgers={ledgers}
              groups={groups}
              vouchers={vouchers}
              onSelectLedger={handleSelectLedgerDrilldown}
            />
          )}

          {/* 6. Profit & Loss Statement */}
          {view === 'profit-loss' && (
            <ProfitAndLossView
              ledgers={ledgers}
              vouchers={vouchers}
              stockItems={stockItems}
              onSelectLedger={handleSelectLedgerDrilldown}
              onOpenStockSummary={() => setView('stock-summary')}
              onBack={() => setView('dashboard')}
            />
          )}

          {/* 7. Balance Sheet */}
          {view === 'balance-sheet' && (
            <BalanceSheetView
              ledgers={ledgers}
              vouchers={vouchers}
              stockItems={stockItems}
              onSelectLedger={handleSelectLedgerDrilldown}
              onOpenStockSummary={() => setView('stock-summary')}
              onBack={() => setView('dashboard')}
            />
          )}

          {/* 8. Stock Summary & Godowns */}
          {view === 'stock-summary' && (
            <StockSummaryView
              stockItems={stockItems}
              godowns={godowns}
              vouchers={vouchers}
              onOpenCreateItem={() => {
                setEditStockItem(null);
                setIsStockModalOpen(true);
              }}
              onSelectVoucher={(id) => {
                const v = vouchers.find((item) => item.id === id);
                if (v) {
                  setEditVoucher(v);
                  setVoucherType(v.voucherType);
                  setView('vouchers');
                }
              }}
              onBack={() => setView('dashboard')}
            />
          )}

          {/* 9. Outstanding Receivables & Payables */}
          {view === 'outstanding' && activeCompany && (
            <OutstandingView
              company={activeCompany}
              ledgers={ledgers}
              vouchers={vouchers}
              onSelectLedger={handleSelectLedgerDrilldown}
              onBack={() => setView('dashboard')}
            />
          )}

          {/* 10. GST Summary & Tax Invoices */}
          {view === 'gst-report' && activeCompany && (
            <GstReportView
              company={activeCompany}
              vouchers={vouchers}
              ledgers={ledgers}
              onSelectVoucher={(id) => {
                const v = vouchers.find((item) => item.id === id);
                if (v) {
                  setEditVoucher(v);
                  setVoucherType(v.voucherType);
                  setView('vouchers');
                }
              }}
              onBack={() => setView('dashboard')}
            />
          )}

          {/* 11. Chart of Accounts Directory */}
          {view === 'chart-of-accounts' && (
            <ChartOfAccountsView
              ledgers={ledgers}
              groups={groups}
              vouchers={vouchers}
              onSelectLedger={handleSelectLedgerDrilldown}
              onOpenCreateLedger={() => {
                setEditLedger(null);
                setIsLedgerModalOpen(true);
              }}
              onEditLedger={(l) => {
                setEditLedger(l);
                setIsLedgerModalOpen(true);
              }}
            />
          )}
        </>
      )}

      {/* ================= MODALS ================= */}

      {/* Company Modal (F3) */}
      <CompanyModal
        open={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        existingCompany={activeCompany}
        onSave={handleSaveCompany}
      />

      {/* Ledger Modal (Alt+C) */}
      {activeCompany && (
        <LedgerModal
          open={isLedgerModalOpen}
          onClose={() => {
            setIsLedgerModalOpen(false);
            setEditLedger(null);
          }}
          companyId={activeCompany.id}
          groups={groups}
          existingLedger={editLedger}
          onSave={handleSaveLedger}
          onDelete={editLedger ? handleDeleteLedger : undefined}
        />
      )}

      {/* Stock Item & Godown Creation Modal (Alt+C in Inventory) */}
      {activeCompany && (
        <StockItemModal
          open={isStockModalOpen}
          onClose={() => {
            setIsStockModalOpen(false);
            setEditStockItem(null);
          }}
          companyId={activeCompany.id}
          godowns={godowns}
          existingItem={editStockItem}
          onSaveItem={handleSaveStockItem}
          onSaveGodown={handleSaveGodown}
        />
      )}

      {/* Tally Prime "Go To" (Alt+G) Modal */}
      <GoToModal
        open={isGoToOpen}
        onClose={() => setIsGoToOpen(false)}
        ledgers={ledgers}
        onNavigateView={(nav) => handleNavigate(nav)}
        onSelectVoucher={handleSelectVoucherType}
        onSelectLedger={handleSelectLedgerDrilldown}
        onOpenCreateLedger={() => {
          setEditLedger(null);
          setIsLedgerModalOpen(true);
        }}
        onOpenCompanyModal={() => setIsCompanyModalOpen(true)}
      />

      {/* Settings / Backup Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 select-none font-sans text-xs">
          <div className="bg-white border-2 border-[#004b6e] text-[#0d222f] max-w-md w-full shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#004b6e] text-white border-b border-[#003859]">
              <div className="flex items-center gap-2">
                <Database size={14} className="text-[#fed843]" />
                <h2 className="text-xs font-black uppercase tracking-wider text-white">Database &amp; Backup Utilities</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="text-white hover:text-[#fed843] p-1 font-bold"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              {/* Active Company Switch */}
              <div>
                <label className="block text-[#004b6e] text-[10px] mb-0.5 font-bold uppercase tracking-wider">
                  Active Company
                </label>
                <select
                  value={activeCompany?.id}
                  onChange={(e) => handleSwitchCompany(e.target.value)}
                  className="w-full bg-white border border-[#8caebd] px-2.5 py-1 text-xs font-semibold text-[#0d222f] outline-none"
                >
                  {allCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.state})
                    </option>
                  ))}
                </select>
              </div>

              {/* Export Backup */}
              <div className="p-2.5 bg-[#f0f5f8] border border-[#8caebd] space-y-1.5">
                <p className="font-bold text-[#004b6e]">Export Offline JSON Backup</p>
                <p className="text-[10px] text-[#4a6777]">
                  Save all companies, chart of accounts, stock items, and vouchers into an offline JSON backup.
                </p>
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="w-full flex items-center justify-center gap-1.5 py-1 bg-[#edf4f8] hover:bg-[#fed843] hover:text-black text-[#004b6e] border border-[#7ea1b5] font-bold transition cursor-pointer"
                >
                  <Download size={13} />
                  <span>Download Backup JSON</span>
                </button>
              </div>

              {/* Supabase Cloud Vault Backup */}
              <div className="p-2.5 bg-[#f0fdf4] border border-[#059669] space-y-1.5">
                <p className="font-bold text-[#059669]">Supabase Cloud Vault Backup</p>
                <p className="text-[10px] text-[#4a6777]">
                  Export full database vault snapshot (all active &amp; audit records) directly from Supabase.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      showToast('Generating Supabase Vault snapshot…');
                      const vault = await exportFullDatabaseVault();
                      downloadVaultJSON(vault);
                      showToast('Cloud database audit vault downloaded');
                    } catch (err) {
                      showToast('Failed to export cloud vault: ' + (err as Error).message);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1 bg-white hover:bg-[#059669] hover:text-white text-[#059669] border border-[#059669] font-bold transition cursor-pointer"
                >
                  <Database size={13} />
                  <span>Download Cloud Audit Vault JSON</span>
                </button>
              </div>

              {/* Import Backup */}
              <div className="p-2.5 bg-[#f0f5f8] border border-[#8caebd] space-y-1.5">
                <p className="font-bold text-[#004b6e]">Restore from JSON Backup (Unified)</p>
                <p className="text-[10px] text-[#4a6777]">
                  Restore offline Tally Prime JSON backups or Supabase Cloud Audit Vault snapshots seamlessly.
                </p>
                <label className="w-full flex items-center justify-center gap-1.5 py-1 bg-[#edf4f8] hover:bg-[#fed843] hover:text-black text-[#004b6e] border border-[#7ea1b5] font-bold cursor-pointer transition">
                  <Upload size={13} />
                  <span>Select Backup File...</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Reset to Demo Data */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleResetToDemoData}
                  className="w-full flex items-center justify-center gap-1.5 py-1 bg-[#fff1f2] hover:bg-[#a61a1a] hover:text-white text-[#a61a1a] border border-[#a61a1a] text-xs font-bold transition cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Restore Demo RG Plastics Data</span>
                </button>
              </div>
            </div>

            <div className="border-t border-[#8caebd] bg-[#f0f5f8] px-3 py-1.5 text-[9px] text-[#4a6777] flex items-center justify-between font-mono">
              <span>TallyPrime Release 9.0</span>
              <span className="flex items-center gap-1 text-[#059669] font-bold">
                <ShieldCheck size={11} />
                IndexedDB + Supabase Vault
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Floating Toast */}
      {toast && (
        <div className="fixed bottom-12 left-1/2 z-50 -translate-x-1/2 pointer-events-none">
          <div className="flex items-center gap-2 bg-[#00253d] border-2 border-[#fed843] px-4 py-1.5 text-xs font-bold text-[#fed843] shadow-2xl font-mono">
            <Check size={14} className="text-[#fed843] shrink-0" />
            <span>{toast}</span>
          </div>
        </div>
      )}
    </AppShell>
  );
}
