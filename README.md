# Tally Prime PWA - Business Accounting Web App

An offline-first Progressive Web App (PWA) inspired by **Tally Prime**, built specifically for Indian small & medium businesses, manufacturers, and traders.

Designed to be ultra-fast and keyboard-driven on desktop (`Alt+C`, `Ctrl+A`, `Alt+G`, `F4`–`F9`), while remaining touch-friendly, responsive, installable, and 100% usable offline on smartphones.

---

## 🚀 Key Features

### 1. Strict Double-Entry Bookkeeping Engine
- **Golden Rule Verification**: Every voucher must balance ($\sum \text{Debits} \equiv \sum \text{Credits}$). Unbalanced vouchers are rejected and difference is displayed in real-time.
- **Auto-Incrementing Numbering**: Type-specific sequential series (`SALES-001`, `PURC-001`, `PMT-001`, `RCPT-001`, `CNTR-001`, `JRNL-001`, `DBNT-001`, `CRNT-001`).
- **Single-Entry & Double-Entry Modes**: Quick single-entry mode for Cash/Bank Payments & Receipts + advanced multi-line double entry with item allocations.

### 2. Chart of Accounts & Multi-Company Support
- **26 Standard Tally Primary Groups**: Capital Account, Current Assets, Current Liabilities, Duties & Taxes, Sundry Debtors, Sundry Creditors, Cash-in-Hand, Bank Accounts, Fixed Assets, Sales Accounts, Purchase Accounts, Direct/Indirect Expenses & Incomes.
- **Multiple Companies**: Create, alter, and switch between companies with separate data isolation.
- **GSTIN & State Integration**: Pre-loaded with all 36 Indian states and official 2-digit GST state codes.

### 3. Inventory & Multi-Godown Management
- **Stock Items**: Unit of measurement (`kg`, `pcs`, `bags`, `tons`), HSN/SAC codes, and GST tax slabs (0%, 5%, 12%, 18%, 28%).
- **Multi-Godown Support**: Allocate stock across warehouses, factories, and scrap yards (e.g., Main Godown, Scrap Yard, Finished Goods Depot).
- **Weighted Average Valuation**: Real-time closing stock calculation considering opening valuation and subsequent inward/outward movements.

### 4. GST & Invoicing
- **Auto GST Splitting**: Intra-state supplies auto-compute CGST (50%) + SGST (50%); Inter-state supplies auto-compute IGST (100%).
- **GST Summary Report**: GSTR-1 outward supplies vs. GSTR-2B input tax credit (ITC) with net tax payable computation.
- **Printable GST Tax Invoice**: Formal tax invoice with seller/buyer GSTIN, itemized HSN table, amounts in words, RTGS/NEFT bank details, and one-click Web Share sheet.

### 5. Drill-Down Financial Reports
- **Gateway of Tally**: Real-time KPI dashboard (Cash, Bank, Receivables, Payables, Sales, Purchases).
- **Day Book**: Chronological register with date range, voucher type, and search filters.
- **Ledger Statement**: Running debit/credit balances with contra identification and CSV export.
- **Trial Balance**: Group-wise hierarchical drill-down with balance verification.
- **Trading & Profit & Loss Statement**: Gross profit from Trading Account + Net profit from P&L transferred directly to Balance Sheet.
- **Balance Sheet**: Classical T-Format Liabilities & Assets with double-entry balance check ($\text{Total Assets} \equiv \text{Total Liabilities & Equity}$).
- **Outstanding Aging**: Debtors receivables & Creditors payables broken down into $0-30$, $31-60$, $61-90$, and $>90$ day aging brackets with WhatsApp payment reminders.

### 6. Offline Storage & Backup Utilities
- **IndexedDB Architecture**: Complete zero-backend offline persistence in browser IndexedDB.
- **JSON Backup & Restore**: Export full business data to JSON file and restore anytime.
- **CSV Data Export**: One-click spreadsheet export on every single report.

---

## 📱 Installing on Phone (PWA)

### Android (Google Chrome / Brave / Edge)
1. Open the hosted web app in your browser.
2. Tap the browser menu (`⋮`) or the **"Add to Home screen"** prompt at the bottom.
3. Tap **Install App**.
4. The app icon will appear on your home screen and open in full-screen standalone mode without any browser URL bar.
5. You can now use the app even when completely offline!

### iOS / iPhone (Safari)
1. Open the web app in Safari.
2. Tap the **Share** button (`⎙` / box with arrow) at the bottom.
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **Add**. The app will launch as a standalone native-like iOS application.

---

## ⌨️ Desktop Keyboard Shortcuts

| Shortcut | Action | Description |
|---|---|---|
| <kbd>Esc</kbd> | Back / Cancel | Return to Gateway of Tally or dismiss modal |
| <kbd>Alt</kbd> + <kbd>G</kbd> | Go To | Global search palette for reports, vouchers, and ledgers |
| <kbd>Ctrl</kbd> + <kbd>A</kbd> | Accept | Save and accept the active voucher or form |
| <kbd>Alt</kbd> + <kbd>C</kbd> | Create | Quick create a new ledger or stock item |
| <kbd>F2</kbd> | Date | Change voucher or report date filter |
| <kbd>F3</kbd> | Company | Alter company details or switch company |
| <kbd>F4</kbd> | Contra | Internal Bank $\leftrightarrow$ Cash funds transfer |
| <kbd>F5</kbd> | Payment | Record payment to suppliers or expenses |
| <kbd>F6</kbd> | Receipt | Record receipt from customers or income |
| <kbd>F7</kbd> | Journal | Adjustment, depreciation, non-cash entry |
| <kbd>F8</kbd> | Sales | Tax invoice sales to customers |
| <kbd>F9</kbd> | Purchase | Raw material or stock purchase |
| <kbd>Alt</kbd> + <kbd>F8</kbd> | Credit Note | Sales return / Customer credit |
| <kbd>Alt</kbd> + <kbd>F9</kbd> | Debit Note | Purchase return / Supplier debit |
| <kbd>Alt</kbd> + <kbd>E</kbd> | Export | Export report to CSV or backup database |

---

## 🧪 Testing Accounting Logic

The core double-entry engine and reports are tested with unit tests using Node's test runner:

```bash
# Run all unit tests
node --test test/*.test.mjs
```

All 20 tests verify:
- Balanced vouchers pass validation
- Unbalanced vouchers ($\text{Dr} \ne \text{Cr}$) are strictly blocked
- Trial Balance debits match credits
- Stock summary weighted average valuation
- Profit & Loss Trading Account and Net Profit calculations
- Balance sheet balances identically ($\text{Total Assets} \equiv \text{Total Liabilities}$)
- GST output tax, input tax credit, and net payable calculations
- Outstanding aging buckets sum to 100% of party balances
