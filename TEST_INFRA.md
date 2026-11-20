# Test Infrastructure & Opaque-Box E2E Testing Guide

## 1. Executive Summary & Testing Philosophy

The testing infrastructure for **RG Plastics** is architected to guarantee deterministic, requirement-driven verification across all core accounting workflows, state persistence layers, and calculation engines.

### Opaque-Box Requirement-Driven Strategy
- **Decoupled from Implementation Details**: Tests are derived strictly from authoritative specifications documented in `ORIGINAL_REQUEST.md` and `PROJECT.md § Interface Contracts`.
- **Pure Functional Isolation & Zero Network Flakiness**: Tests execute against deterministic in-memory calculation engines and validated data service contracts without external network dependencies or flaky HTTP timeouts.
- **Progressive Testability**: The test harness supports dual-track execution—foundational accounting logic and existing regression suites pass continuously, while milestone-specific contract endpoints (e.g. `computeHandCashSummary`, `loadOpeningHandCash`) are asserted with actionable failure diagnostics until implemented by respective milestone workers.

---

## 2. Test Execution Environment & Toolchain

### Runner Environment
- **Runtime**: Node.js (v18+) with standard assertion library (`node:assert`).
- **Execution Engine**: `npx vite-node` (bundled with `vite`).
- **Why `vite-node`**:
  1. Resolves Vite TypeScript path aliases (`@/*` -> `./src/*`) defined in `tsconfig.app.json`.
  2. Synthesizes Vite's `import.meta.env` context without requiring global Node loader hooks or external transpile steps.
  3. Executes TypeScript files (`.ts`, `.tsx`, `.mjs`) directly with sub-second startup times.

### Test Suites Inventory
| Suite File | Scope / Purpose | Test Count | Execution Command |
|---|---|---|---|
| `scratch/test_e2e_opaque.mjs` | Comprehensive Opaque-Box Requirement-Driven E2E Suite (Tiers 1–4) | 81 tests | `npx vite-node scratch/test_e2e_opaque.mjs` |
| `scratch/test_comprehensive.mjs` | Core System Regression Suite (Party mapping, Dashboard, Summaries, Suspense, CSV, Precision) | 32 tests | `npx vite-node scratch/test_comprehensive.mjs` |
| `scratch/test_suspense_features.mjs` | Suspense Account Smoke Suite (Status transitions, claims, reversals, CSV exports) | 7 assertions | `npx vite-node scratch/test_suspense_features.mjs` |

---

## 3. Tiered Testing Architecture

The opaque-box test suite (`scratch/test_e2e_opaque.mjs`) is structured into four progressive tiers:

### Tier 1: Feature Coverage (24 Tests)
Validates baseline functional requirements across the four core modules:
1. **Hand Cash Formula & Balance Aggregation (7 tests)**:
   - Baseline zero state ($Current\ Hand\ Cash = Opening\ Hand\ Cash$).
   - Cash receipt inflows.
   - Cash sales inflows vs. cash purchase outflows.
   - Suspense entry deposit cash inflow.
   - Anti-double-counting rule: Suspense claim settlement receipts are excluded from cash inflows.
   - Cash transfer role routing (debitor as inflow, creditor as outflow).
   - Bank-sourced transaction exclusion.
2. **Receipt Transactions & Itemless Workflow (6 tests)**:
   - Debtor party balance deduction (accounting sign convention: $balance -= receipt$).
   - Enforcement of itemless data model (`items: []`, zero phantom item rows).
   - Validation rejection for non-positive amount ($amount \le 0$).
   - Validation rejection for missing/unselected party.
   - Rapid double-click submission prevention guard.
   - CSV export formatting without phantom unit rates or NaN.
3. **Suspense Deposits, Lifecycle & Claims (6 tests)**:
   - New entry initialization as `unclaimed` with full available balance.
   - Partial claim transition to `partially_claimed` and available balance reduction.
   - Full claim transition to `fully_claimed` ($available = 0$).
   - Party ledger balance crediting on suspense claim.
   - Reconciled cash drawer invariant: Hand Cash remains unchanged upon claim.
   - Reversal of suspense claim restoring available balance and status.
4. **Opening Cash Persistence & Role Security (5 tests)**:
   - Default opening cash of 0 when unconfigured.
   - Data structure compliance with `OpeningCashSetting`.
   - Audit trail tracking with `OpeningCashHistory`.
   - Security rule: Administrator role required; non-admin modification rejected.
   - Persistent load/save service interface contract.

### Tier 2: Boundary & Corner Cases (32 Tests)
Tests rigorous edge conditions and stress limits:
1. **Zero Opening Cash (5 tests)**: Exact 0.00 handling, zero-cash inflows, cash deficit handling (-₹300), suspense inflows from zero base, and non-nullish preservation.
2. **Negative and Zero Amount Rejection (6 tests)**: Rejection of zero amount, negative amount, non-numeric strings, NaN, zero suspense deposit, and negative claim amounts.
3. **Claiming Exact Available Balance (5 tests)**: Single claim for 100% entry amount, two sequential claims summing to exact balance, three fractional claims, remaining balance exhaustion, and partial reversal from fully claimed entry.
4. **Claiming 0.01 Under Limit (5 tests)**: Claiming ₹4,999.99 on ₹5,000.00 entry leaving ₹0.01 available, status retention as `partially_claimed`, hand cash invariant preservation, and final ₹0.01 claim to zero out balance.
5. **Claiming 0.01 Over Limit (5 tests)**: Strict rejection of ₹5,000.01 on ₹5,000.00 entry, rejection of ₹2,000.01 on ₹2,000.00 available balance, rejection of 0.02 on 0.01 balance, rejection of 0.01 on fully claimed entry, and state mutation immunity upon rejection.
6. **Float Precision Roundings (6 tests)**: IEEE 754 precision correction ($0.10 + 0.20 = 0.30$), half-up rounding (100.005 -> 100.01), three-way fractional summation (333.33 + 333.33 + 333.34 = 1000.00), breakdown fractional roundings, high-magnitude rupee values (₹15,000,001.00), and rate-quantity multiplication.

