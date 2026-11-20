import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateHeavyAccountingData,
  runThreeSimulationChecks,
} from '../scripts/simulate-heavy-data.mjs';

test('Heavy Data Simulation: 1,500 Vouchers across 50 Parties, 10 Stock Items, 4 Godowns', () => {
  const data = generateHeavyAccountingData();

  assert.equal(data.vouchers.length, 1500, 'Must generate exactly 1,500 vouchers');
  assert.ok(data.ledgers.length >= 50, 'Must have at least 50 ledgers');
  assert.equal(data.stockItems.length, 10, 'Must have 10 stock items');
  assert.equal(data.godowns.length, 4, 'Must have 4 godowns');

  const results = runThreeSimulationChecks(data);

  // Check 1: Invariants
  assert.equal(results.check1Passed, true, 'Check 1 (Accounting Invariants) must pass');
  assert.equal(results.metrics.trialBalanceDebit, results.metrics.trialBalanceCredit, 'TB Dr must equal TB Cr');
  assert.ok(results.metrics.totalSales > 0, 'Total sales must be recorded');
  assert.ok(results.metrics.totalPurchases > 0, 'Total purchases must be recorded');

  // Check 2: Performance
  assert.equal(results.check2Passed, true, 'Check 2 (Latency Benchmarks < 100ms) must pass');
  assert.ok(results.metrics.totalReportLatencyMs < 200, `Total report latency (${results.metrics.totalReportLatencyMs}ms) must be under 200ms`);

  // Check 3: Vault Backup & Cold Restore
  assert.equal(results.check3Passed, true, 'Check 3 (Vault Backup & Cold Restore Parity) must pass');
  assert.ok(results.metrics.payloadSizeKB > 100, 'Payload size should be non-trivial JSON');
});
