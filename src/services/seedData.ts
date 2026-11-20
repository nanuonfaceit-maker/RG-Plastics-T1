/**
 * Demo Seed Data for Tally PWA
 * Pre-configured Indian manufacturing/trading business (RG Plastics Pvt Ltd)
 * with complete Chart of Accounts, Stock Items, Godowns, and 18 real double-entry vouchers.
 */
import type { Company } from '../types/company.ts';
import type { AccountGroup, LedgerAccount, Voucher } from '../types/accounting.ts';
import type { Godown, StockItem } from '../types/inventory.ts';
import { TALLY_PRIMARY_GROUPS, validateDoubleEntry } from '../types/accounting.ts';

export const DEMO_COMPANY: Company = {
  id: 'comp-rg-plastics',
  name: 'RG Plastics Pvt Ltd',
  tradeName: 'RG Polymers & Scrap',
  address: 'Plot 42, MIDC Industrial Area, Bhosari',
  city: 'Pune',
  state: 'Maharashtra',
  stateCode: '27',
  gstin: '27AABCR1234F1Z5',
  pan: 'AABCR1234F',
  financialYearStart: '2026-04-01',
  financialYearEnd: '2027-03-31',
  currency: 'INR',
  phone: '+91 98220 12345',
  email: 'accounts@rgplastics.in',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
};

export const DEMO_GODOWNS: Godown[] = [
  { id: 'g-main', companyId: DEMO_COMPANY.id, name: 'Main Godown (Bhosari)', location: 'Shed 1, Bhosari MIDC', isDefault: true },
  { id: 'g-scrap', companyId: DEMO_COMPANY.id, name: 'Raw Scrap Yard (Chakan)', location: 'Chakan Phase II' },
  { id: 'g-fg', companyId: DEMO_COMPANY.id, name: 'Finished Goods Depot', location: 'Warehouse B, Nigdi' },
];

export const DEMO_STOCK_ITEMS: StockItem[] = [
  {
    id: 'item-pp-granules',
    companyId: DEMO_COMPANY.id,
    name: 'PP Granules Natural (Virgin)',
    unit: 'kg',
    hsnCode: '39021000',
    gstRate: 18,
    openingQty: 2500,
    openingRate: 90,
    openingValue: 225000,
    godownId: 'g-main',
  },
  {
    id: 'item-hdpe-scrap',
    companyId: DEMO_COMPANY.id,
    name: 'HDPE Blue Drum Regrind Scrap',
    unit: 'kg',
    hsnCode: '39151000',
    gstRate: 18,
    openingQty: 4000,
    openingRate: 55,
    openingValue: 220000,
    godownId: 'g-scrap',
  },
  {
    id: 'item-ldpe-film',
    companyId: DEMO_COMPANY.id,
    name: 'LDPE Reprocessed Granules',
    unit: 'kg',
    hsnCode: '39011010',
    gstRate: 18,
    openingQty: 1800,
    openingRate: 80,
    openingValue: 144000,
    godownId: 'g-fg',
  },
  {
    id: 'item-masterbatch',
    companyId: DEMO_COMPANY.id,
    name: 'White Calcium Masterbatch',
    unit: 'kg',
    hsnCode: '38249900',
    gstRate: 18,
    openingQty: 600,
    openingRate: 110,
    openingValue: 66000,
    godownId: 'g-main',
  },
];

