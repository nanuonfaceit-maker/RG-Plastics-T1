/**
 * Tally Prime Accounting Model - Double Entry Engine & Chart of Accounts
 */
import type { ItemEntryLine } from './inventory.ts';

export type AccountNature = 'Asset' | 'Liability' | 'Income' | 'Expense' | 'Equity';

export type BalanceType = 'Dr' | 'Cr';

export interface AccountGroup {
  id: string;
  companyId?: string; // empty means global standard Tally group
  name: string;
  nature: AccountNature;
  parentGroupId?: string | null;
  isReserved?: boolean;
}

export interface LedgerAccount {
  id: string;
  companyId: string;
  name: string;
  groupId: string;
  groupName?: string;
  nature: AccountNature;
  openingBalance: number;
  openingType: BalanceType;
  currentBalance?: number;
  currentType?: BalanceType;
  isActive: boolean;
  gstin?: string;
  pan?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  isSystem?: boolean; // Cash, P&L
}

export type TallyVoucherType =
  | 'Contra'     // F4: Bank <-> Cash transfers
  | 'Payment'    // F5: Cash/Bank payments to creditors or expenses
  | 'Receipt'    // F6: Cash/Bank receipts from debtors or income
  | 'Journal'    // F7: Adjustments / Non-cash transactions
  | 'Sales'      // F8: Sales to customers
  | 'Purchase'   // F9: Purchases from suppliers
  | 'Debit Note' // Purchase returns / Supplier debit
  | 'Credit Note';// Sales returns / Customer credit

export interface VoucherEntryLine {
  id: string;
  ledgerId: string;
  ledgerName: string;
  type: BalanceType; // Dr or Cr
  amount: number;
  particulars?: string;
}

