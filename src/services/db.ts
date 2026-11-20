/**
 * IndexedDB Database Layer for Tally PWA
 * Zero external dependencies, offline-first, multi-company architecture.
 */
import type { Company } from '@/types/company';
import type { AccountGroup, LedgerAccount, Voucher } from '@/types/accounting';
import type { Godown, StockItem } from '@/types/inventory';

const DB_NAME = 'tally_prime_pwa_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    // Check if indexedDB is supported (browser environment)
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;

      if (!db.objectStoreNames.contains('companies')) {
        db.createObjectStore('companies', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('groups')) {
        const store = db.createObjectStore('groups', { keyPath: 'id' });
        store.createIndex('companyId', 'companyId', { unique: false });
      }

      if (!db.objectStoreNames.contains('ledgers')) {
        const store = db.createObjectStore('ledgers', { keyPath: 'id' });
        store.createIndex('companyId', 'companyId', { unique: false });
        store.createIndex('groupId', 'groupId', { unique: false });
      }

      if (!db.objectStoreNames.contains('vouchers')) {
        const store = db.createObjectStore('vouchers', { keyPath: 'id' });
        store.createIndex('companyId', 'companyId', { unique: false });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('voucherType', 'voucherType', { unique: false });
      }

      if (!db.objectStoreNames.contains('stockItems')) {
        const store = db.createObjectStore('stockItems', { keyPath: 'id' });
        store.createIndex('companyId', 'companyId', { unique: false });
      }

      if (!db.objectStoreNames.contains('godowns')) {
        const store = db.createObjectStore('godowns', { keyPath: 'id' });
        store.createIndex('companyId', 'companyId', { unique: false });
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

// In-memory fallback for test and SSR environments where indexedDB is not available
const inMemoryStores = new Map<string, Map<string, any>>();

function getMemoryStore(name: string): Map<string, any> {
  if (!inMemoryStores.has(name)) {
    inMemoryStores.set(name, new Map());
  }
  return inMemoryStores.get(name)!;
}

// Generic transaction helper
async function tx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T> {
  if (typeof indexedDB === 'undefined') {
    const memStore = getMemoryStore(storeName);
    const mockStore: any = {
      getAll: () => ({ result: Array.from(memStore.values()), onsuccess: null, onerror: null }),
      get: (key: string) => ({ result: memStore.get(key), onsuccess: null, onerror: null }),
      put: (val: any) => {
        const key = val.id || val.key || (val.companyId ? `${val.companyId}_${val.id}` : String(Date.now()));
        memStore.set(key, val);
        return { result: key, onsuccess: null, onerror: null };
      },
      delete: (key: string) => {
        memStore.delete(key);
        return { result: undefined, onsuccess: null, onerror: null };
      },
      clear: () => {
        memStore.clear();
        return { result: undefined, onsuccess: null, onerror: null };
      },
    };
    const req: any = callback(mockStore);
    return req ? req.result : (undefined as unknown as T);
  }

  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const req = callback(store);

    transaction.onerror = () => reject(transaction.error);
    if (req) {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } else {
      transaction.oncomplete = () => resolve(undefined as unknown as T);
    }
  });
}

// ----------------- Companies -----------------
export async function getCompanies(): Promise<Company[]> {
  return tx<Company[]>('companies', 'readonly', (store) => store.getAll());
}

export async function getCompany(id: string): Promise<Company | undefined> {
  return tx<Company | undefined>('companies', 'readonly', (store) => store.get(id));
}

export async function saveCompany(company: Company): Promise<Company> {
  await tx('companies', 'readwrite', (store) => store.put(company));
  return company;
}

export async function deleteCompany(id: string): Promise<void> {
  await tx('companies', 'readwrite', (store) => store.delete(id));
  // Clean up company entities
  const ledgers = await getLedgers(id);
  for (const l of ledgers) await deleteLedger(l.id);
  const vouchers = await getVouchers(id);
  for (const v of vouchers) await deleteVoucher(v.id);
  const stockItems = await getStockItems(id);
  for (const s of stockItems) await deleteStockItem(s.id);
  const godowns = await getGodowns(id);
  for (const g of godowns) await deleteGodown(g.id);
}

