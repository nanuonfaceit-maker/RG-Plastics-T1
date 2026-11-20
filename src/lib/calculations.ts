import type {
  Transaction,
  Party,
  PartyCategory,
  PartySummary,
  DashboardStats,
  SuspenseEntry,
  SuspenseClaim,
  SuspenseSummary,
  SuspenseStatus,
  HandCashBreakdown,
} from '@/types/transaction';

export const PARTY_CATEGORIES: {
  key: PartyCategory;
  label: string;
  description: string;
  shortDesc: string;
}[] = [
  {
    key: 'debtor',
    label: 'Debtors',
    description: 'Party is buying from us (Customers)',
    shortDesc: 'Buying from us',
  },
  {
    key: 'creditor',
    label: 'Creditors',
    description: 'Party is selling to us and we are paying (Suppliers/Vendors)',
    shortDesc: 'Selling to us & we pay',
  },
  {
    key: 'suspense',
    label: 'Suspense',
    description: 'Payment done but not known by which party',
    shortDesc: 'Unidentified payment',
  },
  {
    key: 'expense',
    label: 'Expense',
    description: 'Like staff salary, godown rent, light bill, etc.',
    shortDesc: 'Salary, rent, bills, etc.',
  },
  {
    key: 'transfer',
    label: 'Only Transfer',
    description: 'Transfer-only entries between accounts/funds',
    shortDesc: 'Account transfers',
  },
];

export function normalizeCategory(category?: string | null): PartyCategory | '' {
  if (!category) return '';
  const c = category.trim().toLowerCase();
  if (c === 'both') return ''; // 'both' is legacy and must be resolved to a single category
  if (c.includes('deb') || c.includes('cust')) return 'debtor';
  if (c.includes('cred') || c.includes('supp') || c.includes('vend')) return 'creditor';
  if (c.includes('susp')) return 'suspense';
  if (c.includes('exp')) return 'expense';
  if (c.includes('trans') || c.includes('only')) return 'transfer';
  return '';
}

export function resolvePartyCategory(
  partyType?: string | null,
  partyTransactions: Transaction[] = [],
  partyKey?: string,
  partyName?: string
): PartyCategory {
  // If the party already has an explicitly assigned category (not 'both'):
  if (partyType && partyType.toLowerCase() !== 'both') {
    const normalized = normalizeCategory(partyType);
    if (normalized) return normalized;
  }

  // Otherwise, determine category based on the FIRST entry made (chronological):
  const normKey = (partyKey || '').trim().toLowerCase();
  const normName = normalizeParty(partyName || '');

  const related = partyTransactions
    .filter((t) => {
      const isPrimary = (t.partyId && t.partyId.toLowerCase() === normKey) || normalizeParty(t.partyName) === normName;
      const isTransfer = (t.transferPartyId && t.transferPartyId.toLowerCase() === normKey) || (Boolean(t.transferPartyName) && normalizeParty(t.transferPartyName || '') === normName);
      return isPrimary || isTransfer;
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return (a.transactionNo || a.id) < (b.transactionNo || b.id) ? -1 : 1;
    });

  if (related.length > 0) {
    const firstTxn = related[0];
    const isCreditorRole = (firstTxn.partyId && firstTxn.partyId.toLowerCase() === normKey) || normalizeParty(firstTxn.partyName) === normName;

    if (firstTxn.type === 'Sale') {
      return 'debtor';
    }
    if (firstTxn.type === 'Purchase') {
      return 'creditor';
    }
    if (firstTxn.type === 'Payment Transfer') {
      return isCreditorRole ? 'creditor' : 'debtor';
    }
    if (firstTxn.type === 'Payment') {
      return 'creditor';
    }
    if (firstTxn.type === 'Receipt') {
      return 'debtor';
    }
    if (firstTxn.type === 'Stock Transfer') {
      return 'transfer';
    }
  }

  // If no transactions yet, check name heuristics or default
  const lowerName = normName.toLowerCase();
  if (lowerName.includes('cred') || lowerName.includes('supp') || lowerName.includes('vend')) {
    return 'creditor';
  }
  if (lowerName.includes('deb') || lowerName.includes('cust')) {
    return 'debtor';
  }
  if (lowerName.includes('exp') || lowerName.includes('salary') || lowerName.includes('rent')) {
    return 'expense';
  }
  if (lowerName.includes('susp')) {
    return 'suspense';
  }

  return 'debtor';
}

