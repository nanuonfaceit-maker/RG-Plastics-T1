import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateDoubleEntry,
  computeLedgerStatement,
  computeTrialBalance,
  generateNextVoucherNumber,
  formatINR,
} from '../src/services/accountingEngine.ts';
import {
  DEMO_COMPANY,
  DEMO_LEDGERS,
  DEMO_VOUCHERS,
} from '../src/services/seedData.ts';
import { TALLY_PRIMARY_GROUPS } from '../src/types/accounting.ts';

test('Double-Entry Integrity: Every single demo voucher has Total Dr === Total Cr', () => {
  for (const v of DEMO_VOUCHERS) {
    const res = validateDoubleEntry(v.lines);
    assert.equal(
      res.isValid,
      true,
      `Voucher ${v.voucherNumber} (${v.voucherType}) is not balanced: ${res.errors.join(', ')}`
    );
    assert.equal(res.difference, 0);
  }
});

test('Trial Balance: Grand Total Debits exactly equal Grand Total Credits on Seed Data', () => {
  const tb = computeTrialBalance(DEMO_LEDGERS, TALLY_PRIMARY_GROUPS, DEMO_VOUCHERS);
  assert.equal(tb.isBalanced, true, `Trial balance has a difference of ₹${tb.difference}`);
  assert.equal(tb.difference, 0);
  assert.ok(tb.totalClosingDebit > 0, 'Closing debit total should be positive');
  assert.equal(tb.totalClosingDebit, tb.totalClosingCredit);
});

test('Ledger Statement: Computes running balances with correct Dr/Cr classification', () => {
  const acmeLedger = DEMO_LEDGERS.find((l) => l.name === 'Acme Moulding Works');
  assert.ok(acmeLedger);

  const stmt = computeLedgerStatement(acmeLedger, DEMO_VOUCHERS);
  assert.equal(stmt.openingBalance, 45000);
  assert.equal(stmt.openingType, 'Dr');
  assert.ok(stmt.entries.length >= 3, 'Acme Moulding should have at least 3 transactions');

  // Verify running balance doesn't blow up or NaN
  for (const entry of stmt.entries) {
    assert.ok(Number.isFinite(entry.runningBalance));
    assert.ok(entry.runningBalance >= 0);
    assert.ok(entry.runningType === 'Dr' || entry.runningType === 'Cr');
  }
});

test('Auto-Incrementing Voucher Numbering: Generates sequential numbers per voucher type', () => {
  const nextSales = generateNextVoucherNumber(DEMO_VOUCHERS, 'Sales');
  assert.equal(nextSales, 'SALES-005');

  const nextPurchase = generateNextVoucherNumber(DEMO_VOUCHERS, 'Purchase');
  assert.equal(nextPurchase, 'PURC-004');

  const nextContra = generateNextVoucherNumber(DEMO_VOUCHERS, 'Contra');
  assert.equal(nextContra, 'CNTR-003');
});

test('Indian Currency Formatting: Correctly formats rupees with Indian comma grouping', () => {
  assert.equal(formatINR(100000), '₹1,00,000.00');
  assert.equal(formatINR(1234567.89), '₹12,34,567.89');
  assert.equal(formatINR(500), '₹500.00');
  assert.equal(formatINR(0), '₹0.00');
  assert.equal(formatINR(-5000), '-₹5,000.00');
});
