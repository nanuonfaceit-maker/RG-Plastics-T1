# TEST_READY: Opaque-Box E2E Test Suite Publication

**Date**: 2026-10-20  
**Suite Owner**: `teamwork_preview_test_writer_e2e`  
**Test Suite Path**: `scratch/test_e2e_opaque.mjs`  
**Infrastructure Guide**: `TEST_INFRA.md`  
**Authoritative Reference**: `ORIGINAL_REQUEST.md` & `PROJECT.md`  
**Primary Execution Command**:
```bash
npx vite-node scratch/test_e2e_opaque.mjs
```

---

## 1. Test Suite Summary & Metrics

| Tier | Category | Total Tests | Passed | Pending / Failed | Pass Rate | Primary Focus |
|---|---|---|---|---|---|---|
| **Tier 1** | Feature Coverage | 24 | 14 | 10 | 58.3% | Hand Cash formula, itemless Receipt, Suspense lifecycle, Opening Cash persistence |
| **Tier 2** | Boundary & Corner Cases | 32 | 24 | 8 | 75.0% | Zero opening cash, negative/zero rejection, exact balance claim, 0.01 under/over limits, float precision |
| **Tier 3** | Cross-Feature Combinations | 18 | 9 | 9 | 50.0% | Receipt + Suspense claiming, multi-party claims, mixed Bank/Cash, inactive parties |
| **Tier 4** | Real-World Acceptance Scenarios | 7 | 0 | 7 | 0.0% | Authoritative 6-step end-to-end acceptance sequence from `ORIGINAL_REQUEST.md` |
| **TOTAL** | **All Tiers** | **81** | **47** | **34** | **58.0%** | Comprehensive opaque-box requirement verification |

---

## 2. Test Breakdown by Domain & Tier

### Tier 1: Feature Coverage (24 Tests)
- **Feature 1: Hand Cash Formula & Balance Aggregation (7 tests)**
  - `T1.1.1`: Hand Cash equals Opening Hand Cash when zero transactions/suspense entries exist.
  - `T1.1.2`: Inflows from Cash Receipts increase Hand Cash by exact receipt total.
  - `T1.1.3`: Inflows from Cash Sales increase Hand Cash, while Cash Purchases decrease Hand Cash.
  - `T1.1.4`: Suspense entry deposit increases Hand Cash by entry amount as an inflow.
  - `T1.1.5`: Anti-double-counting rule: Suspense claim settlement receipts are excluded from cash inflows.
  - `T1.1.6`: Cash Transfers: Payment Transfer as debitor is an inflow; as creditor is an outflow.
  - `T1.1.7`: Bank-sourced transactions (Receipt, Payment, Sale, Purchase) are strictly excluded from Hand Cash.
- **Feature 2: Receipt Transactions & Itemless Workflow (6 tests)**
  - `T1.2.1`: Receipt transaction decreases debtor party balance (accounting convention: $balance -= receipt$).
  - `T1.2.2`: Receipt transaction model enforces `items: []` with 0 phantom rows.
  - `T1.2.3`: Receipt validation enforces positive non-zero amount ($amount > 0$).
  - `T1.2.4`: Receipt validation rejects missing or unselected party.
  - `T1.2.5`: Rapid double-click submission prevention guard ensures single execution.
  - `T1.2.6`: CSV export formats Receipt transaction cleanly without unit rate or NaN items.
- **Feature 3: Suspense Deposits & Claims (6 tests)**
  - `T1.3.1`: Recording new Suspense entry starts as unclaimed with full available balance and 0 claimed amount.
  - `T1.3.2`: Partial claim transitions entry status to `partially_claimed` and deducts available amount.
  - `T1.3.3`: Multiple claims totaling 100% of deposit transition entry to `fully_claimed` ($available = 0$).
  - `T1.3.4`: Claiming suspense against a party credits the party ledger balance by claim amount.
  - `T1.3.5`: Claiming suspense leaves Hand Cash unchanged (reconciliation invariant: cash entered at deposit).
  - `T1.3.6`: Reversing a suspense claim restores available balance and reverts entry status.
- **Feature 4: Opening Cash Persistence (5 tests)**
  - `T1.4.1`: Opening Cash contract specifies default of 0 when unconfigured.
  - `T1.4.2`: Opening Cash setting data contract contains required persistent fields (`OpeningCashSetting`).
  - `T1.4.3`: Opening Cash audit history tracks changed amount, timestamp, and notes (`OpeningCashHistory`).
  - `T1.4.4`: Role enforcement contract: Admin role required; non-admin modification rejected.
  - `T1.4.5`: Opening Cash persistence interface exported in `src/lib/data.ts`.