export function getPartyCategoryMeta(category?: string | null) {
  const norm = normalizeCategory(category);
  const found = PARTY_CATEGORIES.find((cat) => cat.key === norm);
  if (found) return found;
  return {
    key: 'debtor' as PartyCategory,
    label: 'Debtors',
    description: 'Party is buying from us (Customers)',
    shortDesc: 'Buying from us',
  };
}

export function computePartyCurrentLoss(
  initialLoss: number = 0,
  totalSales: number = 0,
  totalPurchases: number = 0
): number {
  const init = Number.isFinite(initialLoss) ? initialLoss : 0;
  // Entries that make money with the party offset the loss (net difference = sales - purchases)
  const moneyMade = totalSales - totalPurchases;
  const remainingLoss = init - moneyMade;
  return remainingLoss > 0 ? round2(remainingLoss) : 0;
}

export function calcTotal(quantity: number, ratePerUnit: number): number {
  const q = Number.isFinite(quantity) ? quantity : 0;
  const r = Number.isFinite(ratePerUnit) ? ratePerUnit : 0;
  return Math.round((q * r) * 100) / 100;
}

export function formatINR(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${sign}₹${formatted}`;
}

export function formatNumber(n: number): string {
  return (Number.isFinite(n) ? n : 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  });
}

export function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function normalizeParty(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function computeDashboardStats(
  transactions: Transaction[],
  parties?: Party[]
): DashboardStats {
  let totalSales = 0;
  let totalPurchases = 0;
  const partyKeys = new Set<string>();
  const inactiveNames = new Set<string>();
  const inactiveIds = new Set<string>();

  if (parties) {
    for (const p of parties) {
      if (p.isActive === false || p.isDeleted === true) {
        if (p.id) inactiveIds.add(p.id.toLowerCase());
        if (p.name) inactiveNames.add(normalizeParty(p.name));
      } else if (p.name) {
        partyKeys.add(normalizeParty(p.name));
      }
    }
  }
  for (const t of transactions) {
    if (t.isDeleted) continue;
    const isInactive =
      (t.partyId && inactiveIds.has(t.partyId.toLowerCase())) ||
      (t.partyName && inactiveNames.has(normalizeParty(t.partyName)));

    if (t.partyName && !isInactive) {
      partyKeys.add(normalizeParty(t.partyName));
    }
    if (t.transferPartyName) {
      const isTransferInactive =
        (t.transferPartyId && inactiveIds.has(t.transferPartyId.toLowerCase())) ||
        inactiveNames.has(normalizeParty(t.transferPartyName));
      if (!isTransferInactive) {
        partyKeys.add(normalizeParty(t.transferPartyName));
      }
    }
    if (t.type === 'Sale') totalSales += t.totalAmount;
    else if (t.type === 'Purchase') totalPurchases += t.totalAmount;
  }
  return {
    totalSales: round2(totalSales),
    totalPurchases: round2(totalPurchases),
    netDifference: round2(totalSales - totalPurchases),
    transactionCount: transactions.length,
    uniqueParties: partyKeys.size,
  };
}

export function computePartyBalance(
  openingBalance: number = 0,
  partyTransactions: Transaction[],
  partyKey: string,
  partyName: string
): number {
  const normKey = partyKey.trim().toLowerCase();
  const normName = normalizeParty(partyName);
  let balance = Number.isFinite(openingBalance) ? openingBalance : 0;

  for (const t of partyTransactions) {
    if (t.isDeleted) continue;
    const isPrimaryParty =
      (t.partyId && t.partyId.toLowerCase() === normKey) ||
      normalizeParty(t.partyName) === normName;
    const isTransferParty =
      (t.transferPartyId && t.transferPartyId.toLowerCase() === normKey) ||
      (t.transferPartyName && normalizeParty(t.transferPartyName) === normName);

    if (t.type === 'Payment Transfer') {
      if (isPrimaryParty) {
        // Creditor party in Payment Transfer -> Amount deducted
        balance -= t.totalAmount;
      } else if (isTransferParty) {
        // Debtor party in Payment Transfer -> Amount added
        balance += t.totalAmount;
      }
    } else if (isPrimaryParty) {
      switch (t.type) {
        case 'Sale':
          balance += t.totalAmount;
          break;
        case 'Purchase':
          balance -= t.totalAmount;
          break;
        case 'Receipt':
          balance -= t.totalAmount;
          break;
        case 'Payment':
          balance += t.totalAmount;
          break;
        default:
          break;
      }
    }
  }

  return round2(balance);
}

export function computePartySummaries(
  transactions: Transaction[],
  parties?: Party[]
): PartySummary[] {
  const partyLookup = new Map<string, Party>();
  const inactiveNames = new Set<string>();
  const inactiveIds = new Set<string>();

  if (parties) {
    for (const p of parties) {
      if (p.id) partyLookup.set(p.id.toLowerCase(), p);
      if (p.name) partyLookup.set(normalizeParty(p.name), p);
      if (p.isActive === false || p.isDeleted === true) {
        if (p.id) inactiveIds.add(p.id.toLowerCase());
        if (p.name) inactiveNames.add(normalizeParty(p.name));
      }
    }
  }

  const map = new Map<string, PartySummary>();
  for (const t of transactions) {
    if (t.isDeleted) continue;
    const key = normalizeParty(t.partyName);
    const isInactive =
      (t.partyId && inactiveIds.has(t.partyId.toLowerCase())) ||
      (key && inactiveNames.has(key));

    // Exclude deleted/inactive parties
    if (isInactive) {
      continue;
    }

    if (key) {
      const existing = map.get(key);
      const sales = t.type === 'Sale' ? t.totalAmount : 0;
      const purchases = t.type === 'Purchase' ? t.totalAmount : 0;
      if (existing) {
        existing.transactionCount += 1;
        existing.totalSales = round2(existing.totalSales + sales);
        existing.totalPurchases = round2(existing.totalPurchases + purchases);
        existing.netDifference = round2(existing.totalSales - existing.totalPurchases);
        if (t.date > existing.lastTransactionDate) {
          existing.lastTransactionDate = t.date;
        }
      } else {
        const matchedParty = (t.partyId ? partyLookup.get(t.partyId.toLowerCase()) : undefined) || partyLookup.get(key);
        const initialLoss = matchedParty?.initialLoss ?? 0;
        const openingBalance = matchedParty?.openingBalance ?? 0;
        map.set(key, {
          displayName: t.partyName.trim(),
          key: matchedParty?.id || key,
          partyType: matchedParty?.partyType,
          location: matchedParty?.location,
          investment: matchedParty?.investment ?? 0,
          initialLoss,
          openingBalance,
          currentBalance: openingBalance,
          transactionCount: 1,
          totalSales: round2(sales),
          totalPurchases: round2(purchases),
          netDifference: round2(sales - purchases),
          lastTransactionDate: t.date,
        });
      }
    }

    if (t.type === 'Payment Transfer' && t.transferPartyName) {
      const debtorKey = normalizeParty(t.transferPartyName);
      const isDebtorInactive =
        (t.transferPartyId && inactiveIds.has(t.transferPartyId.toLowerCase())) ||
        (debtorKey && inactiveNames.has(debtorKey));

      if (debtorKey && !isDebtorInactive) {
        const existingDebtor = map.get(debtorKey);
        if (existingDebtor) {
          existingDebtor.transactionCount += 1;
          if (t.date > existingDebtor.lastTransactionDate) {
            existingDebtor.lastTransactionDate = t.date;
          }
        } else {
          const matchedParty = (t.transferPartyId ? partyLookup.get(t.transferPartyId.toLowerCase()) : undefined) || partyLookup.get(debtorKey);
          const initialLoss = matchedParty?.initialLoss ?? 0;
          const openingBalance = matchedParty?.openingBalance ?? 0;
          map.set(debtorKey, {
            displayName: t.transferPartyName.trim(),
            key: matchedParty?.id || debtorKey,
            partyType: matchedParty?.partyType,
            location: matchedParty?.location,
            investment: matchedParty?.investment ?? 0,
            initialLoss,
            openingBalance,
            currentBalance: openingBalance,
            transactionCount: 1,
            totalSales: 0,
            totalPurchases: 0,
            netDifference: 0,
            lastTransactionDate: t.date,
          });
        }
      }
    }
  }

  // Include parties that have 0 transactions yet (ONLY ACTIVE PARTIES)
  if (parties) {
    for (const p of parties) {
      if (p.isActive === false) continue;
      const key = normalizeParty(p.name);
      if (!map.has(key)) {
        map.set(key, {
          displayName: p.name.trim(),
          key: p.id,
          partyType: p.partyType,
          location: p.location,
          investment: p.investment ?? 0,
          initialLoss: p.initialLoss ?? 0,
          currentLoss: p.initialLoss ?? 0,
          openingBalance: p.openingBalance ?? 0,
          currentBalance: p.openingBalance ?? 0,
          transactionCount: 0,
          totalSales: 0,
          totalPurchases: 0,
          netDifference: 0,
          lastTransactionDate: '',
        });
      }
    }
  }

  // Calculate dynamic current loss, opening balance, and live balance
  for (const summary of map.values()) {
    const matchedParty =
      (parties && summary.key ? partyLookup.get(summary.key) : undefined) ||
      partyLookup.get(normalizeParty(summary.displayName));
    const initLoss = matchedParty?.initialLoss ?? summary.initialLoss ?? 0;
    const openBal = matchedParty?.openingBalance ?? summary.openingBalance ?? 0;

    const resolvedCat = resolvePartyCategory(
      matchedParty?.partyType || summary.partyType,
      transactions,
      summary.key,
      summary.displayName
    );
    summary.partyType = resolvedCat;
    summary.location = matchedParty?.location ?? summary.location;
    summary.investment = matchedParty?.investment ?? summary.investment ?? 0;
    summary.initialLoss = initLoss;
    summary.openingBalance = openBal;
    summary.currentLoss = computePartyCurrentLoss(
      initLoss,
      summary.totalSales,
      summary.totalPurchases
    );
    summary.currentBalance = computePartyBalance(
      openBal,
      transactions,
      summary.key,
      summary.displayName
    );
  }

  return Array.from(map.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName, 'en', { sensitivity: 'base' })
  );
}

export function sortByDateDesc(a: Transaction, b: Transaction): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.id < b.id ? 1 : -1;
}

export function round2(n: number): number {
  const num = Number(n);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function recalculateSuspenseEntry(entry: SuspenseEntry, allClaims: SuspenseClaim[]): SuspenseEntry {
  const entryClaims = allClaims.filter((c) => c.suspenseEntryId === entry.id && !c.isReversed);
  const claimedAmount = round2(entryClaims.reduce((sum, c) => sum + Number(c.amount || 0), 0));
  const availableAmount = Math.max(0, round2(Number(entry.amount || 0) - claimedAmount));
  let status: SuspenseStatus = 'unclaimed';
  if (claimedAmount >= Number(entry.amount || 0)) {
    status = 'fully_claimed';
  } else if (claimedAmount > 0) {
    status = 'partially_claimed';
  }
  return {
    ...entry,
    claimedAmount,
    availableAmount,
    status,
    claims: entryClaims,
  };
}

export function computeSuspenseSummary(entries: SuspenseEntry[]): SuspenseSummary {
  let totalDeposited = 0;
  let totalClaimed = 0;
  let unclaimedCount = 0;
  let partiallyClaimedCount = 0;
  let fullyClaimedCount = 0;

  for (const entry of entries) {
    totalDeposited += Number(entry.amount || 0);
    totalClaimed += Number(entry.claimedAmount || 0);
    if (entry.status === 'unclaimed') unclaimedCount++;
    else if (entry.status === 'partially_claimed') partiallyClaimedCount++;
    else if (entry.status === 'fully_claimed') fullyClaimedCount++;
  }

  totalDeposited = round2(totalDeposited);
  totalClaimed = round2(totalClaimed);
  const currentBalance = Math.max(0, round2(totalDeposited - totalClaimed));

  return {
    currentBalance,
    totalDeposited,
    totalClaimed,
    unclaimedCount,
    partiallyClaimedCount,
    fullyClaimedCount,
    totalEntriesCount: entries.length,
  };
}

export function computeHandCashSummary(
  openingHandCash: number = 0,
  transactions: Transaction[] = [],
  suspenseEntries: SuspenseEntry[] = []
): HandCashBreakdown {
  let receipts = 0;
  let sales = 0;
  let transfersIn = 0;
  let suspenseDeposits = 0;

  let payments = 0;
  let purchases = 0;
  let transfersOut = 0;

  for (const s of suspenseEntries || []) {
    if (!s) continue;
    const amount = Number(s?.amount || 0);
    if (amount > 0) {
      suspenseDeposits += amount;
    }
  }

  for (const t of transactions || []) {
    if (!t || t.isDeleted) continue;
    const source = (t?.source || 'Cash').trim().toLowerCase();
    const isCash = source === 'cash';
    if (!isCash) continue;

    const isSuspenseClaimReceipt =
      t.type === 'Receipt' &&
      (Boolean(t.narration?.includes('[Suspense Claim:')) ||
       Boolean(t.itemName?.includes('Suspense Claim Settlement')) ||
       (t.source as string) === 'Suspense');

    const total = Number.isFinite(Number(t?.totalAmount)) ? Number(t.totalAmount) : 0;

    if (t.type === 'Receipt') {
      if (!isSuspenseClaimReceipt) {
        receipts += total;
      }
    } else if (t.type === 'Sale') {
      sales += total;
    } else if (t.type === 'Payment Transfer') {
      if (t.transferRole === 'debitor') {
        transfersIn += total;
      } else {
        transfersOut += total;
      }
    } else if (t.type === 'Payment') {
      payments += total;
    } else if (t.type === 'Purchase') {
      purchases += total;
    }
  }

  const totalCashInflows = round2(receipts + sales + transfersIn + suspenseDeposits);
  const totalCashOutflows = round2(payments + purchases + transfersOut);
  const currentHandCash = round2(Number(openingHandCash || 0) + totalCashInflows - totalCashOutflows);

  const unclaimedSuspense = round2(
    (suspenseEntries || []).reduce((sum, s) => {
      if (!s) return sum;
      const avail = s.availableAmount !== undefined
        ? Number(s.availableAmount)
        : Math.max(0, Number(s.amount || 0) - Number(s.claimedAmount || 0));
      return sum + (Number.isFinite(avail) ? Math.max(0, avail) : 0);
    }, 0)
  );

  return {
    openingHandCash: round2(openingHandCash || 0),
    currentHandCash,
    unclaimedSuspense,
    totalCashInflows,
    totalCashOutflows,
    inflows: {
      receipts: round2(receipts),
      sales: round2(sales),
      transfersIn: round2(transfersIn),
      suspenseDeposits: round2(suspenseDeposits),
    },
    outflows: {
      payments: round2(payments),
      purchases: round2(purchases),
      transfersOut: round2(transfersOut),
    },
  };
}

export function sanitizeCSVCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str = String(value);
  const isFormula = /^[=+\-@\t]/.test(str);
  if (isFormula) {
    str = `'${str}`;
  }
  return (isFormula || /[",\n\r]/.test(str)) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function suspenseToCSV(entries: SuspenseEntry[], claims?: SuspenseClaim[]): string {
  const header = ['Entry No', 'Date', 'Original Amount', 'Claimed Amount', 'Available Balance', 'Status', 'Reference No', 'Narration', 'Claims Count'];
  const rows = entries.map((e) => [
    sanitizeCSVCell(e.entryNo),
    sanitizeCSVCell(e.date),
    e.amount.toFixed(2),
    e.claimedAmount.toFixed(2),
    e.availableAmount.toFixed(2),
    sanitizeCSVCell(e.status),
    sanitizeCSVCell(e.referenceNo || ''),
    sanitizeCSVCell(e.narration || ''),
    claims ? claims.filter((c) => c.suspenseEntryId === e.id).length : (e.claims || []).length,
  ]);
  return [header.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

export function suspenseClaimsToCSV(claims: SuspenseClaim[]): string {
  const header = ['Claim No', 'Entry ID', 'Claim Date', 'Party Name', 'Amount', 'Reference No', 'Narration', 'Reversed'];
  const rows = claims.map((c) => [
    sanitizeCSVCell(c.claimNo),
    sanitizeCSVCell(c.suspenseEntryId),
    sanitizeCSVCell(c.claimDate),
    sanitizeCSVCell(c.partyName || c.partyId),
    c.amount.toFixed(2),
    sanitizeCSVCell(c.referenceNo || ''),
    sanitizeCSVCell(c.narration || ''),
    c.isReversed ? 'YES' : 'NO',
  ]);
  return [header.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

