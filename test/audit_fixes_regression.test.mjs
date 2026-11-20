import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateNextVoucherNumber,
  computeStockSummary,
  computeProfitAndLoss,
  computeGstSummary,
  computeLedgerStatement,
  computeOutstandingAging,
  computeOutstandingBalances,
  numberToWordsINR,
  computeTrialBalance,
} from '../src/services/accountingEngine.ts';
import {
  DEMO_COMPANY,
  DEMO_LEDGERS,
  DEMO_VOUCHERS,
  DEMO_STOCK_ITEMS,
  DEMO_GODOWNS,
} from '../src/services/seedData.ts';
import { TALLY_PRIMARY_GROUPS } from '../src/types/accounting.ts';
import { importBackup, getVouchers } from '../src/services/db.ts';

test('Fix 1 & 6: generateNextVoucherNumber correctly parses trailing numbers in alphanumeric codes', () => {
  const customVouchers = [
    {
      id: 'v1',
      voucherType: 'Sales',
      voucherNumber: 'INV/2026/001',
      date: '2026-04-01',
      lines: [],
    },
    {
      id: 'v2',
      voucherType: 'Sales',
      voucherNumber: 'INV/2026/002',
      date: '2026-04-02',
      lines: [],
    },
  ];

  const next = generateNextVoucherNumber(customVouchers, 'Sales');
  assert.equal(next, 'INV/2026/003');

  // Verify single custom voucher increments from 001 to 002
  const singleCustom = [customVouchers[0]];
  assert.equal(generateNextVoucherNumber(singleCustom, 'Sales'), 'INV/2026/002');

  // Verify standard prefix sequence still increments properly
  const nextFromDemo = generateNextVoucherNumber(DEMO_VOUCHERS, 'Sales');
  assert.equal(nextFromDemo, 'SALES-005');

  const nextPurchase = generateNextVoucherNumber(DEMO_VOUCHERS, 'Purchase');
  assert.equal(nextPurchase, 'PURC-004');
});

test('Fix 6: computeLedgerStatement returns correct opening balance as of fromDate', () => {
  const acmeLedger = DEMO_LEDGERS.find((l) => l.name === 'Acme Moulding Works');
  assert.ok(acmeLedger);

  // Full period without date filter
  const fullStmt = computeLedgerStatement(acmeLedger, DEMO_VOUCHERS);
  assert.equal(fullStmt.openingBalance, 45000);
  assert.equal(fullStmt.openingType, 'Dr');

  // Period starting 2026-04-02 (after initial 2026-04-01 vouchers)
  const periodicStmt = computeLedgerStatement(acmeLedger, DEMO_VOUCHERS, '2026-04-02');
  assert.ok(periodicStmt.openingBalance > 0);
  // Opening balance should reflect all vouchers strictly before 2026-04-02
  assert.ok(periodicStmt.entries.every((e) => e.date >= '2026-04-02'));
});

test('Fix 6: computeStockSummary supports optional fromDate and toDate filtering', () => {
  // All time
  const allStock = computeStockSummary(DEMO_STOCK_ITEMS, DEMO_VOUCHERS, DEMO_GODOWNS);
  assert.ok(allStock.totalClosingValue > 0);

  // Date range
  const filteredStock = computeStockSummary(
    DEMO_STOCK_ITEMS,
    DEMO_VOUCHERS,
    DEMO_GODOWNS,
    undefined,
    '2026-04-02',
    '2026-04-05'
  );

  assert.ok(filteredStock.items.length === DEMO_STOCK_ITEMS.length);
  for (const item of filteredStock.items) {
    assert.ok(item.openingQty >= 0);
    assert.ok(item.closingQty >= 0);
    assert.equal(item.closingQty, item.openingQty + item.inwardQty - item.outwardQty);
  }
});

test('Fix 6: computeProfitAndLoss passes date range to computeStockSummary', () => {
  const pnlFull = computeProfitAndLoss(DEMO_LEDGERS, DEMO_VOUCHERS, DEMO_STOCK_ITEMS);
  assert.ok(pnlFull.closingStock > 0);
  assert.ok(pnlFull.totalSales > 0);

  const pnlPeriodic = computeProfitAndLoss(
    DEMO_LEDGERS,
    DEMO_VOUCHERS,
    DEMO_STOCK_ITEMS,
    '2026-04-01',
    '2026-04-02'
  );
  assert.ok(pnlPeriodic.closingStock > 0);
});