### Tier 2: Boundary & Corner Cases (32 Tests)
- **Boundary 1: Zero Opening Cash (5 tests)**: `T2.1.1` to `T2.1.5` covering zero opening cash with zero txns, positive receipt, cash overdraft/deficit (-₹300), suspense deposit, and numeric 0.00 non-nullish preservation.
- **Boundary 2: Negative and Zero Amount Rejection (6 tests)**: `T2.2.1` to `T2.2.6` covering receipt zero amount, negative amount, non-numeric/NaN strings, zero suspense deposit, negative suspense deposit, and zero/negative claim amounts.
- **Boundary 3: Claiming Exact Available Balance (5 tests)**: `T2.3.1` to `T2.3.5` covering single 100% claim, two sequential claims, three fractional claims, remaining balance exhaustion, and partial reversal.
- **Boundary 4: Claiming 0.01 Under Limit (5 tests)**: `T2.4.1` to `T2.4.5` covering ₹4,999.99 claim on ₹5,000.00 leaving ₹0.01 available, status retention as `partially_claimed`, hand cash invariance, subsequent ₹0.01 claim to zero out, and drift-free summation.
- **Boundary 5: Claiming 0.01 Over Limit (5 tests)**: `T2.5.1` to `T2.5.5` covering strict rejection of ₹5,000.01 on ₹5,000.00 entry, rejection of ₹2,000.01 on ₹2,000.00 remaining balance, rejection of 0.02 on 0.01 balance, rejection of 0.01 on fully claimed entry, and state mutation immunity upon rejection.
- **Boundary 6: Float Precision Roundings (6 tests)**: `T2.6.1` to `T2.6.6` covering IEEE 754 precision correction ($0.10 + 0.20 = 0.30$), half-up rounding (100.005 -> 100.01), three-way fractional summation (333.33 + 333.33 + 333.34 = 1000.00), breakdown fractional roundings, high-magnitude rupee values (₹15,000,001.00), and rate-quantity multiplication.

### Tier 3: Cross-Feature Combinations (18 Tests)
- **Combination 1: Receipt + Suspense Claiming Interaction (4 tests)**: `T3.1.1` to `T3.1.4` verifying dual debt reduction, non-double-counted claim receipts, zero balance clearance, and summary isolation.
- **Combination 2: Multiple Partial Claims Across Multiple Parties (5 tests)**: `T3.2.1` to `T3.2.5` verifying ₹10,000 suspense entry split across Party A, B, and C, sequential hand cash invariance, individual ledger deductions, incremental available balance drops, and selective claim reversal.
- **Combination 3: Mixed Bank/Cash Transactions (5 tests)**: `T3.3.1` to `T3.3.5` verifying interleaved Cash and Bank receipts, interleaved payments, mixed inflow classification, Payment Transfer source routing, and multi-source ledger reconciliation.
- **Combination 4: Inactive / Deleted Party Handling (4 tests)**: `T3.4.1` to `T3.4.4` verifying inactive party receipt excluded from summaries but included in drawer cash, claims against inactive parties in suspense logs, unique party count exclusion on Dashboard, and ledger restoration upon reactivation.

### Tier 4: Real-World Acceptance Scenarios (7 Tests)
- `T4.1.1` (Step 1): Setting Opening Hand Cash to ₹10,000 yields Hand Cash = ₹10,000, Unclaimed Suspense = ₹0.
- `T4.1.2` (Step 2): Saving ₹3,000 Receipt yields Hand Cash = ₹13,000, Party A balance reduced by ₹3,000, 0 phantom items.
- `T4.1.3` (Step 3): Recording ₹5,000 Suspense entry yields Hand Cash = ₹18,000, Unclaimed Suspense = ₹5,000.
- `T4.1.4` (Step 4): Claiming ₹2,000 against Party A leaves Hand Cash at ₹18,000, Unclaimed Suspense = ₹3,000, Party A credited ₹2,000.
- `T4.1.5` (Step 5): Claiming remaining ₹3,000 against Party B leaves Hand Cash at ₹18,000, Unclaimed Suspense = ₹0, Party B credited ₹3,000.
- `T4.1.6` (Step 6): Attempting claim > available balance is rejected; state remains unaffected.
- `T4.1.7` (Step 7): Cumulative audit state verification confirming all inflows (₹8,000), outflows (₹0), net hand cash (₹18,000), and party ledger credits.

---

## 3. Implementation Escalation Report

The 34 pending test failures are strictly isolated to missing exports in pending milestones:

### 1. Milestone 1 Escalation (`teamwork_preview_worker_m1`)
- **Required Exports in `src/lib/data.ts`**:
  ```ts
  export async function loadOpeningHandCash(): Promise<number>;
  export async function saveOpeningHandCash(amount: number, notes?: string): Promise<void>;
  ```
- **Failing Test**: `T1.4.5`.
- **Target Resolution**: Complete Feature F2 in Milestone 1.

### 2. Milestone 3 Escalation (Dashboard & Hand Cash Worker)
- **Required Export in `src/lib/calculations.ts`**:
  ```ts
  export function computeHandCashSummary(
    openingHandCash: number,
    transactions: Transaction[],
    suspenseEntries: SuspenseEntry[]
  ): HandCashBreakdown;
  ```
- **Failing Tests**: 33 tests across Tiers 1, 2, 3, and 4 (`T1.1.1`–`T1.1.7`, `T1.3.5`, `T1.4.1`, `T2.1.1`–`T2.1.5`, `T2.4.3`, `T2.6.4`–`T2.6.5`, `T3.1.1`–`T3.1.2`, `T3.2.2`, `T3.3.1`–`T3.3.5`, `T3.4.1`, `T4.1.1`–`T4.1.7`).
- **Target Resolution**: Implement Feature F5 (`computeHandCashSummary`) in Milestone 3 following the authoritative formula and anti-double-counting rule documented in `TEST_INFRA.md § 4`.

---

## 4. Verification & Milestone 4 Gate

When Milestone 1, Milestone 2, and Milestone 3 are integrated, Milestone 4 will run:
```bash
npx vite-node scratch/test_e2e_opaque.mjs
```
Expected result upon Milestone 4 integration: **81 / 81 tests passing (100%) cleanly with exit code 0**.