export interface Voucher {
  id: string;
  companyId: string;
  voucherType: TallyVoucherType;
  voucherNumber: string;
  date: string; // ISO YYYY-MM-DD
  lines: VoucherEntryLine[];
  itemLines?: ItemEntryLine[];
  narration: string;
  referenceNo?: string;
  isSingleEntryMode?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VoucherValidationResult {
  isValid: boolean;
  totalDebit: number;
  totalCredit: number;
  difference: number;
  errors: string[];
}

/**
 * Validates the core Golden Rule of Double-Entry Bookkeeping:
 * Sum of Debits must exactly equal Sum of Credits.
 */
export function validateDoubleEntry(lines: VoucherEntryLine[]): VoucherValidationResult {
  const errors: string[] = [];

  if (!lines || lines.length < 2) {
    errors.push('A valid double-entry voucher requires at least two ledger lines (one Debit and one Credit).');
  }

  let totalDebit = 0;
  let totalCredit = 0;
  let hasDebit = false;
  let hasCredit = false;

  for (let i = 0; i < (lines || []).length; i++) {
    const line = lines[i];
    const amount = Number(line?.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push(`Line #${i + 1} (${line?.ledgerName || 'Unnamed'}): Amount must be greater than zero.`);
    }

    if (line.type === 'Dr') {
      hasDebit = true;
      totalDebit += Math.round((amount || 0) * 100);
    } else if (line.type === 'Cr') {
      hasCredit = true;
      totalCredit += Math.round((amount || 0) * 100);
    } else {
      errors.push(`Line #${i + 1}: Entry type must be either 'Dr' (Debit) or 'Cr' (Credit).`);
    }
  }

  if (!hasDebit) errors.push('Voucher lacks a Debit (Dr) entry.');
  if (!hasCredit) errors.push('Voucher lacks a Credit (Cr) entry.');

  const diffCents = Math.abs(totalDebit - totalCredit);
  const diffDollars = diffCents / 100;

  if (diffCents !== 0) {
    errors.push(
      `Double-entry imbalance: Total Debits (₹${(totalDebit / 100).toFixed(2)}) does not equal Total Credits (₹${(
        totalCredit / 100
      ).toFixed(2)}). Difference: ₹${diffDollars.toFixed(2)}.`
    );
  }

  return {
    isValid: errors.length === 0,
    totalDebit: totalDebit / 100,
    totalCredit: totalCredit / 100,
    difference: diffDollars,
    errors,
  };
}

/**
 * Preloaded Tally Account Groups (Standard Indian Business CoA hierarchy)
 */
export const TALLY_PRIMARY_GROUPS: AccountGroup[] = [
  // 1. Primary Capital / Equity
  { id: 'capital-account', name: 'Capital Account', nature: 'Equity', isReserved: true },
  { id: 'reserves-surplus', name: 'Reserves & Surplus', nature: 'Equity', parentGroupId: 'capital-account', isReserved: true },

  // 2. Liabilities
  { id: 'loans-liab', name: 'Loans (Liability)', nature: 'Liability', isReserved: true },
  { id: 'bank-od-occ', name: 'Bank OD A/c', nature: 'Liability', parentGroupId: 'loans-liab', isReserved: true },
  { id: 'secured-loans', name: 'Secured Loans', nature: 'Liability', parentGroupId: 'loans-liab', isReserved: true },
  { id: 'unsecured-loans', name: 'Unsecured Loans', nature: 'Liability', parentGroupId: 'loans-liab', isReserved: true },

  { id: 'curr-liabilities', name: 'Current Liabilities', nature: 'Liability', isReserved: true },
  { id: 'duties-taxes', name: 'Duties & Taxes', nature: 'Liability', parentGroupId: 'curr-liabilities', isReserved: true },
  { id: 'provisions', name: 'Provisions', nature: 'Liability', parentGroupId: 'curr-liabilities', isReserved: true },
  { id: 'sundry-creditors', name: 'Sundry Creditors', nature: 'Liability', parentGroupId: 'curr-liabilities', isReserved: true },
  { id: 'suspense-acc', name: 'Suspense Account', nature: 'Liability', isReserved: true },

  // 3. Assets
  { id: 'fixed-assets', name: 'Fixed Assets', nature: 'Asset', isReserved: true },
  { id: 'investments', name: 'Investments', nature: 'Asset', isReserved: true },
  { id: 'curr-assets', name: 'Current Assets', nature: 'Asset', isReserved: true },
  { id: 'stock-in-hand', name: 'Stock-in-Hand', nature: 'Asset', parentGroupId: 'curr-assets', isReserved: true },
  { id: 'deposits-asset', name: 'Deposits (Asset)', nature: 'Asset', parentGroupId: 'curr-assets', isReserved: true },
  { id: 'loans-adv-asset', name: 'Loans & Advances (Asset)', nature: 'Asset', parentGroupId: 'curr-assets', isReserved: true },
  { id: 'sundry-debtors', name: 'Sundry Debtors', nature: 'Asset', parentGroupId: 'curr-assets', isReserved: true },
  { id: 'cash-in-hand', name: 'Cash-in-Hand', nature: 'Asset', parentGroupId: 'curr-assets', isReserved: true },
  { id: 'bank-accounts', name: 'Bank Accounts', nature: 'Asset', parentGroupId: 'curr-assets', isReserved: true },

  // 4. Income
  { id: 'sales-accounts', name: 'Sales Accounts', nature: 'Income', isReserved: true },
  { id: 'direct-income', name: 'Direct Incomes', nature: 'Income', isReserved: true },
  { id: 'indirect-income', name: 'Indirect Incomes', nature: 'Income', isReserved: true },

  // 5. Expense
  { id: 'purchase-accounts', name: 'Purchase Accounts', nature: 'Expense', isReserved: true },
  { id: 'direct-expenses', name: 'Direct Expenses', nature: 'Expense', isReserved: true },
  { id: 'indirect-expenses', name: 'Indirect Expenses', nature: 'Expense', isReserved: true },
];
