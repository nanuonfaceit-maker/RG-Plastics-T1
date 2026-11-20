import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calcTotal,
  round2,
  computeHandCashSummary,
  computePartyBalance,
  computePartySummaries,
  computeSuspenseSummary,
  recalculateSuspenseEntry,
  resolvePartyCategory,
} from '../src/lib/calculations.ts';

test('calcTotal calculates item totals and rounds to 2 decimals', () => {
  assert.equal(calcTotal(10, 52.5), 525.0);
  assert.equal(calcTotal(3.333, 10), 33.33);
  assert.equal(calcTotal(0, 100), 0);
  assert.equal(calcTotal(-5, 10), -50);
});

test('computeHandCashSummary reconciles opening cash, inflows and outflows', () => {
  const opening = 5000;
  const transactions = [
    { type: 'Receipt', totalAmount: 1200, source: 'Cash' },
    { type: 'Sale', totalAmount: 800, source: 'Cash' },
    { type: 'Payment', totalAmount: 1500, source: 'Cash' },
    { type: 'Purchase', totalAmount: 500, source: 'Cash' },
    { type: 'Receipt', totalAmount: 10000, source: 'Bank' }, // Bank receipt must NOT affect Hand Cash
  ];
  const suspenseEntries = [
    { amount: 2000, claimedAmount: 500, availableAmount: 1500, status: 'partially_claimed' },
  ];

  const summary = computeHandCashSummary(opening, transactions, suspenseEntries);

  // Inflows = Receipts (1200) + Sales (800) + Suspense deposits (2000) = 4000
  assert.equal(summary.inflows.receipts, 1200);
  assert.equal(summary.inflows.sales, 800);
  assert.equal(summary.inflows.suspenseDeposits, 2000);
  assert.equal(summary.totalCashInflows, 4000);

  // Outflows = Payments (1500) + Purchases (500) = 2000
  assert.equal(summary.outflows.payments, 1500);
  assert.equal(summary.outflows.purchases, 500);
  assert.equal(summary.totalCashOutflows, 2000);

  // Current Hand Cash = 5000 + 4000 - 2000 = 7000
  assert.equal(summary.currentHandCash, 7000);
  assert.equal(summary.unclaimedSuspense, 1500);
});