### Tier 3: Cross-Feature Combinations (18 Tests)
Validates pairwise interactions between independent subsystems:
1. **Receipt + Suspense Claiming Interaction (4 tests)**: Simultaneous direct receipt and suspense claim on same party, linked claim settlement receipts without double-counting, balance clearance, and ledger summary isolation.
2. **Multiple Partial Claims Across Multiple Parties (5 tests)**: Single ₹10,000 suspense entry distributed across Party A (₹4,000), Party B (₹3,500), and Party C (₹2,500), sequential claim hand cash invariance, individual ledger balance deductions, incremental available balance drops, and selective claim reversal.
3. **Mixed Bank/Cash Transactions (5 tests)**: Interleaved Cash and Bank receipts, interleaved Cash and Bank payments, mixed inflow classification, Payment Transfer source routing, and comprehensive multi-source ledger reconciliation.
4. **Inactive / Deleted Party Handling (4 tests)**: Exclusion of inactive party with receipt from active summaries while preserving cash drawer inflow, tracking claims against inactive parties in suspense logs, unique party count exclusion on Dashboard, and ledger restoration upon party reactivation.

### Tier 4: Real-World Acceptance Scenarios (7 Tests)
Executes the authoritative 6-step cumulative end-to-end acceptance sequence from `ORIGINAL_REQUEST.md`:
1. **Step 1**: Setting Opening Hand Cash to ₹10,000 -> Current Hand Cash = ₹10,000, Unclaimed Suspense = ₹0.
2. **Step 2**: Saving ₹3,000 Receipt -> Hand Cash = ₹13,000, Party A balance reduced by ₹3,000, 0 phantom items.
3. **Step 3**: Recording ₹5,000 Suspense entry -> Hand Cash = ₹18,000, Unclaimed Suspense = ₹5,000.
4. **Step 4**: Claiming ₹2,000 against Party A -> Hand Cash remains ₹18,000, Unclaimed Suspense = ₹3,000, Party A credited ₹2,000.
5. **Step 5**: Claiming remaining ₹3,000 against Party B -> Hand Cash remains ₹18,000, Unclaimed Suspense = ₹0, Party B credited ₹3,000.
6. **Step 6**: Attempting claim > available balance (e.g. ₹500 on fully claimed entry) is strictly rejected.
7. **Step 7**: Cumulative reconciliation state audit verifying total inflows (₹8,000), total outflows (₹0), net hand cash (₹18,000), and party ledger balance credits.

---

## 4. Authoritative Calculation Rules & Formulas

### Hand Cash Authoritative Formula
$$\text{Current Hand Cash} = \text{Opening Hand Cash} + \text{Total Cash Inflows} - \text{Total Cash Outflows}$$

Where:
- $\text{Total Cash Inflows} = \text{Cash Receipts} + \text{Cash Sales} + \text{Transfers into Cash} + \text{Cash Suspense Deposits}$
- $\text{Total Cash Outflows} = \text{Cash Payments} + \text{Cash Purchases} + \text{Transfers from Cash}$

### Anti-Double-Counting Reconciliation Rule
When funds are deposited into Suspense, physical cash enters the drawer ($\text{Inflow} += \text{Suspense Amount}$).
When a Suspense claim is later matched to a customer/debtor, a settlement `Receipt` transaction is generated for the party's ledger.
**Rule**: Any Receipt transaction with a suspense settlement origin (`narration` contains `[Suspense Claim: ...]`, `itemName` is `Suspense Claim Settlement`, or `source: 'Suspense'`) is **strictly excluded** from Hand Cash inflows to prevent double-counting.

### Accounting Ledger Sign Conventions
- **Debtors (Receivables)**:
  - $\text{Sale} \implies \text{Balance} += \text{Amount}$
  - $\text{Receipt} \implies \text{Balance} -= \text{Amount}$
- **Creditors (Payables)**:
  - $\text{Purchase} \implies \text{Balance} -= \text{Amount}$
  - $\text{Payment} \implies \text{Balance} += \text{Amount}$
- **Payment Transfers**:
  - Creditor Party $\implies \text{Balance} -= \text{Amount}$
  - Debtor Party $\implies \text{Balance} += \text{Amount}$

---

## 5. Standard Verification Commands

```bash
# 1. Run the Opaque-Box E2E Test Suite (81 tests across Tiers 1-4)
npx vite-node scratch/test_e2e_opaque.mjs

# 2. Run the Core Regression Suite (32 tests)
npx vite-node scratch/test_comprehensive.mjs

# 3. Run the Suspense Smoke Test (7 assertions)
npx vite-node scratch/test_suspense_features.mjs

# 4. Verify TypeScript Typechecking (0 errors)
npx tsc --noEmit

# 5. Verify Production Build (0 errors)
npm run build
```
