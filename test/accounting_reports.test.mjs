import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeStockSummary,
  computeProfitAndLoss,
  computeBalanceSheet,
  computeGstSummary,
  computeOutstandingAging,
  formatINR,
} from '../src/services/accountingEngine.ts';
import {
  DEMO_COMPANY,
  DEMO_GODOWNS,
  DEMO_STOCK_ITEMS,
  DEMO_LEDGERS,
  DEMO_VOUCHERS,
} from '../src/services/seedData.ts';

test('Inventory & Stock Valuation: Computes correct weighted average closing stock and godowns', () => {
  const stockSummary = computeStockSummary(DEMO_STOCK_ITEMS, DEMO_VOUCHERS, DEMO_GODOWNS);
  
  assert.equal(stockSummary.items.length, DEMO_STOCK_ITEMS.length);
  assert.equal(stockSummary.totalOpeningValue, 655000); // 225k + 220k + 144k + 66k
  assert.ok(stockSummary.totalClosingValue > 0, 'Closing stock valuation must be positive');
  assert.ok(stockSummary.totalInwardValue > 0, 'Inward purchases should be tracked');
  assert.ok(stockSummary.totalOutwardValue > 0, 'Outward sales should be tracked');

  // Verify PP Granules Natural movements
  const ppItem = stockSummary.items.find((i) => i.item.id === 'item-pp-granules');
  assert.ok(ppItem);
  assert.equal(ppItem.openingQty, 2500);
  assert.ok(ppItem.outwardQty >= 500, 'PP Granules was sold');
  assert.equal(ppItem.closingQty, ppItem.openingQty + ppItem.inwardQty - ppItem.outwardQty);
});

test('Profit & Loss Statement: Trading Account and Net Profit Calculation', () => {
  const pnl = computeProfitAndLoss(DEMO_LEDGERS, DEMO_VOUCHERS, DEMO_STOCK_ITEMS);

  assert.equal(pnl.openingStock, 655000);
  assert.ok(pnl.totalPurchases > 0, 'Purchases must be recorded');
  assert.ok(pnl.totalSales > 0, 'Sales must be recorded');
  assert.ok(pnl.closingStock > 0, 'Closing stock must be positive');

  // Trading balance identity: Total Trading Credit = Sales + Direct Incomes + Closing Stock
  assert.equal(
    pnl.totalTradingCredit,
    Math.round((pnl.totalSales + pnl.totalDirectIncomes + pnl.closingStock) * 100) / 100
  );

  // Trading debit identity: Total Trading Debit = Opening Stock + Purchases + Direct Expenses
  assert.equal(
    pnl.totalTradingDebit,
    Math.round((pnl.openingStock + pnl.totalPurchases + pnl.totalDirectExpenses) * 100) / 100
  );

  // Net Profit integrity
  assert.ok(typeof pnl.isNetProfit === 'boolean');
  assert.ok(Number.isFinite(pnl.netProfit));
  assert.ok(Number.isFinite(pnl.netLoss));
});

test('Balance Sheet Integrity: Total Liabilities & Equity must equal Total Assets', () => {
  const bs = computeBalanceSheet(DEMO_LEDGERS, DEMO_VOUCHERS, DEMO_STOCK_ITEMS);

  assert.ok(bs.totalLiabilities > 0, 'Total liabilities must be positive');
  assert.ok(bs.totalAssets > 0, 'Total assets must be positive');

  // Strict double-entry balance sheet test:
  assert.equal(
    bs.isBalanced,
    true,
    `Balance Sheet does not balance! Assets: ₹${bs.totalAssets}, Liabilities: ₹${bs.totalLiabilities}, Diff: ₹${bs.difference}`
  );
  assert.ok(bs.difference < 0.05, `Difference must be < 5 paise, got: ${bs.difference}`);
});

test('GST Summary: Computes outward output tax, inward input tax credit, and net payable', () => {
  const gst = computeGstSummary(DEMO_VOUCHERS);

  assert.ok(gst.outwardSupplies.taxableValue > 0);
  assert.ok(gst.outwardSupplies.totalTax > 0);
  assert.ok(gst.inwardSupplies.taxableValue > 0);
  assert.ok(gst.inwardSupplies.totalTax > 0);
  assert.ok(gst.b2bSalesCount > 0);
  assert.ok(gst.b2bPurchaseCount > 0);

  // Verify total tax equals CGST + SGST + IGST
  const expectedOutTax =
    Math.round((gst.outwardSupplies.cgst + gst.outwardSupplies.sgst + gst.outwardSupplies.igst) * 100) / 100;
  assert.equal(gst.outwardSupplies.totalTax, expectedOutTax);

  const expectedInTax =
    Math.round((gst.inwardSupplies.cgst + gst.inwardSupplies.sgst + gst.inwardSupplies.igst) * 100) / 100;
  assert.equal(gst.inwardSupplies.totalTax, expectedInTax);
});

test('Outstanding Receivables & Payables with Ageing Brackets', () => {
  const receivables = computeOutstandingAging(DEMO_LEDGERS, DEMO_VOUCHERS, 'Receivables');
  assert.ok(receivables.totalOutstanding > 0, 'Receivables total should be positive');
  assert.ok(receivables.parties.length > 0, 'Should have receivable parties');

  for (const party of receivables.parties) {
    const sumAging =
      party.aging.days0_30 + party.aging.days31_60 + party.aging.days61_90 + party.aging.days90Plus;
    assert.equal(
      Math.round(sumAging * 100) / 100,
      party.totalOutstanding,
      `Aging brackets must sum to party total for ${party.partyName}`
    );
  }

  const payables = computeOutstandingAging(DEMO_LEDGERS, DEMO_VOUCHERS, 'Payables');
  assert.ok(payables.totalOutstanding > 0, 'Payables total should be positive');
  assert.ok(payables.parties.length > 0, 'Should have payable parties');

  for (const party of payables.parties) {
    const sumAging =
      party.aging.days0_30 + party.aging.days31_60 + party.aging.days61_90 + party.aging.days90Plus;
    assert.equal(
      Math.round(sumAging * 100) / 100,
      party.totalOutstanding,
      `Aging brackets must sum to party total for ${party.partyName}`
    );
  }
});
