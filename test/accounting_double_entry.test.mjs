import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDoubleEntry, TALLY_PRIMARY_GROUPS } from '../src/types/accounting.ts';
import {
  calcTotal,
  round2,
  computeHandCashSummary,
  computePartyBalance,
  computeSuspenseSummary,
  recalculateSuspenseEntry,
  resolvePartyCategory,
} from '../src/lib/calculations.ts';

test('Double-Entry Engine: Successfully validates a balanced Sales Voucher (F8)', () => {
  // Sales to Acme Plastics: Dr Acme Plastics (Debtor) 11,800 | Cr Sales A/c 10,000 | Cr GST Output 1,800
  const lines = [
    { ledgerId: 'l1', ledgerName: 'Acme Plastics', type: 'Dr', amount: 11800 },
    { ledgerId: 'l2', ledgerName: 'Sales Account', type: 'Cr', amount: 10000 },
    { ledgerId: 'l3', ledgerName: 'CGST Output', type: 'Cr', amount: 900 },
    { ledgerId: 'l4', ledgerName: 'SGST Output', type: 'Cr', amount: 900 },
  ];

  const result = validateDoubleEntry(lines);
  assert.equal(result.isValid, true);
  assert.equal(result.totalDebit, 11800);
  assert.equal(result.totalCredit, 11800);
  assert.equal(result.difference, 0);
  assert.equal(result.errors.length, 0);
});

test('Double-Entry Engine: Successfully validates a Contra Voucher (F4: Cash to Bank)', () => {
  // Deposit 25,000 Cash in HDFC Bank: Dr HDFC Bank | Cr Cash-in-Hand
  const lines = [
    { ledgerId: 'b1', ledgerName: 'HDFC Bank Current A/c', type: 'Dr', amount: 25000 },
    { ledgerId: 'c1', ledgerName: 'Cash-in-Hand (Drawer)', type: 'Cr', amount: 25000 },
  ];

  const result = validateDoubleEntry(lines);
  assert.equal(result.isValid, true);
  assert.equal(result.totalDebit, 25000);
  assert.equal(result.totalCredit, 25000);
  assert.equal(result.difference, 0);
});

test('Double-Entry Engine: Successfully validates Payment Voucher (F5) and Receipt Voucher (F6)', () => {
  // Payment to Supplier: Dr Poly Supplies (Creditor) 5000 | Cr Cash 5000
  const payment = [
    { ledgerId: 's1', ledgerName: 'Poly Supplies', type: 'Dr', amount: 5000 },
    { ledgerId: 'c1', ledgerName: 'Cash-in-Hand', type: 'Cr', amount: 5000 },
  ];
  assert.equal(validateDoubleEntry(payment).isValid, true);

  // Receipt from Customer: Dr Cash 4200 | Cr Zenith Moulders (Debtor) 4200
  const receipt = [
    { ledgerId: 'c1', ledgerName: 'Cash-in-Hand', type: 'Dr', amount: 4200 },
    { ledgerId: 'd1', ledgerName: 'Zenith Moulders', type: 'Cr', amount: 4200 },
  ];
  assert.equal(validateDoubleEntry(receipt).isValid, true);
});

test('Double-Entry Engine: REJECTS unbalanced voucher (Debits != Credits)', () => {
  const unbalanced = [
    { ledgerId: 'l1', ledgerName: 'Acme Plastics', type: 'Dr', amount: 10000 },
    { ledgerId: 'l2', ledgerName: 'Sales Account', type: 'Cr', amount: 9500 }, // 500 deficit
  ];

  const result = validateDoubleEntry(unbalanced);
  assert.equal(result.isValid, false);
  assert.equal(result.difference, 500);
  assert.match(result.errors[0], /Double-entry imbalance/);
});

test('Double-Entry Engine: REJECTS single-sided entry', () => {
  const single = [{ ledgerId: 'l1', ledgerName: 'Cash-in-Hand', type: 'Dr', amount: 5000 }];
  const result = validateDoubleEntry(single);
  assert.equal(result.isValid, false);
  assert.match(result.errors[0], /requires at least two ledger lines/);
});

test('Chart of Accounts: Provides standard Tally Primary Groups', () => {
  assert.ok(TALLY_PRIMARY_GROUPS.length >= 14);
  const groupNames = TALLY_PRIMARY_GROUPS.map((g) => g.name);
  assert.ok(groupNames.includes('Current Assets'));
  assert.ok(groupNames.includes('Sundry Debtors'));
  assert.ok(groupNames.includes('Sundry Creditors'));
  assert.ok(groupNames.includes('Bank Accounts'));
  assert.ok(groupNames.includes('Cash-in-Hand'));
  assert.ok(groupNames.includes('Suspense Account'));
});

test('Calculations: Party category resolution and running balances', () => {
  // Creditor running balance
  const creditorTxns = [
    { type: 'Purchase', totalAmount: 10000, partyId: 'p1', partyName: 'Polymer Corp' },
    { type: 'Payment', totalAmount: 4000, partyId: 'p1', partyName: 'Polymer Corp' },
  ];
  // Opening 0: Purchase (-10,000) + Payment (+4,000) = -6,000 (Cr)
  const credBal = computePartyBalance(0, creditorTxns, 'p1', 'Polymer Corp');
  assert.equal(credBal, -6000);

  // Debtor running balance
  const debtorTxns = [
    { type: 'Sale', totalAmount: 15000, partyId: 'd1', partyName: 'Ravi Toys' },
    { type: 'Receipt', totalAmount: 5000, partyId: 'd1', partyName: 'Ravi Toys' },
  ];
  // Opening 0: Sale (+15,000) - Receipt (-5,000) = +10,000 (Dr)
  const debBal = computePartyBalance(0, debtorTxns, 'd1', 'Ravi Toys');
  assert.equal(debBal, 10000);
});

test('Suspense Account: Lifecycle from deposit to partial and full claim', () => {
  let entry = {
    id: 's1',
    entryNo: 'SUS-001',
    date: '2026-10-20',
    amount: 10000,
    narration: 'NEFT transfer from unknown sender',
    status: 'unclaimed',
    claimedAmount: 0,
    availableAmount: 10000,
    claims: [],
  };

  // Initially unclaimed
  let recalculated = recalculateSuspenseEntry(entry, []);
  assert.equal(recalculated.status, 'unclaimed');
  assert.equal(recalculated.availableAmount, 10000);

  // Partial claim of 4,000
  const claim1 = { suspenseEntryId: 's1', amount: 4000, isReversed: false };
  recalculated = recalculateSuspenseEntry(entry, [claim1]);
  assert.equal(recalculated.status, 'partially_claimed');
  assert.equal(recalculated.claimedAmount, 4000);
  assert.equal(recalculated.availableAmount, 6000);

  // Second claim of 6,000 -> fully claimed
  const claim2 = { suspenseEntryId: 's1', amount: 6000, isReversed: false };
  recalculated = recalculateSuspenseEntry(entry, [claim1, claim2]);
  assert.equal(recalculated.status, 'fully_claimed');
  assert.equal(recalculated.claimedAmount, 10000);
  assert.equal(recalculated.availableAmount, 0);

  // Summary counts
  const summary = computeSuspenseSummary([recalculated]);
  assert.equal(summary.fullyClaimedCount, 1);
  assert.equal(summary.unclaimedCount, 0);
  assert.equal(summary.currentBalance, 0);
});