export const DEMO_LEDGERS: LedgerAccount[] = [
  // Capital Account
  {
    id: 'led-capital',
    companyId: DEMO_COMPANY.id,
    name: 'Ram Gopal Capital A/c',
    groupId: 'capital-account',
    groupName: 'Capital Account',
    nature: 'Equity',
    openingBalance: 1445000,
    openingType: 'Cr',
    isActive: true,
  },
  // Cash & Bank
  {
    id: 'led-cash',
    companyId: DEMO_COMPANY.id,
    name: 'Cash-in-Hand (Drawer)',
    groupId: 'cash-in-hand',
    groupName: 'Cash-in-Hand',
    nature: 'Asset',
    openingBalance: 50000,
    openingType: 'Dr',
    isActive: true,
    isSystem: true,
  },
  {
    id: 'led-hdfc',
    companyId: DEMO_COMPANY.id,
    name: 'HDFC Bank Current A/c',
    groupId: 'bank-accounts',
    groupName: 'Bank Accounts',
    nature: 'Asset',
    openingBalance: 350000,
    openingType: 'Dr',
    isActive: true,
  },
  {
    id: 'led-sbi',
    companyId: DEMO_COMPANY.id,
    name: 'SBI Cash Credit A/c',
    groupId: 'bank-od-occ',
    groupName: 'Bank OD A/c',
    nature: 'Liability',
    openingBalance: 0,
    openingType: 'Cr',
    isActive: true,
  },
  // Fixed Assets
  {
    id: 'led-machinery',
    companyId: DEMO_COMPANY.id,
    name: 'Extrusion Plant & Machinery',
    groupId: 'fixed-assets',
    groupName: 'Fixed Assets',
    nature: 'Asset',
    openingBalance: 450000,
    openingType: 'Dr',
    isActive: true,
  },
  // Stock in Hand (Opening stock)
  {
    id: 'led-stock',
    companyId: DEMO_COMPANY.id,
    name: 'Stock-in-Hand',
    groupId: 'stock-in-hand',
    groupName: 'Stock-in-Hand',
    nature: 'Asset',
    openingBalance: 655000,
    openingType: 'Dr',
    isActive: true,
  },
  // Sundry Debtors (Customers)
  {
    id: 'led-acme',
    companyId: DEMO_COMPANY.id,
    name: 'Acme Moulding Works',
    groupId: 'sundry-debtors',
    groupName: 'Sundry Debtors',
    nature: 'Asset',
    openingBalance: 45000,
    openingType: 'Dr',
    isActive: true,
    gstin: '27AABCA5555M1Z2',
    state: 'Maharashtra',
    city: 'Mumbai',
    address: 'Andheri East Industrial Estate',
  },
  {
    id: 'led-maruti',
    companyId: DEMO_COMPANY.id,
    name: 'Maruti Polymer Fabricators',
    groupId: 'sundry-debtors',
    groupName: 'Sundry Debtors',
    nature: 'Asset',
    openingBalance: 62000,
    openingType: 'Dr',
    isActive: true,
    gstin: '24BBBCM8888P1Z9',
    state: 'Gujarat',
    city: 'Surat',
    address: 'GIDC Katargam, Surat',
  },
  {
    id: 'led-sai',
    companyId: DEMO_COMPANY.id,
    name: 'Sai Extrusions Pvt Ltd',
    groupId: 'sundry-debtors',
    groupName: 'Sundry Debtors',
    nature: 'Asset',
    openingBalance: 28000,
    openingType: 'Dr',
    isActive: true,
    gstin: '27CCCS1234K1ZX',
    state: 'Maharashtra',
    city: 'Nashik',
  },
  // Sundry Creditors (Suppliers)
  {
    id: 'led-reliance',
    companyId: DEMO_COMPANY.id,
    name: 'Reliance Polymers Distributor',
    groupId: 'sundry-creditors',
    groupName: 'Sundry Creditors',
    nature: 'Liability',
    openingBalance: 120000,
    openingType: 'Cr',
    isActive: true,
    gstin: '27DDDR7777J1ZQ',
    state: 'Maharashtra',
    city: 'Pune',
  },
  {
    id: 'led-supreme',
    companyId: DEMO_COMPANY.id,
    name: 'Supreme Granules Suppliers',
    groupId: 'sundry-creditors',
    groupName: 'Sundry Creditors',
    nature: 'Liability',
    openingBalance: 75000,
    openingType: 'Cr',
    isActive: true,
    gstin: '24EEES9999L1ZU',
    state: 'Gujarat',
    city: 'Vadodara',
  },
  // Incomes (Sales)
  {
    id: 'led-sales',
    companyId: DEMO_COMPANY.id,
    name: 'Domestic Sales A/c',
    groupId: 'sales-accounts',
    groupName: 'Sales Accounts',
    nature: 'Income',
    openingBalance: 0,
    openingType: 'Cr',
    isActive: true,
  },
  {
    id: 'led-scrap-sales',
    companyId: DEMO_COMPANY.id,
    name: 'Scrap Sales A/c',
    groupId: 'sales-accounts',
    groupName: 'Sales Accounts',
    nature: 'Income',
    openingBalance: 0,
    openingType: 'Cr',
    isActive: true,
  },
  // Expenses (Purchases & Overheads)
  {
    id: 'led-purchases',
    companyId: DEMO_COMPANY.id,
    name: 'Raw Material Purchases A/c',
    groupId: 'purchase-accounts',
    groupName: 'Purchase Accounts',
    nature: 'Expense',
    openingBalance: 0,
    openingType: 'Dr',
    isActive: true,
  },
  {
    id: 'led-power',
    companyId: DEMO_COMPANY.id,
    name: 'Factory Power & Electricity',
    groupId: 'direct-expenses',
    groupName: 'Direct Expenses',
    nature: 'Expense',
    openingBalance: 0,
    openingType: 'Dr',
    isActive: true,
  },
  {
    id: 'led-rent',
    companyId: DEMO_COMPANY.id,
    name: 'Godown Warehouse Rent',
    groupId: 'indirect-expenses',
    groupName: 'Indirect Expenses',
    nature: 'Expense',
    openingBalance: 0,
    openingType: 'Dr',
    isActive: true,
  },
  {
    id: 'led-salary',
    companyId: DEMO_COMPANY.id,
    name: 'Staff Salary A/c',
    groupId: 'indirect-expenses',
    groupName: 'Indirect Expenses',
    nature: 'Expense',
    openingBalance: 0,
    openingType: 'Dr',
    isActive: true,
  },
  // Duties & Taxes (GST)
  {
    id: 'led-cgst-out',
    companyId: DEMO_COMPANY.id,
    name: 'CGST Output A/c',
    groupId: 'duties-taxes',
    groupName: 'Duties & Taxes',
    nature: 'Liability',
    openingBalance: 0,
    openingType: 'Cr',
    isActive: true,
  },
  {
    id: 'led-sgst-out',
    companyId: DEMO_COMPANY.id,
    name: 'SGST Output A/c',
    groupId: 'duties-taxes',
    groupName: 'Duties & Taxes',
    nature: 'Liability',
    openingBalance: 0,
    openingType: 'Cr',
    isActive: true,
  },
  {
    id: 'led-igst-out',
    companyId: DEMO_COMPANY.id,
    name: 'IGST Output A/c',
    groupId: 'duties-taxes',
    groupName: 'Duties & Taxes',
    nature: 'Liability',
    openingBalance: 0,
    openingType: 'Cr',
    isActive: true,
  },
  {
    id: 'led-cgst-in',
    companyId: DEMO_COMPANY.id,
    name: 'CGST Input A/c (ITC)',
    groupId: 'duties-taxes',
    groupName: 'Duties & Taxes',
    nature: 'Liability',
    openingBalance: 0,
    openingType: 'Cr',
    isActive: true,
  },
  {
    id: 'led-sgst-in',
    companyId: DEMO_COMPANY.id,
    name: 'SGST Input A/c (ITC)',
    groupId: 'duties-taxes',
    groupName: 'Duties & Taxes',
    nature: 'Liability',
    openingBalance: 0,
    openingType: 'Cr',
    isActive: true,
  },
  {
    id: 'led-igst-in',
    companyId: DEMO_COMPANY.id,
    name: 'IGST Input A/c (ITC)',
    groupId: 'duties-taxes',
    groupName: 'Duties & Taxes',
    nature: 'Liability',
    openingBalance: 0,
    openingType: 'Cr',
    isActive: true,
  },
  // Suspense
  {
    id: 'led-suspense',
    companyId: DEMO_COMPANY.id,
    name: 'Suspense Account',
    groupId: 'suspense-acc',
    groupName: 'Suspense Account',
    nature: 'Liability',
    openingBalance: 0,
    openingType: 'Cr',
    isActive: true,
  },
  // Profit & Loss pre-created
  {
    id: 'led-pnl',
    companyId: DEMO_COMPANY.id,
    name: 'Profit & Loss A/c',
    groupId: 'reserves-surplus',
    groupName: 'Reserves & Surplus',
    nature: 'Equity',
    openingBalance: 0,
    openingType: 'Cr',
    isActive: true,
    isSystem: true,
  },
];

