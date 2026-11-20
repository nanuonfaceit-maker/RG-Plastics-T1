export type TransactionType =
  | 'Sale'
  | 'Purchase'
  | 'Payment'
  | 'Receipt'
  | 'Stock Transfer'
  | 'Payment Transfer';

export interface TransactionItem {
  id?: string;
  itemName: string;
  quantity: number;
  unit: string;
  ratePerUnit: number;
  totalAmount: number;
}

export type PartyCategory = 'debtor' | 'creditor' | 'suspense' | 'expense' | 'transfer';

export interface Party {
  id: string;
  name: string;
  partyType?: PartyCategory | string | null;
  location?: string;
  investment?: number;
  initialLoss?: number;
  openingBalance?: number;
  currentBalance?: number;
  isActive: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface Transaction {
  id: string;
  transactionNo?: string;
  date: string; // ISO yyyy-mm-dd
  partyId: string;
  partyName: string;
  partyType?: PartyCategory | string | null;
  narration: string;
  type: TransactionType;
  itemName: string;
  quantity: number;
  ratePerUnit: number;
  totalAmount: number;
  amount?: number;
  referenceNo?: string;
  /** Full database-backed item list. The fields above mirror the first item for existing views. */
  items: TransactionItem[];
  /** Optional fields for Payment, Receipt, and Payment Transfer */
  source?: 'Cash' | 'Bank';
  transferPartyId?: string;
  transferPartyName?: string;
  transferRole?: 'creditor' | 'debitor';
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface PartySummary {
  displayName: string;
  key: string;
  partyType?: PartyCategory | string | null;
  location?: string;
  investment?: number;
  initialLoss?: number;
  currentLoss?: number;
  openingBalance?: number;
  currentBalance?: number;
  transactionCount: number;
  totalSales: number;
  totalPurchases: number;
  netDifference: number;
  lastTransactionDate: string;
}

export interface DashboardStats {
  totalSales: number;
  totalPurchases: number;
  netDifference: number;
  transactionCount: number;
  uniqueParties: number;
}

export type SuspenseStatus = 'unclaimed' | 'partially_claimed' | 'fully_claimed';

export interface SuspenseClaim {
  id: string;
  claimNo: string;
  suspenseEntryId: string;
  partyId: string;
  partyName?: string;
  transactionId?: string;
  claimDate: string;
  amount: number;
  narration?: string;
  referenceNo?: string;
  isReversed?: boolean;
  reversalReason?: string;
  createdAt: string;
}

export interface SuspenseEntry {
  id: string;
  entryNo: string;
  date: string;
  amount: number;
  narration: string;
  referenceNo?: string;
  status: SuspenseStatus;
  claimedAmount: number;
  availableAmount: number;
  claims: SuspenseClaim[];
  createdAt: string;
}

export interface SuspenseSummary {
  currentBalance: number;
  totalDeposited: number;
  totalClaimed: number;
  unclaimedCount: number;
  partiallyClaimedCount: number;
  fullyClaimedCount: number;
  totalEntriesCount: number;
}

export interface OpeningCashSetting {
  id: string;
  amount: number;
  updatedAt: string;
  updatedBy?: string;
  notes?: string;
}

export interface OpeningCashHistory {
  id: string;
  amount: number;
  createdAt: string;
  changedAt?: string;
  createdBy?: string;
  changedBy?: string;
  notes?: string;
}

export interface HandCashBreakdown {
  openingHandCash: number;
  currentHandCash: number;
  unclaimedSuspense: number;
  totalCashInflows: number;
  totalCashOutflows: number;
  inflows: {
    receipts: number;
    sales: number;
    transfersIn: number;
    suspenseDeposits: number;
  };
  outflows: {
    payments: number;
    purchases: number;
    transfersOut: number;
  };
}

export interface AuditLogEntry {
  id: string;
  tableName: string;
  recordId: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'RESTORE';
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  performedBy?: string;
  createdAt: string;
}

export interface DatabaseVaultSnapshot {
  exportedAt: string;
  system: string;
  version: string;
  counts: {
    transactions: number;
    deletedTransactions: number;
    parties: number;
    suspenseEntries: number;
    suspenseClaims: number;
    auditLogs: number;
  };
  transactions: Transaction[];
  parties: Party[];
  suspenseEntries: SuspenseEntry[];
  suspenseClaims: SuspenseClaim[];
  openingCashSetting: number;
  auditLogs?: AuditLogEntry[];
}