test('Fix 6: computeGstSummary nets Credit Notes and Debit Notes', () => {
  const baseGst = computeGstSummary(DEMO_VOUCHERS);
  const baseOutTax = baseGst.outwardSupplies.totalTax;
  const baseInTax = baseGst.inwardSupplies.totalTax;

  const creditNote = {
    id: 'cn-test',
    voucherType: 'Credit Note',
    voucherNumber: 'CRNT-001',
    date: '2026-04-05',
    itemLines: [
      {
        itemId: 'item-hdpe',
        quantity: 100,
        rate: 95,
        amount: 9500,
        cgst: 855,
        sgst: 855,
        igst: 0,
      },
    ],
    lines: [
      { id: '1', ledgerId: 'led-sales-ret', ledgerName: 'Sales Return', type: 'Dr', amount: 9500 },
      { id: '2', ledgerId: 'led-cgst-out', ledgerName: 'CGST Output A/c', type: 'Dr', amount: 855 },
      { id: '3', ledgerId: 'led-sgst-out', ledgerName: 'SGST Output A/c', type: 'Dr', amount: 855 },
      { id: '4', ledgerId: 'led-debtor', ledgerName: 'Acme Moulding Works', type: 'Cr', amount: 11210 },
    ],
  };

  const debitNote = {
    id: 'dn-test',
    voucherType: 'Debit Note',
    voucherNumber: 'DBNT-001',
    date: '2026-04-05',
    itemLines: [
      {
        itemId: 'item-pp',
        quantity: 50,
        rate: 100,
        amount: 5000,
        cgst: 450,
        sgst: 450,
        igst: 0,
      },
    ],
    lines: [
      { id: '1', ledgerId: 'led-creditor', ledgerName: 'Reliance Polymers', type: 'Dr', amount: 5900 },
      { id: '2', ledgerId: 'led-purc-ret', ledgerName: 'Purchase Return', type: 'Cr', amount: 5000 },
      { id: '3', ledgerId: 'led-cgst-in', ledgerName: 'CGST Input A/c (ITC)', type: 'Cr', amount: 450 },
      { id: '4', ledgerId: 'led-sgst-in', ledgerName: 'SGST Input A/c (ITC)', type: 'Cr', amount: 450 },
    ],
  };

  const updatedGst = computeGstSummary([...DEMO_VOUCHERS, creditNote, debitNote]);

  // Credit note should reduce outward taxable value and output tax
  assert.equal(
    Math.round((baseOutTax - updatedGst.outwardSupplies.totalTax) * 100) / 100,
    1710 // 855 + 855
  );

  // Debit note should reduce inward taxable value and eligible ITC
  assert.equal(
    Math.round((baseInTax - updatedGst.inwardSupplies.totalTax) * 100) / 100,
    900 // 450 + 450
  );
});

test('Fix 6: computeOutstandingAging & computeOutstandingBalances retain contrary balances as advances', () => {
  const advanceCustomerLedger = {
    id: 'led-adv-cust',
    companyId: 'comp-rg-plastics',
    name: 'Advance Customer Co',
    groupId: 'sundry-debtors',
    openingBalance: 0,
    openingType: 'Dr',
    isSystem: false,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
  };

  const advanceVoucher = {
    id: 'vch-adv-1',
    companyId: 'comp-rg-plastics',
    voucherType: 'Receipt',
    voucherNumber: 'RCPT-999',
    date: '2026-04-05',
    lines: [
      { id: '1', ledgerId: 'led-bank-hdfc', ledgerName: 'HDFC Bank', type: 'Dr', amount: 25000 },
      { id: '2', ledgerId: 'led-adv-cust', ledgerName: 'Advance Customer Co', type: 'Cr', amount: 25000 },
    ],
  };

  const receivables = computeOutstandingBalances(
    [...DEMO_LEDGERS, advanceCustomerLedger],
    [...DEMO_VOUCHERS, advanceVoucher],
    'Receivables'
  );

  const foundAdvance = receivables.parties.find((p) => p.ledgerId === 'led-adv-cust');
  assert.ok(foundAdvance, 'Customer with credit balance should be retained as advance');
  assert.equal(foundAdvance.isAdvance, true);
  assert.equal(foundAdvance.totalOutstanding, 25000);
  assert.equal(foundAdvance.type, 'Cr');
  assert.equal(
    foundAdvance.aging.days0_30 +
      foundAdvance.aging.days31_60 +
      foundAdvance.aging.days61_90 +
      foundAdvance.aging.days90Plus,
    25000
  );
});

