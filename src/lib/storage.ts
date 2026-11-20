import { Transaction } from '@/types/transaction';
import { getDemoTransactions } from './demo-data';

const STORAGE_KEY = 'rg-plastics-transactions-v1';

export function loadTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = getDemoTransactions();
      saveTransactions(seed);
      return seed;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      const seed = getDemoTransactions();
      saveTransactions(seed);
      return seed;
    }
    // Basic validation / normalisation
    return parsed
      .filter((t) => t && typeof t.id === 'string')
      .map((t) => ({
        id: String(t.id),
        partyId: String(t.partyId ?? ''),
        date: String(t.date),
        partyName: String(t.partyName ?? ''),
        narration: String(t.narration ?? ''),
        type: (['Sale', 'Purchase', 'Payment', 'Receipt', 'Stock Transfer', 'Payment Transfer'].includes(t.type)
          ? t.type
          : 'Sale') as Transaction['type'],
        itemName: String(t.itemName ?? ''),
        quantity: Number(t.quantity) || 0,
        ratePerUnit: Number(t.ratePerUnit) || 0,
        totalAmount: Number(t.totalAmount) || 0,
        source: t.source === 'Bank' ? 'Bank' : t.source === 'Cash' ? 'Cash' : undefined,
        transferPartyId: typeof t.transferPartyId === 'string' ? t.transferPartyId : undefined,
        transferPartyName: typeof t.transferPartyName === 'string' ? t.transferPartyName : undefined,
        transferRole: t.transferRole === 'debitor' ? 'debitor' : t.transferRole === 'creditor' ? 'creditor' : undefined,
        items: Array.isArray(t.items) ? t.items.map((item: Record<string, unknown>) => ({
          id: typeof item.id === 'string' ? item.id : undefined,
          itemName: String(item.itemName ?? ''),
          quantity: Number(item.quantity) || 0,
          unit: String(item.unit ?? 'kg'),
          ratePerUnit: Number(item.ratePerUnit) || 0,
          totalAmount: Number(item.totalAmount) || 0,
        })) : [{
          itemName: String(t.itemName ?? ''), quantity: Number(t.quantity) || 0,
          unit: 'kg', ratePerUnit: Number(t.ratePerUnit) || 0, totalAmount: Number(t.totalAmount) || 0,
        }],
      }));
  } catch {
    const seed = getDemoTransactions();
    saveTransactions(seed);
    return seed;
  }
}

export function saveTransactions(transactions: Transaction[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch {
    // ignore quota / private mode errors
  }
}

export function resetDemoData(): Transaction[] {
  const seed = getDemoTransactions();
  saveTransactions(seed);
  return seed;
}