// ----------------- Active Company Setting -----------------
export async function getActiveCompanyId(): Promise<string | null> {
  try {
    const res = await tx<{ key: string; value: string } | undefined>('settings', 'readonly', (store) =>
      store.get('activeCompanyId')
    );
    return res?.value || null;
  } catch {
    return null;
  }
}

export async function setActiveCompanyId(id: string): Promise<void> {
  await tx('settings', 'readwrite', (store) => store.put({ key: 'activeCompanyId', value: id }));
}

// ----------------- Account Groups -----------------
export async function getGroups(companyId?: string): Promise<AccountGroup[]> {
  const all = await tx<AccountGroup[]>('groups', 'readonly', (store) => store.getAll());
  if (!companyId) return all;
  return all.filter((g) => !g.companyId || g.companyId === companyId);
}

export async function saveGroup(group: AccountGroup): Promise<AccountGroup> {
  await tx('groups', 'readwrite', (store) => store.put(group));
  return group;
}

// ----------------- Ledgers -----------------
export async function getLedgers(companyId: string): Promise<LedgerAccount[]> {
  const all = await tx<LedgerAccount[]>('ledgers', 'readonly', (store) => store.getAll());
  return all.filter((l) => l.companyId === companyId);
}

export async function getLedger(id: string): Promise<LedgerAccount | undefined> {
  return tx<LedgerAccount | undefined>('ledgers', 'readonly', (store) => store.get(id));
}

export async function saveLedger(ledger: LedgerAccount): Promise<LedgerAccount> {
  await tx('ledgers', 'readwrite', (store) => store.put(ledger));
  return ledger;
}

export async function deleteLedger(id: string): Promise<void> {
  await tx('ledgers', 'readwrite', (store) => store.delete(id));
}

// ----------------- Vouchers -----------------
export async function getVouchers(companyId: string): Promise<Voucher[]> {
  const all = await tx<Voucher[]>('vouchers', 'readonly', (store) => store.getAll());
  return all
    .filter((v) => v.companyId === companyId)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.voucherNumber || '').localeCompare(a.voucherNumber || '')));
}

export async function getVoucher(id: string): Promise<Voucher | undefined> {
  return tx<Voucher | undefined>('vouchers', 'readonly', (store) => store.get(id));
}

export async function saveVoucher(voucher: Voucher): Promise<Voucher> {
  await tx('vouchers', 'readwrite', (store) => store.put(voucher));
  return voucher;
}

export async function deleteVoucher(id: string): Promise<void> {
  await tx('vouchers', 'readwrite', (store) => store.delete(id));
}

// ----------------- Stock Items -----------------
export async function getStockItems(companyId: string): Promise<StockItem[]> {
  const all = await tx<StockItem[]>('stockItems', 'readonly', (store) => store.getAll());
  return all.filter((s) => s.companyId === companyId);
}

export async function saveStockItem(item: StockItem): Promise<StockItem> {
  await tx('stockItems', 'readwrite', (store) => store.put(item));
  return item;
}

export async function deleteStockItem(id: string): Promise<void> {
  await tx('stockItems', 'readwrite', (store) => store.delete(id));
}

// ----------------- Godowns -----------------
export async function getGodowns(companyId: string): Promise<Godown[]> {
  const all = await tx<Godown[]>('godowns', 'readonly', (store) => store.getAll());
  return all.filter((g) => g.companyId === companyId);
}

export async function saveGodown(godown: Godown): Promise<Godown> {
  await tx('godowns', 'readwrite', (store) => store.put(godown));
  return godown;
}

export async function deleteGodown(id: string): Promise<void> {
  await tx('godowns', 'readwrite', (store) => store.delete(id));
}

// ----------------- Backup & Restore (JSON) -----------------
export interface BackupData {
  version: number;
  exportedAt: string;
  companies: Company[];
  groups: AccountGroup[];
  ledgers: LedgerAccount[];
  vouchers: Voucher[];
  stockItems: StockItem[];
  godowns: Godown[];
}

export async function exportBackup(): Promise<string> {
  const [companies, groups, ledgers, vouchers, stockItems, godowns] = await Promise.all([
    tx<Company[]>('companies', 'readonly', (store) => store.getAll()),
    tx<AccountGroup[]>('groups', 'readonly', (store) => store.getAll()),
    tx<LedgerAccount[]>('ledgers', 'readonly', (store) => store.getAll()),
    tx<Voucher[]>('vouchers', 'readonly', (store) => store.getAll()),
    tx<StockItem[]>('stockItems', 'readonly', (store) => store.getAll()),
    tx<Godown[]>('godowns', 'readonly', (store) => store.getAll()),
  ]);

  const backup: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    companies,
    groups,
    ledgers,
    vouchers,
    stockItems,
    godowns,
  };

  return JSON.stringify(backup, null, 2);
}