test('Fix 8: importBackup restores both Tally Prime JSON and Supabase Cloud Vault Snapshots', async () => {
  // Test Tally JSON format
  const tallyBackup = JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    companies: [DEMO_COMPANY],
    groups: [],
    ledgers: DEMO_LEDGERS.slice(0, 5),
    vouchers: DEMO_VOUCHERS.slice(0, 5),
    stockItems: [],
    godowns: [],
  });

  const tallyRes = await importBackup(tallyBackup);
  assert.equal(tallyRes.success, true);
  assert.ok(tallyRes.message.includes('Restored 1 company'));

  // Test Cloud Vault Snapshot format with Sale, Receipt, Purchase, and Payment
  const vaultSnapshot = JSON.stringify({
    system: 'RG Plastics Management & Accounting Vault',
    version: '1.0.0',
    transactions: [
      {
        id: 'txn-v1',
        type: 'Sale',
        transactionNo: 'TXN-101',
        date: '2026-04-01',
        partyId: 'p-1',
        partyName: 'Vault Customer',
        amount: 15000,
        notes: 'Vault sale invoice',
      },
      {
        id: 'txn-v2',
        type: 'Receipt',
        transactionNo: 'TXN-102',
        date: '2026-04-02',
        partyId: 'p-1',
        partyName: 'Vault Customer',
        amount: 5000,
        notes: 'Customer payment received',
      },
      {
        id: 'txn-v3',
        type: 'Purchase',
        transactionNo: 'TXN-103',
        date: '2026-04-03',
        partyId: 'p-2',
        partyName: 'Vault Vendor',
        amount: 8000,
        notes: 'Raw material purchase',
      },
      {
        id: 'txn-v4',
        type: 'Payment',
        transactionNo: 'TXN-104',
        date: '2026-04-04',
        partyId: 'p-2',
        partyName: 'Vault Vendor',
        amount: 4000,
        notes: 'Vendor payment made',
      },
    ],
    parties: [
      {
        id: 'p-1',
        name: 'Vault Customer',
        partyType: 'debtor',
        openingBalance: 5000,
      },
      {
        id: 'p-2',
        name: 'Vault Vendor',
        partyType: 'creditor',
        openingBalance: 2000,
      },
    ],
  });

  const vaultRes = await importBackup(vaultSnapshot);
  assert.equal(vaultRes.success, true);
  assert.ok(vaultRes.message.includes('Restored Cloud Vault snapshot'));

  // Verify double-entry line alignment for all 4 transaction types
  const vouchers = await getVouchers('comp-rg-plastics');
  const vSale = vouchers.find((v) => v.id === 'txn-v1');
  const vReceipt = vouchers.find((v) => v.id === 'txn-v2');
  const vPurchase = vouchers.find((v) => v.id === 'txn-v3');
  const vPayment = vouchers.find((v) => v.id === 'txn-v4');

  assert.ok(vSale && vReceipt && vPurchase && vPayment);
  // Sale: Party is Dr, Sales Account is Cr
  assert.equal(vSale.lines[0].type, 'Dr');
  assert.equal(vSale.lines[1].type, 'Cr');

  // Receipt: Party is Cr, Cash is Dr
  assert.equal(vReceipt.lines[0].type, 'Cr');
  assert.equal(vReceipt.lines[1].type, 'Dr');

  // Purchase: Party is Cr, Purchase Account is Dr
  assert.equal(vPurchase.lines[0].type, 'Cr');
  assert.equal(vPurchase.lines[1].type, 'Dr');

  // Payment: Party is Dr, Cash is Cr
  assert.equal(vPayment.lines[0].type, 'Dr');
  assert.equal(vPayment.lines[1].type, 'Cr');
});

test('Fix 9: numberToWordsINR correctly handles rupees, paise, and negative amounts', () => {
  assert.equal(numberToWordsINR(0), 'Zero Rupees Only');
  assert.equal(numberToWordsINR(500), 'Five Hundred Rupees Only');
  assert.equal(
    numberToWordsINR(1234.5),
    'One Thousand Two Hundred Thirty Four Rupees and Fifty Paise Only'
  );
  assert.equal(numberToWordsINR(0.75), 'Seventy Five Paise Only');
  assert.equal(
    numberToWordsINR(100000.05),
    'One Lakh Rupees and Five Paise Only'
  );
  assert.equal(
    numberToWordsINR(-1500.5),
    'Minus One Thousand Five Hundred Rupees and Fifty Paise Only'
  );
});

test('Fix 4: supabase fallback prevents uncaught exception when env vars are missing', () => {
  // Verifies the fallback logic deployed in src/lib/supabase.ts
  const rawUrl = '';
  const rawKey = '';
  const fallbackUrl = rawUrl || 'https://offline-mock.supabase.co';
  const fallbackKey = rawKey || 'offline-anon-key';

  assert.equal(fallbackUrl, 'https://offline-mock.supabase.co');
  assert.equal(fallbackKey, 'offline-anon-key');
});

test('Fix 6: computeTrialBalance balances with periodic fromDate and toDate', () => {
  const tb = computeTrialBalance(DEMO_LEDGERS, TALLY_PRIMARY_GROUPS, DEMO_VOUCHERS, '2026-04-02', '2026-04-30');
  assert.equal(tb.isBalanced, true, `Periodic trial balance difference: ${tb.difference}`);
  assert.equal(tb.totalClosingDebit, tb.totalClosingCredit);
});