export const DEMO_VOUCHERS: Voucher[] = [
  // 1. Sales Voucher (F8) - Intra-state sale to Acme Moulding
  {
    id: 'vch-001',
    companyId: DEMO_COMPANY.id,
    voucherType: 'Sales',
    voucherNumber: 'SALES-001',
    date: '2026-04-05',
    referenceNo: 'INV-26-001',
    narration: 'Sold 500kg PP Granules to Acme Moulding Works via Invoice #001',
    lines: [
      { id: 'l1', ledgerId: 'led-acme', ledgerName: 'Acme Moulding Works', type: 'Dr', amount: 56050 },
      { id: 'l2', ledgerId: 'led-sales', ledgerName: 'Domestic Sales A/c', type: 'Cr', amount: 47500 },
      { id: 'l3', ledgerId: 'led-cgst-out', ledgerName: 'CGST Output A/c', type: 'Cr', amount: 4275 },
      { id: 'l4', ledgerId: 'led-sgst-out', ledgerName: 'SGST Output A/c', type: 'Cr', amount: 4275 },
    ],
    itemLines: [
      {
        id: 'i1',
        itemId: 'item-pp-granules',
        itemName: 'PP Granules Natural (Virgin)',
        godownId: 'g-main',
        godownName: 'Main Godown (Bhosari)',
        quantity: 500,
        unit: 'kg',
        rate: 95,
        amount: 47500,
        gstRate: 18,
        hsnCode: '39021000',
        cgst: 4275,
        sgst: 4275,
        igst: 0,
      },
    ],
    createdAt: '2026-04-05T10:00:00.000Z',
    updatedAt: '2026-04-05T10:00:00.000Z',
  },

  // 2. Purchase Voucher (F9) - Intra-state purchase from Reliance
  {
    id: 'vch-002',
    companyId: DEMO_COMPANY.id,
    voucherType: 'Purchase',
    voucherNumber: 'PURC-001',
    date: '2026-04-08',
    referenceNo: 'REL-8910',
    narration: 'Purchased 1000kg HDPE regrind scrap from Reliance Polymers',
    lines: [
      { id: 'l5', ledgerId: 'led-purchases', ledgerName: 'Raw Material Purchases A/c', type: 'Dr', amount: 60000 },
      { id: 'l6', ledgerId: 'led-cgst-in', ledgerName: 'CGST Input A/c (ITC)', type: 'Dr', amount: 5400 },
      { id: 'l7', ledgerId: 'led-sgst-in', ledgerName: 'SGST Input A/c (ITC)', type: 'Dr', amount: 5400 },
      { id: 'l8', ledgerId: 'led-reliance', ledgerName: 'Reliance Polymers Distributor', type: 'Cr', amount: 70800 },
    ],
    itemLines: [
      {
        id: 'i2',
        itemId: 'item-hdpe-scrap',
        itemName: 'HDPE Blue Drum Regrind Scrap',
        godownId: 'g-scrap',
        godownName: 'Raw Scrap Yard (Chakan)',
        quantity: 1000,
        unit: 'kg',
        rate: 60,
        amount: 60000,
        gstRate: 18,
        hsnCode: '39151000',
        cgst: 5400,
        sgst: 5400,
        igst: 0,
      },
    ],
    createdAt: '2026-04-08T11:30:00.000Z',
    updatedAt: '2026-04-08T11:30:00.000Z',
  },

  // 3. Receipt Voucher (F6) - Customer payment via HDFC Bank
  {
    id: 'vch-003',
    companyId: DEMO_COMPANY.id,
    voucherType: 'Receipt',
    voucherNumber: 'RCPT-001',
    date: '2026-04-10',
    referenceNo: 'NEFT-5421',
    narration: 'Payment received from Acme Moulding Works against outstanding balance',
    lines: [
      { id: 'l9', ledgerId: 'led-hdfc', ledgerName: 'HDFC Bank Current A/c', type: 'Dr', amount: 50000 },
      { id: 'l10', ledgerId: 'led-acme', ledgerName: 'Acme Moulding Works', type: 'Cr', amount: 50000 },
    ],
    createdAt: '2026-04-10T14:15:00.000Z',
    updatedAt: '2026-04-10T14:15:00.000Z',
  },

  // 4. Payment Voucher (F5) - Vendor payment to Reliance Polymers
  {
    id: 'vch-004',
    companyId: DEMO_COMPANY.id,
    voucherType: 'Payment',
    voucherNumber: 'PMT-001',
    date: '2026-04-12',
    referenceNo: 'CHQ-104421',
    narration: 'Cheque issued to Reliance Polymers towards bill #8910',
    lines: [
      { id: 'l11', ledgerId: 'led-reliance', ledgerName: 'Reliance Polymers Distributor', type: 'Dr', amount: 60000 },
      { id: 'l12', ledgerId: 'led-hdfc', ledgerName: 'HDFC Bank Current A/c', type: 'Cr', amount: 60000 },
    ],
    createdAt: '2026-04-12T16:00:00.000Z',
    updatedAt: '2026-04-12T16:00:00.000Z',
  },

  // 5. Contra Voucher (F4) - Cash withdrawal for petty expenses
  {
    id: 'vch-005',
    companyId: DEMO_COMPANY.id,
    voucherType: 'Contra',
    voucherNumber: 'CNTR-001',
    date: '2026-04-14',
    referenceNo: 'SELF-4401',
    narration: 'Cash withdrawn from HDFC Bank ATM for factory drawer petty cash',
    lines: [
      { id: 'l13', ledgerId: 'led-cash', ledgerName: 'Cash-in-Hand (Drawer)', type: 'Dr', amount: 15000 },
      { id: 'l14', ledgerId: 'led-hdfc', ledgerName: 'HDFC Bank Current A/c', type: 'Cr', amount: 15000 },
    ],
    createdAt: '2026-04-14T11:00:00.000Z',
    updatedAt: '2026-04-14T11:00:00.000Z',
  },

  // 6. Sales Voucher (F8) - Inter-state sale to Maruti Polymer (Gujarat) with 18% IGST
  {
    id: 'vch-006',
    companyId: DEMO_COMPANY.id,
    voucherType: 'Sales',
    voucherNumber: 'SALES-002',
    date: '2026-04-18',
    referenceNo: 'INV-26-002',
    narration: 'Interstate sale to Maruti Polymer (Surat, Gujarat) with IGST',
    lines: [
      { id: 'l15', ledgerId: 'led-maruti', ledgerName: 'Maruti Polymer Fabricators', type: 'Dr', amount: 40120 },
      { id: 'l16', ledgerId: 'led-sales', ledgerName: 'Domestic Sales A/c', type: 'Cr', amount: 34000 },
      { id: 'l17', ledgerId: 'led-igst-out', ledgerName: 'IGST Output A/c', type: 'Cr', amount: 6120 },
    ],
    itemLines: [
      {
        id: 'i3',
        itemId: 'item-ldpe-film',
        itemName: 'LDPE Reprocessed Granules',
        godownId: 'g-fg',
        godownName: 'Finished Goods Depot',
        quantity: 400,
        unit: 'kg',
        rate: 85,
        amount: 34000,
        gstRate: 18,
        hsnCode: '39011010',
        cgst: 0,
        sgst: 0,
        igst: 6120,
      },
    ],
    createdAt: '2026-04-18T15:20:00.000Z',
    updatedAt: '2026-04-18T15:20:00.000Z',
  },

  // 7. Payment Voucher (F5) - Godown Warehouse Rent paid in cash
  {
    id: 'vch-007',
    companyId: DEMO_COMPANY.id,
    voucherType: 'Payment',
    voucherNumber: 'PMT-002',
    date: '2026-04-20',
    referenceNo: 'RENT-APR',
    narration: 'Monthly rent paid in cash for Chakan Scrap Yard Godown',
    lines: [
      { id: 'l18', ledgerId: 'led-rent', ledgerName: 'Godown Warehouse Rent', type: 'Dr', amount: 8000 },
      { id: 'l19', ledgerId: 'led-cash', ledgerName: 'Cash-in-Hand (Drawer)', type: 'Cr', amount: 8000 },
    ],
    createdAt: '2026-04-20T12:00:00.000Z',
    updatedAt: '2026-04-20T12:00:00.000Z',
  },

  // 8. Purchase Voucher (F9) - Inter-state purchase from Supreme Granules (Gujarat) with 18% IGST
  {
    id: 'vch-008',
    companyId: DEMO_COMPANY.id,
    voucherType: 'Purchase',
    voucherNumber: 'PURC-002',
    date: '2026-04-22',
    referenceNo: 'SUP-4122',
    narration: 'Interstate purchase of Masterbatch from Supreme Granules (Vadodara)',
    lines: [
      { id: 'l20', ledgerId: 'led-purchases', ledgerName: 'Raw Material Purchases A/c', type: 'Dr', amount: 24000 },
      { id: 'l21', ledgerId: 'led-igst-in', ledgerName: 'IGST Input A/c (ITC)', type: 'Dr', amount: 4320 },
      { id: 'l22', ledgerId: 'led-supreme', ledgerName: 'Supreme Granules Suppliers', type: 'Cr', amount: 28320 },
    ],
    itemLines: [
      {
        id: 'i4',
        itemId: 'item-masterbatch',
        itemName: 'White Calcium Masterbatch',
        godownId: 'g-main',
        godownName: 'Main Godown (Bhosari)',
        quantity: 200,
        unit: 'kg',
        rate: 120,
        amount: 24000,
        gstRate: 18,
        hsnCode: '38249900',
        cgst: 0,
        sgst: 0,
        igst: 4320,
      },
    ],
    createdAt: '2026-04-22T10:45:00.000Z',
    updatedAt: '2026-04-22T10:45:00.000Z',
  },

  // 9. Receipt Voucher (F6) - Cash collection from Sai Extrusions
  {
    id: 'vch-009',
    companyId: DEMO_COMPANY.id,
    voucherType: 'Receipt',
    voucherNumber: 'RCPT-002',
    date: '2026-04-25',
    referenceNo: 'REC-0921',
    narration: 'Received cash on account from Sai Extrusions',
    lines: [
      { id: 'l23', ledgerId: 'led-cash', ledgerName: 'Cash-in-Hand (Drawer)', type: 'Dr', amount: 15000 },
      { id: 'l24', ledgerId: 'led-sai', ledgerName: 'Sai Extrusions Pvt Ltd', type: 'Cr', amount: 15000 },
    ],
    createdAt: '2026-04-25T17:00:00.000Z',
    updatedAt: '2026-04-25T17:00:00.000Z',
  },

  // 10. Payment Voucher (F5) - Factory Electricity bill paid online via HDFC
  {
    id: 'vch-010',
    companyId: DEMO_COMPANY.id,
    voucherType: 'Payment',
    voucherNumber: 'PMT-003',
    date: '2026-04-28',
    referenceNo: 'MSEDCL-4100',
    narration: 'MSEDCL Industrial Electricity bill paid online',
    lines: [
      { id: 'l25', ledgerId: 'led-power', ledgerName: 'Factory Power & Electricity', type: 'Dr', amount: 12400 },
      { id: 'l26', ledgerId: 'led-hdfc', ledgerName: 'HDFC Bank Current A/c', type: 'Cr', amount: 12400 },
    ],
    createdAt: '2026-04-28T11:15:00.000Z',
    updatedAt: '2026-04-28T11:15:00.000Z',
  },

  // 11. Journal Voucher (F7) - Month-end Salary Accrual
  {
    id: 'vch-011',
    companyId: DEMO_COMPANY.id,
    voucherType: 'Journal',
    voucherNumber: 'JRNL-001',
    date: '2026-04-30',
    referenceNo: 'SAL-APR-2026',
    narration: 'Factory staff & operator salary booked for the month of April',
    lines: [
      { id: 'l27', ledgerId: 'led-salary', ledgerName: 'Staff Salary A/c', type: 'Dr', amount: 35000 },
      { id: 'l28', ledgerId: 'led-cash', ledgerName: 'Cash-in-Hand (Drawer)', type: 'Cr', amount: 35000 },
    ],
    createdAt: '2026-04-30T18:00:00.000Z',
    updatedAt: '2026-04-30T18:00:00.000Z',
  },

  // 12. Contra Voucher (F4) - Cash deposit into HDFC Bank
  {
    id: 'vch-012',
    companyId: DEMO_COMPANY.id,
    voucherType: 'Contra',
    voucherNumber: 'CNTR-002',
    date: '2026-05-02',
    referenceNo: 'DEP-8841',
    narration: 'Excess cash collection deposited into HDFC Bank current account',
    lines: [
      { id: 'l29', ledgerId: 'led-hdfc', ledgerName: 'HDFC Bank Current A/c', type: 'Dr', amount: 20000 },
      { id: 'l30', ledgerId: 'led-cash', ledgerName: 'Cash-in-Hand (Drawer)', type: 'Cr', amount: 20000 },
    ],
    createdAt: '2026-05-02T10:30:00.000Z',
    updatedAt: '2026-05-02T10:30:00.000Z',
  },

  // 13. Sales Voucher (F8) - Scrap Sales
  {
    id: 'vch-013',
    companyId: DEMO_COMPANY.id,
    voucherType: 'Sales',
    voucherNumber: 'SALES-003',
    date: '2026-05-06',
    referenceNo: 'INV-26-003',
    narration: 'Lump plastic scrap sold to Sai Extrusions',
    lines: [
      { id: 'l31', ledgerId: 'led-sai', ledgerName: 'Sai Extrusions Pvt Ltd', type: 'Dr', amount: 21240 },
      { id: 'l32', ledgerId: 'led-scrap-sales', ledgerName: 'Scrap Sales A/c', type: 'Cr', amount: 18000 },
      { id: 'l33', ledgerId: 'led-cgst-out', ledgerName: 'CGST Output A/c', type: 'Cr', amount: 1620 },
      { id: 'l34', ledgerId: 'led-sgst-out', ledgerName: 'SGST Output A/c', type: 'Cr', amount: 1620 },
    ],
    itemLines: [
      {
        id: 'i5',
        itemId: 'item-hdpe-scrap',
        itemName: 'HDPE Blue Drum Regrind Scrap',
        godownId: 'g-scrap',
        godownName: 'Raw Scrap Yard (Chakan)',
        quantity: 300,
        unit: 'kg',
        rate: 60,
        amount: 18000,
        gstRate: 18,
        hsnCode: '39151000',
        cgst: 1620,
        sgst: 1620,
        igst: 0,
      },
    ],
    createdAt: '2026-05-06T14:40:00.000Z',
    updatedAt: '2026-05-06T14:40:00.000Z',
  },

  // 14. Receipt Voucher (F6) - RTGS receipt from Maruti Polymer
  {
    id: 'vch-014',
    companyId: DEMO_COMPANY.id,
    voucherType: 'Receipt',
    voucherNumber: 'RCPT-003',
    date: '2026-05-10',
    referenceNo: 'UTR-HDFC09912',
    narration: 'RTGS received from Maruti Polymer against Invoice #002',
    lines: [
      { id: 'l35', ledgerId: 'led-hdfc', ledgerName: 'HDFC Bank Current A/c', type: 'Dr', amount: 40120 },
      { id: 'l36', ledgerId: 'led-maruti', ledgerName: 'Maruti Polymer Fabricators', type: 'Cr', amount: 40120 },
    ],
    createdAt: '2026-05-10T12:00:00.000Z',
    updatedAt: '2026-05-10T12:00:00.000Z',
  },

  // 15. Purchase Voucher (F9) - Additional raw material purchase
  {
    id: 'vch-015',
    companyId: DEMO_COMPANY.id,
    voucherType: 'Purchase',
    voucherNumber: 'PURC-003',
    date: '2026-05-15',
    referenceNo: 'REL-9402',
    narration: 'Purchased 500kg virgin granules from Reliance Polymers',
    lines: [
      { id: 'l37', ledgerId: 'led-purchases', ledgerName: 'Raw Material Purchases A/c', type: 'Dr', amount: 45000 },
      { id: 'l38', ledgerId: 'led-cgst-in', ledgerName: 'CGST Input A/c (ITC)', type: 'Dr', amount: 4050 },
      { id: 'l39', ledgerId: 'led-sgst-in', ledgerName: 'SGST Input A/c (ITC)', type: 'Dr', amount: 4050 },
      { id: 'l40', ledgerId: 'led-reliance', ledgerName: 'Reliance Polymers Distributor', type: 'Cr', amount: 53100 },
    ],
    itemLines: [
      {
        id: 'i6',
        itemId: 'item-pp-granules',
        itemName: 'PP Granules Natural (Virgin)',
        godownId: 'g-main',
        godownName: 'Main Godown (Bhosari)',
        quantity: 500,
        unit: 'kg',
        rate: 90,
        amount: 45000,
        gstRate: 18,
        hsnCode: '39021000',
        cgst: 4050,
        sgst: 4050,
        igst: 0,
      },
    ],
    createdAt: '2026-05-15T11:20:00.000Z',
    updatedAt: '2026-05-15T11:20:00.000Z',
  },

  // 16. Payment Voucher (F5) - Vendor payment to Supreme Granules
  {
    id: 'vch-016',
    companyId: DEMO_COMPANY.id,
    voucherType: 'Payment',
    voucherNumber: 'PMT-004',
    date: '2026-05-20',
    referenceNo: 'NEFT-88912',
    narration: 'NEFT payment sent to Supreme Granules Suppliers',
    lines: [
      { id: 'l41', ledgerId: 'led-supreme', ledgerName: 'Supreme Granules Suppliers', type: 'Dr', amount: 35000 },
      { id: 'l42', ledgerId: 'led-hdfc', ledgerName: 'HDFC Bank Current A/c', type: 'Cr', amount: 35000 },
    ],
    createdAt: '2026-05-20T16:30:00.000Z',
    updatedAt: '2026-05-20T16:30:00.000Z',
  },

  // 17. Sales Voucher (F8) - Sale of PP Granules to Acme
  {
    id: 'vch-017',
    companyId: DEMO_COMPANY.id,
    voucherType: 'Sales',
    voucherNumber: 'SALES-004',
    date: '2026-05-25',
    referenceNo: 'INV-26-004',
    narration: 'Sold 300kg PP Natural granules to Acme Moulding Works',
    lines: [
      { id: 'l43', ledgerId: 'led-acme', ledgerName: 'Acme Moulding Works', type: 'Dr', amount: 33748 },
      { id: 'l44', ledgerId: 'led-sales', ledgerName: 'Domestic Sales A/c', type: 'Cr', amount: 28600 },
      { id: 'l45', ledgerId: 'led-cgst-out', ledgerName: 'CGST Output A/c', type: 'Cr', amount: 2574 },
      { id: 'l46', ledgerId: 'led-sgst-out', ledgerName: 'SGST Output A/c', type: 'Cr', amount: 2574 },
    ],
    itemLines: [
      {
        id: 'i7',
        itemId: 'item-pp-granules',
        itemName: 'PP Granules Natural (Virgin)',
        godownId: 'g-main',
        godownName: 'Main Godown (Bhosari)',
        quantity: 300,
        unit: 'kg',
        rate: 95.333,
        amount: 28600,
        gstRate: 18,
        hsnCode: '39021000',
        cgst: 2574,
        sgst: 2574,
        igst: 0,
      },
    ],
    createdAt: '2026-05-25T15:00:00.000Z',
    updatedAt: '2026-05-25T15:00:00.000Z',
  },

  // 18. Receipt Voucher (F6) - Payment from Acme Moulding
  {
    id: 'vch-018',
    companyId: DEMO_COMPANY.id,
    voucherType: 'Receipt',
    voucherNumber: 'RCPT-004',
    date: '2026-05-28',
    referenceNo: 'IMPS-4421',
    narration: 'IMPS receipt from Acme Moulding Works',
    lines: [
      { id: 'l47', ledgerId: 'led-hdfc', ledgerName: 'HDFC Bank Current A/c', type: 'Dr', amount: 30000 },
      { id: 'l48', ledgerId: 'led-acme', ledgerName: 'Acme Moulding Works', type: 'Cr', amount: 30000 },
    ],
    createdAt: '2026-05-28T14:10:00.000Z',
    updatedAt: '2026-05-28T14:10:00.000Z',
  },
];

/**
 * Initializes default database with demo company if empty
 */
export async function initializeDatabaseWithSeedData(): Promise<void> {
  const { getCompanies, saveCompany, getGroups, saveGroup, getLedgers, saveLedger, getVouchers, saveVoucher, getStockItems, saveStockItem, getGodowns, saveGodown, setActiveCompanyId } = await import('./db');

  const companies = await getCompanies();
  if (companies.length === 0) {
    // 1. Save company
    await saveCompany(DEMO_COMPANY);
    await setActiveCompanyId(DEMO_COMPANY.id);

    // 2. Save Tally Primary Groups
    for (const g of TALLY_PRIMARY_GROUPS) {
      await saveGroup(g);
    }

    // 3. Save Godowns
    for (const gd of DEMO_GODOWNS) {
      await saveGodown(gd);
    }

    // 4. Save Stock Items
    for (const s of DEMO_STOCK_ITEMS) {
      await saveStockItem(s);
    }

    // 5. Save Ledgers
    for (const l of DEMO_LEDGERS) {
      await saveLedger(l);
    }

    // 6. Save Sample Vouchers
    for (const v of DEMO_VOUCHERS) {
      await saveVoucher(v);
    }
  }
}