export async function importBackup(jsonString: string): Promise<{ success: boolean; message: string }> {
  try {
    const raw = JSON.parse(jsonString);

    // Case 1: Standard Tally Prime Backup
    if (raw.companies && Array.isArray(raw.companies)) {
      const data = raw as BackupData;
      for (const c of data.companies || []) await saveCompany(c);
      for (const g of data.groups || []) await saveGroup(g);
      for (const l of data.ledgers || []) await saveLedger(l);
      for (const v of data.vouchers || []) await saveVoucher(v);
      for (const s of data.stockItems || []) await saveStockItem(s);
      for (const gd of data.godowns || []) await saveGodown(gd);

      if (data.companies.length > 0) {
        await setActiveCompanyId(data.companies[0].id);
      }

      return {
        success: true,
        message: `Restored ${data.companies.length} company, ${data.ledgers?.length || 0} ledgers, and ${data.vouchers?.length || 0} vouchers successfully.`,
      };
    }

    // Case 2: Supabase Cloud Vault Snapshot (Parties & Transactions)
    if (raw.transactions || raw.parties || (raw.system && String(raw.system).includes('Vault'))) {
      const activeCompanyId = (await getActiveCompanyId()) || 'comp-rg-plastics';
      let importedParties = 0;
      let importedVouchers = 0;

      if (Array.isArray(raw.parties)) {
        for (const p of raw.parties) {
          const groupId = p.partyType === 'creditor' ? 'sundry-creditors' : 'sundry-debtors';
          await saveLedger({
            id: p.id || `led-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            companyId: activeCompanyId,
            name: p.name || 'Unnamed Party',
            groupId,
            openingBalance: Number(p.openingBalance || p.opening_balance || 0),
            openingType: groupId === 'sundry-debtors' ? 'Dr' : 'Cr',
            gstin: p.gstin,
            phone: p.phone,
            address: p.address,
            state: p.state || 'Maharashtra',
            isSystem: false,
            createdAt: p.createdAt || p.created_at || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          importedParties++;
        }
      }

      if (Array.isArray(raw.transactions)) {
        for (const t of raw.transactions) {
          if (t.isDeleted) continue;
          const isSale = t.type === 'Sale';
          const isPurchase = t.type === 'Purchase';
          const isReceipt = t.type === 'Receipt';
          const isPayment = t.type === 'Payment';
          const vType = isSale ? 'Sales' : isPurchase ? 'Purchase' : isReceipt ? 'Receipt' : isPayment ? 'Payment' : 'Contra';
          const amt = Number(t.amount || 0);

          await saveVoucher({
            id: t.id || `vch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            companyId: activeCompanyId,
            voucherType: vType,
            voucherNumber: t.transactionNo || t.id || `VCH-${Date.now()}`,
            date: t.date || new Date().toISOString().slice(0, 10),
            lines: [
              {
                id: '1',
                ledgerId: t.partyId || 'led-cash',
                ledgerName: t.partyName || 'Cash',
                type: isSale || isPayment ? 'Dr' : 'Cr',
                amount: amt,
              },
              {
                id: '2',
                ledgerId: isSale ? 'led-sales' : isPurchase ? 'led-purchase' : 'led-cash',
                ledgerName: isSale ? 'Sales Account' : isPurchase ? 'Purchase Account' : 'Cash-in-Hand',
                type: isSale || isPayment ? 'Cr' : 'Dr',
                amount: amt,
              },
            ],
            narration: t.notes || t.particulars || '',
            createdAt: t.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          importedVouchers++;
        }
      }

      return {
        success: true,
        message: `Restored Cloud Vault snapshot: ${importedParties} parties converted to ledgers and ${importedVouchers} transactions converted to vouchers.`,
      };
    }

    throw new Error('Unrecognized backup schema. Please upload a valid Tally Prime JSON backup or Cloud Audit Vault snapshot.');
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Failed to import backup.',
    };
  }
}
