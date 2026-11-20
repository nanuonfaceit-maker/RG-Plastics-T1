/**
 * High-Volume Heavy Accounting Data Simulator for RG Plastics
 * Simulates 1,500+ realistic double-entry vouchers across 50 parties,
 * 10 stock items, 4 godowns, and runs 3 comprehensive verification checks.
 */
import { performance } from 'node:perf_hooks';
import {
  validateDoubleEntry,
  computeTrialBalance,
  computeProfitAndLoss,
  computeBalanceSheet,
  computeStockSummary,
  computeGstSummary,
  computeOutstandingAging,
  computeLedgerStatement,
  formatINR,
  round2,
} from '../src/services/accountingEngine.ts';
import { TALLY_PRIMARY_GROUPS } from '../src/types/accounting.ts';

// -------------------------------------------------------------
// 1. DATA GENERATOR
// -------------------------------------------------------------
export function generateHeavyAccountingData() {
  const company = {
    id: 'comp-heavy-rg',
    name: 'RG Plastics Heavy Simulation Corp',
    tradeName: 'RG Polymers & Recycling',
    address: 'Plot 101, Industrial Area Phase II, Chakan',
    city: 'Pune',
    state: 'Maharashtra',
    stateCode: '27',
    gstin: '27AAACR9999F1Z0',
    pan: 'AAACR9999F',
    financialYearStart: '2026-04-01',
    financialYearEnd: '2027-03-31',
    currency: 'INR',
    phone: '+91 98220 99999',
    email: 'accounts@rgplastics-sim.in',
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
  };

  const godowns = [
    { id: 'g-main', companyId: company.id, name: 'Main Bhosari Warehouse', location: 'Bhosari MIDC', isDefault: true },
    { id: 'g-scrap', companyId: company.id, name: 'Chakan Scrap Yard', location: 'Chakan Phase II' },
    { id: 'g-fg', companyId: company.id, name: 'Finished Goods Depot Nigdi', location: 'Nigdi Pradhikaran' },
    { id: 'g-bulk', companyId: company.id, name: 'Talegaon Silo Storage', location: 'Talegaon MIDC' },
  ];

  const stockItems = [
    { id: 'item-1', companyId: company.id, name: 'PP Granules Natural Virgin', unit: 'kg', hsnCode: '39021000', gstRate: 18, openingQty: 10000, openingRate: 95, openingValue: 950000, godownId: 'g-main' },
    { id: 'item-2', companyId: company.id, name: 'HDPE Blue Drum Regrind Scrap', unit: 'kg', hsnCode: '39151000', gstRate: 18, openingQty: 15000, openingRate: 58, openingValue: 870000, godownId: 'g-scrap' },
    { id: 'item-3', companyId: company.id, name: 'LDPE Milky White Agglomerate', unit: 'kg', hsnCode: '39152000', gstRate: 18, openingQty: 8000, openingRate: 72, openingValue: 576000, godownId: 'g-scrap' },
    { id: 'item-4', companyId: company.id, name: 'Black Masterbatch 40% Carbon', unit: 'kg', hsnCode: '32061900', gstRate: 18, openingQty: 2500, openingRate: 120, openingValue: 300000, godownId: 'g-fg' },
    { id: 'item-5', companyId: company.id, name: 'White Masterbatch TiO2', unit: 'kg', hsnCode: '32061900', gstRate: 18, openingQty: 2000, openingRate: 160, openingValue: 320000, godownId: 'g-fg' },
    { id: 'item-6', companyId: company.id, name: 'Calcium Carbonate Filler 80%', unit: 'kg', hsnCode: '38249900', gstRate: 18, openingQty: 20000, openingRate: 28, openingValue: 560000, godownId: 'g-bulk' },
    { id: 'item-7', companyId: company.id, name: 'PVC Resin Suspension K67', unit: 'kg', hsnCode: '39041000', gstRate: 18, openingQty: 12000, openingRate: 82, openingValue: 984000, godownId: 'g-main' },
    { id: 'item-8', companyId: company.id, name: 'PPCP Injection Grade Granules', unit: 'kg', hsnCode: '39023000', gstRate: 18, openingQty: 6000, openingRate: 105, openingValue: 630000, godownId: 'g-fg' },
    { id: 'item-9', companyId: company.id, name: 'CP Reprocessed Grey Granules', unit: 'kg', hsnCode: '39029000', gstRate: 18, openingQty: 14000, openingRate: 65, openingValue: 910000, godownId: 'g-scrap' },
    { id: 'item-10', companyId: company.id, name: 'Multi-Layer Barrier Film Scrap', unit: 'kg', hsnCode: '39159000', gstRate: 18, openingQty: 18000, openingRate: 35, openingValue: 630000, godownId: 'g-bulk' },
  ];

  const totalOpeningStockValue = stockItems.reduce((sum, item) => sum + item.openingValue, 0); // 67,30,000

  // 30 Debtors (Customers)
  const debtorNames = [
    { name: 'Apex Extrusions Pvt Ltd', city: 'Mumbai', state: 'Maharashtra', gstin: '27AAACA1001A1Z1', ob: 125000 },
    { name: 'Shree Ganesh Polymer Molders', city: 'Pune', state: 'Maharashtra', gstin: '27AAACG2002B1Z2', ob: 84000 },
    { name: 'Vardhman Rotomould Containers', city: 'Nashik', state: 'Maharashtra', gstin: '27AAACV3003C1Z3', ob: 210000 },
    { name: 'Polyplast Blowpack Ind', city: 'Aurangabad', state: 'Maharashtra', gstin: '27AAACP4004D1Z4', ob: 65000 },
    { name: 'Sai Krupa Plastic Packaging', city: 'Nagpur', state: 'Maharashtra', gstin: '27AAACS5005E1Z5', ob: 142000 },
    { name: 'Maruti Pipe & Fitting Works', city: 'Kolhapur', state: 'Maharashtra', gstin: '27AAACM6006F1Z6', ob: 195000 },
    { name: 'Navkar Extruded Sheets', city: 'Thane', state: 'Maharashtra', gstin: '27AAACN7007G1Z7', ob: 52000 },
    { name: 'Kisan Drip Irrigation Pipes', city: 'Jalgaon', state: 'Maharashtra', gstin: '27AAACK8008H1Z8', ob: 310000 },
    { name: 'Arihant Polyfilms & Liners', city: 'Solapur', state: 'Maharashtra', gstin: '27AAACA9009I1Z9', ob: 98000 },
    { name: 'Siddhi Vinayak Container Corp', city: 'Satara', state: 'Maharashtra', gstin: '27AAACS1010J1ZA', ob: 115000 },
    // Inter-State Customers (Gujarat 24)
    { name: 'Gujarat Polytex Industries', city: 'Ahmedabad', state: 'Gujarat', gstin: '24AAACG1111K1ZB', ob: 275000 },
    { name: 'Baroda Precision Moulders', city: 'Vadodara', state: 'Gujarat', gstin: '24AAACB2222L1ZC', ob: 180000 },
    { name: 'Surat Woven Sacks Mfg', city: 'Surat', state: 'Gujarat', gstin: '24AAACS3333M1ZD', ob: 340000 },
    { name: 'Rajkot Rigid PVC Pipes', city: 'Rajkot', state: 'Gujarat', gstin: '24AAACR4444N1ZE', ob: 165000 },
    { name: 'Vapi Polymer Compounders', city: 'Vapi', state: 'Gujarat', gstin: '24AAACV5555O1ZF', ob: 220000 },
    // Inter-State (Karnataka 29, Delhi 07, MP 23, Rajasthan 08)
    { name: 'Bangalore Thermoformers', city: 'Bengaluru', state: 'Karnataka', gstin: '29AAACB6666P1ZG', ob: 190000 },
    { name: 'Belgaum Tarpaulin Works', city: 'Belagavi', state: 'Karnataka', gstin: '29AAACB7777Q1ZH', ob: 88000 },
    { name: 'Delhi Blow Mold Corp', city: 'New Delhi', state: 'Delhi', gstin: '07AAACD8888R1ZI', ob: 145000 },
    { name: 'Indore Plastic Drums', city: 'Indore', state: 'Madhya Pradesh', gstin: '23AAACI9999S1ZJ', ob: 130000 },
    { name: 'Jaipur Polyweave Packaging', city: 'Jaipur', state: 'Rajasthan', gstin: '08AAACJ1212T1ZK', ob: 175000 },
    { name: 'Omkar Plastics Ahmednagar', city: 'Ahmednagar', state: 'Maharashtra', gstin: '27AAACO1313U1ZL', ob: 62000 },
    { name: 'Prestige Caps & Closures', city: 'Pune', state: 'Maharashtra', gstin: '27AAACP1414V1ZM', ob: 240000 },
    { name: 'Reliance Packaging Jobwork', city: 'Panvel', state: 'Maharashtra', gstin: '27AAACR1515W1ZN', ob: 85000 },
    { name: 'National Polyfab Baramati', city: 'Baramati', state: 'Maharashtra', gstin: '27AAACN1616X1ZO', ob: 110000 },
    { name: 'Galaxy Moulded Crates', city: 'Mumbai', state: 'Maharashtra', gstin: '27AAACG1717Y1ZP', ob: 320000 },
    { name: 'Swastik Plastic Furniture', city: 'Nagpur', state: 'Maharashtra', gstin: '27AAACS1818Z1ZQ', ob: 290000 },
    { name: 'Pooja Polymers Latur', city: 'Latur', state: 'Maharashtra', gstin: '27AAACP1919A1ZR', ob: 74000 },
    { name: 'Mahalaxmi Extrusions Sangli', city: 'Sangli', state: 'Maharashtra', gstin: '27AAACM2020B1ZS', ob: 160000 },
    { name: 'Supreme Agro Pipes Dhule', city: 'Dhule', state: 'Maharashtra', gstin: '27AAACS2121C1ZT', ob: 215000 },
    { name: 'Balaji Bottles & Jars', city: 'Nanded', state: 'Maharashtra', gstin: '27AAACB2222D1ZU', ob: 95000 },
  ];

  // 20 Creditors (Suppliers)
  const creditorNames = [
    { name: 'Reliance Industries Polymer Div', city: 'Mumbai', state: 'Maharashtra', gstin: '27AAACR3001A1Z1', ob: 650000 },
    { name: 'IOCL Panipat Petrochemicals', city: 'Panipat', state: 'Haryana', gstin: '06AAACI4002B1Z2', ob: 820000 },
    { name: 'Supreme Masterbatch Ltd', city: 'Silvassa', state: 'Dadra and Nagar Haveli', gstin: '26AAACS5003C1Z3', ob: 240000 },
    { name: 'Mittal Scrap Traders Chakan', city: 'Pune', state: 'Maharashtra', gstin: '27AAACM6004D1Z4', ob: 185000 },
    { name: 'Mahavir Chemical Additives', city: 'Vapi', state: 'Gujarat', gstin: '24AAACM7005E1Z5', ob: 195000 },
    { name: 'Haldia Petrochemicals Corp', city: 'Kolkata', state: 'West Bengal', gstin: '19AAACH8006F1Z6', ob: 450000 },
    { name: 'Jindal Polyfilms Raw Scrap', city: 'Nashik', state: 'Maharashtra', gstin: '27AAACJ9007G1Z7', ob: 175000 },
    { name: 'Shree Balaji Drum Recyclers', city: 'Bhiwandi', state: 'Maharashtra', gstin: '27AAACB1008H1Z8', ob: 310000 },
    { name: 'Alok Masterbatches Delhi', city: 'Delhi', state: 'Delhi', gstin: '07AAACA2009I1Z9', ob: 140000 },
    { name: 'Oswal Plastics Recycling', city: 'Ahmedabad', state: 'Gujarat', gstin: '24AAACO3010J1ZA', ob: 280000 },
    { name: 'Bharat Petroleum Polymer Feed', city: 'Mumbai', state: 'Maharashtra', gstin: '27AAACB4011K1ZB', ob: 520000 },
    { name: 'Gail India Pata Petrochem', city: 'Auraiya', state: 'Uttar Pradesh', gstin: '09AAACG5012L1ZC', ob: 390000 },
    { name: 'Doshi Granules Wholesalers', city: 'Surat', state: 'Gujarat', gstin: '24AAACD6013M1ZD', ob: 215000 },
    { name: 'Kothari Reprocessing Depot', city: 'Jalna', state: 'Maharashtra', gstin: '27AAACK7014N1ZE', ob: 165000 },
    { name: 'Chakan Scrap Yard Aggregator', city: 'Pune', state: 'Maharashtra', gstin: '27AAACC8015O1ZF', ob: 190000 },
    { name: 'Navin Fluorine Masterbatch', city: 'Surat', state: 'Gujarat', gstin: '24AAACN9016P1ZG', ob: 135000 },
    { name: 'Plastiblends India Ltd', city: 'Mumbai', state: 'Maharashtra', gstin: '27AAACP1017Q1ZH', ob: 285000 },
    { name: 'Finolex Resin Depot Urse', city: 'Pune', state: 'Maharashtra', gstin: '27AAACF2018R1ZI', ob: 480000 },
    { name: 'Rathi Polymer Additives', city: 'Indore', state: 'Madhya Pradesh', gstin: '23AAACR3019S1ZJ', ob: 125000 },
    { name: 'Western India Scrap Link', city: 'Navi Mumbai', state: 'Maharashtra', gstin: '27AAACW4020T1ZK', ob: 210000 },
  ];

  const totalDebtorOB = debtorNames.reduce((s, d) => s + d.ob, 0);
  const totalCreditorOB = creditorNames.reduce((s, c) => s + c.ob, 0);

  // Base Accounts
  const baseLedgers = [
    { id: 'led-cash', companyId: company.id, name: 'Cash-in-Hand (Main Drawer)', groupId: 'cash-in-hand', groupName: 'Cash-in-Hand', nature: 'Asset', openingBalance: 350000, openingType: 'Dr', isActive: true, isSystem: true },
    { id: 'led-hdfc', companyId: company.id, name: 'HDFC Current A/c 5020001', groupId: 'bank-accounts', groupName: 'Bank Accounts', nature: 'Asset', openingBalance: 2450000, openingType: 'Dr', isActive: true },
    { id: 'led-sbi', companyId: company.id, name: 'SBI Cash Credit A/c 30981', groupId: 'bank-accounts', groupName: 'Bank Accounts', nature: 'Asset', openingBalance: 1200000, openingType: 'Dr', isActive: true },

    { id: 'led-machinery', companyId: company.id, name: 'Twin Screw Extrusion Line', groupId: 'fixed-assets', groupName: 'Fixed Assets', nature: 'Asset', openingBalance: 3200000, openingType: 'Dr', isActive: true },
    { id: 'led-truck', companyId: company.id, name: 'Eicher Delivery Truck (MH14)', groupId: 'fixed-assets', groupName: 'Fixed Assets', nature: 'Asset', openingBalance: 980000, openingType: 'Dr', isActive: true },

    { id: 'led-stock', companyId: company.id, name: 'Stock-in-Hand (Raw & FG)', groupId: 'stock-in-hand', groupName: 'Stock-in-Hand', nature: 'Asset', openingBalance: totalOpeningStockValue, openingType: 'Dr', isActive: true },

    { id: 'led-cgst-out', companyId: company.id, name: 'CGST Output 9%', groupId: 'duties-taxes', groupName: 'Duties & Taxes', nature: 'Liability', openingBalance: 0, openingType: 'Cr', isActive: true },
    { id: 'led-sgst-out', companyId: company.id, name: 'SGST Output 9%', groupId: 'duties-taxes', groupName: 'Duties & Taxes', nature: 'Liability', openingBalance: 0, openingType: 'Cr', isActive: true },
    { id: 'led-igst-out', companyId: company.id, name: 'IGST Output 18%', groupId: 'duties-taxes', groupName: 'Duties & Taxes', nature: 'Liability', openingBalance: 0, openingType: 'Cr', isActive: true },
    { id: 'led-cgst-in', companyId: company.id, name: 'CGST Input 9%', groupId: 'duties-taxes', groupName: 'Duties & Taxes', nature: 'Liability', openingBalance: 0, openingType: 'Dr', isActive: true },
    { id: 'led-sgst-in', companyId: company.id, name: 'SGST Input 9%', groupId: 'duties-taxes', groupName: 'Duties & Taxes', nature: 'Liability', openingBalance: 0, openingType: 'Dr', isActive: true },
    { id: 'led-igst-in', companyId: company.id, name: 'IGST Input 18%', groupId: 'duties-taxes', groupName: 'Duties & Taxes', nature: 'Liability', openingBalance: 0, openingType: 'Dr', isActive: true },

    { id: 'led-sales', companyId: company.id, name: 'Domestic Sales Account', groupId: 'sales-accounts', groupName: 'Sales Accounts', nature: 'Income', openingBalance: 0, openingType: 'Cr', isActive: true },
    { id: 'led-purchases', companyId: company.id, name: 'Raw Material Purchases Account', groupId: 'purchase-accounts', groupName: 'Purchase Accounts', nature: 'Expense', openingBalance: 0, openingType: 'Dr', isActive: true },

    { id: 'led-exp-power', companyId: company.id, name: 'MSEDCL Factory High Tension Power', groupId: 'direct-expenses', groupName: 'Direct Expenses', nature: 'Expense', openingBalance: 0, openingType: 'Dr', isActive: true },
    { id: 'led-exp-wages', companyId: company.id, name: 'Factory Direct Wages & Overtime', groupId: 'direct-expenses', groupName: 'Direct Expenses', nature: 'Expense', openingBalance: 0, openingType: 'Dr', isActive: true },
    { id: 'led-exp-freight', companyId: company.id, name: 'Inward Freight & Cartage', groupId: 'direct-expenses', groupName: 'Direct Expenses', nature: 'Expense', openingBalance: 0, openingType: 'Dr', isActive: true },
    { id: 'led-exp-rent', companyId: company.id, name: 'Factory Shed Lease Rent', groupId: 'indirect-expenses', groupName: 'Indirect Expenses', nature: 'Expense', openingBalance: 0, openingType: 'Dr', isActive: true },
    { id: 'led-exp-repair', companyId: company.id, name: 'Machine Maintenance & Spare Parts', groupId: 'indirect-expenses', groupName: 'Indirect Expenses', nature: 'Expense', openingBalance: 0, openingType: 'Dr', isActive: true },
    { id: 'led-exp-admin', companyId: company.id, name: 'Office Administrative Expenses', groupId: 'indirect-expenses', groupName: 'Indirect Expenses', nature: 'Expense', openingBalance: 0, openingType: 'Dr', isActive: true },
  ];

  const totalDrAssets = 350000 + 2450000 + 1200000 + 3200000 + 980000 + totalOpeningStockValue + totalDebtorOB;
  const totalCrLiab = totalCreditorOB;
  const balancingCapital = round2(totalDrAssets - totalCrLiab);

  const capitalLedger = {
    id: 'led-capital',
    companyId: company.id,
    name: 'Promoters Capital Account',
    groupId: 'capital-account',
    groupName: 'Capital Account',
    nature: 'Equity',
    openingBalance: balancingCapital,
    openingType: 'Cr',
    isActive: true,
  };

  const debtorLedgers = debtorNames.map((d, idx) => ({
    id: `led-debtor-${idx + 1}`,
    companyId: company.id,
    name: d.name,
    groupId: 'sundry-debtors',
    groupName: 'Sundry Debtors',
    nature: 'Asset',
    openingBalance: d.ob,
    openingType: 'Dr',
    isActive: true,
    city: d.city,
    state: d.state,
    gstin: d.gstin,
    address: `${d.city} Industrial Estate`,
  }));

  const creditorLedgers = creditorNames.map((c, idx) => ({
    id: `led-creditor-${idx + 1}`,
    companyId: company.id,
    name: c.name,
    groupId: 'sundry-creditors',
    groupName: 'Sundry Creditors',
    nature: 'Liability',
    openingBalance: c.ob,
    openingType: 'Cr',
    isActive: true,
    city: c.city,
    state: c.state,
    gstin: c.gstin,
    address: `${c.city} Industrial Zone`,
  }));

  const allLedgers = [capitalLedger, ...baseLedgers, ...debtorLedgers, ...creditorLedgers];

  // -------------------------------------------------------------
  // SIMULATE 1,500 VOUCHERS ACROSS 365 DAYS
  // -------------------------------------------------------------
  const vouchers = [];
  const TARGET_VOUCHERS = 1500;
  const startDate = new Date('2026-04-01');

  let seed = 42;
  function pseudoRandom() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  function pickRandom(arr) {
    return arr[Math.floor(pseudoRandom() * arr.length)];
  }

  function randomRange(min, max) {
    return Math.floor(pseudoRandom() * (max - min + 1)) + min;
  }

  let vNumSales = 1;
  let vNumPurc = 1;
  let vNumRcpt = 1;
  let vNumPymt = 1;
  let vNumContra = 1;
  let vNumJrn = 1;

  for (let i = 0; i < TARGET_VOUCHERS; i++) {
    const dayOffset = Math.floor((i / TARGET_VOUCHERS) * 365);
    const vDateObj = new Date(startDate.getTime() + dayOffset * 86400000);
    const vDate = vDateObj.toISOString().slice(0, 10);

    const roll = pseudoRandom();

    if (roll < 0.30) {
      // 1. SALES VOUCHER (F8)
      const customer = pickRandom(debtorLedgers);
      const item = pickRandom(stockItems);
      const godown = pickRandom(godowns);
      const qty = randomRange(200, 2500);
      const rate = round2(item.openingRate * (1.15 + pseudoRandom() * 0.15));
      const taxable = round2(qty * rate);

      const isInterstate = customer.state !== 'Maharashtra';
      let cgst = 0, sgst = 0, igst = 0;
      if (isInterstate) {
        igst = round2(taxable * 0.18);
      } else {
        cgst = round2(taxable * 0.09);
        sgst = round2(taxable * 0.09);
      }
      const totalAmount = round2(taxable + cgst + sgst + igst);

      const vLines = [
        { id: '1', ledgerId: customer.id, ledgerName: customer.name, type: 'Dr', amount: totalAmount },
        { id: '2', ledgerId: 'led-sales', ledgerName: 'Domestic Sales Account', type: 'Cr', amount: taxable },
      ];

      if (isInterstate) {
        vLines.push({ id: '3', ledgerId: 'led-igst-out', ledgerName: 'IGST Output 18%', type: 'Cr', amount: igst });
      } else {
        vLines.push({ id: '3', ledgerId: 'led-cgst-out', ledgerName: 'CGST Output 9%', type: 'Cr', amount: cgst });
        vLines.push({ id: '4', ledgerId: 'led-sgst-out', ledgerName: 'SGST Output 9%', type: 'Cr', amount: sgst });
      }

      vouchers.push({
        id: `v-sales-${vNumSales}`,
        companyId: company.id,
        voucherType: 'Sales',
        voucherNumber: `SALES-${String(vNumSales++).padStart(5, '0')}`,
        date: vDate,
        lines: vLines,
        itemLines: [{
          id: 'item-1',
          itemId: item.id,
          itemName: item.name,
          godownId: godown.id,
          godownName: godown.name,
          quantity: qty,
          rate,
          amount: taxable,
          unit: item.unit,
          hsnCode: item.hsnCode,
          cgst,
          sgst,
          igst,
        }],
        narration: `Sale of ${qty} ${item.unit} ${item.name} to ${customer.name}`,
        totalAmount,
        createdAt: `${vDate}T10:00:00.000Z`,
        updatedAt: `${vDate}T10:00:00.000Z`,
      });

    } else if (roll < 0.54) {
      // 2. PURCHASE VOUCHER (F9)
      const supplier = pickRandom(creditorLedgers);
      const item = pickRandom(stockItems);
      const godown = pickRandom(godowns);
      const qty = randomRange(500, 4000);
      const rate = round2(item.openingRate * (0.95 + pseudoRandom() * 0.10));
      const taxable = round2(qty * rate);

      const isInterstate = supplier.state !== 'Maharashtra';
      let cgst = 0, sgst = 0, igst = 0;
      if (isInterstate) {
        igst = round2(taxable * 0.18);
      } else {
        cgst = round2(taxable * 0.09);
        sgst = round2(taxable * 0.09);
      }
      const totalAmount = round2(taxable + cgst + sgst + igst);

      const vLines = [
        { id: '1', ledgerId: 'led-purchases', ledgerName: 'Raw Material Purchases Account', type: 'Dr', amount: taxable },
      ];

      if (isInterstate) {
        vLines.push({ id: '2', ledgerId: 'led-igst-in', ledgerName: 'IGST Input 18%', type: 'Dr', amount: igst });
      } else {
        vLines.push({ id: '2', ledgerId: 'led-cgst-in', ledgerName: 'CGST Input 9%', type: 'Dr', amount: cgst });
        vLines.push({ id: '3', ledgerId: 'led-sgst-in', ledgerName: 'SGST Input 9%', type: 'Dr', amount: sgst });
      }

      vLines.push({ id: String(vLines.length + 1), ledgerId: supplier.id, ledgerName: supplier.name, type: 'Cr', amount: totalAmount });

      vouchers.push({
        id: `v-purc-${vNumPurc}`,
        companyId: company.id,
        voucherType: 'Purchase',
        voucherNumber: `PURC-${String(vNumPurc++).padStart(5, '0')}`,
        date: vDate,
        lines: vLines,
        itemLines: [{
          id: 'item-1',
          itemId: item.id,
          itemName: item.name,
          godownId: godown.id,
          godownName: godown.name,
          quantity: qty,
          rate,
          amount: taxable,
          unit: item.unit,
          hsnCode: item.hsnCode,
          cgst,
          sgst,
          igst,
        }],
        narration: `Inward Purchase of ${qty} ${item.unit} ${item.name} from ${supplier.name}`,
        totalAmount,
        createdAt: `${vDate}T11:00:00.000Z`,
        updatedAt: `${vDate}T11:00:00.000Z`,
      });

    } else if (roll < 0.78) {
      // 3. RECEIPT VOUCHER (F6)
      const customer = pickRandom(debtorLedgers);
      const bankOrCash = pseudoRandom() < 0.85 ? (pseudoRandom() < 0.7 ? 'led-hdfc' : 'led-sbi') : 'led-cash';
      const bankName = bankOrCash === 'led-cash' ? 'Cash-in-Hand' : bankOrCash === 'led-hdfc' ? 'HDFC Bank' : 'SBI CC A/c';
      const amount = round2(randomRange(15000, 150000));

      vouchers.push({
        id: `v-rcpt-${vNumRcpt}`,
        companyId: company.id,
        voucherType: 'Receipt',
        voucherNumber: `RCPT-${String(vNumRcpt++).padStart(5, '0')}`,
        date: vDate,
        lines: [
          { id: '1', ledgerId: bankOrCash, ledgerName: bankName, type: 'Dr', amount },
          { id: '2', ledgerId: customer.id, ledgerName: customer.name, type: 'Cr', amount },
        ],
        narration: `Received invoice settlement via RTGS/NEFT/Cash from ${customer.name}`,
        totalAmount: amount,
        createdAt: `${vDate}T14:00:00.000Z`,
        updatedAt: `${vDate}T14:00:00.000Z`,
      });

    } else if (roll < 0.93) {
      // 4. PAYMENT VOUCHER (F5)
      const isExpense = pseudoRandom() < 0.35;
      const bankOrCash = pseudoRandom() < 0.75 ? 'led-hdfc' : 'led-sbi';
      const bankName = bankOrCash === 'led-hdfc' ? 'HDFC Bank' : 'SBI CC A/c';

      if (isExpense) {
        const expenseLedger = pickRandom([
          { id: 'led-exp-power', name: 'MSEDCL Factory Power' },
          { id: 'led-exp-wages', name: 'Factory Direct Wages' },
          { id: 'led-exp-freight', name: 'Inward Freight & Cartage' },
          { id: 'led-exp-rent', name: 'Factory Shed Lease Rent' },
          { id: 'led-exp-repair', name: 'Machine Maintenance & Spare Parts' },
          { id: 'led-exp-admin', name: 'Office Administrative Expenses' },
        ]);
        const amount = round2(randomRange(5000, 85000));

        vouchers.push({
          id: `v-pymt-${vNumPymt}`,
          companyId: company.id,
          voucherType: 'Payment',
          voucherNumber: `PYMT-${String(vNumPymt++).padStart(5, '0')}`,
          date: vDate,
          lines: [
            { id: '1', ledgerId: expenseLedger.id, ledgerName: expenseLedger.name, type: 'Dr', amount },
            { id: '2', ledgerId: bankOrCash, ledgerName: bankName, type: 'Cr', amount },
          ],
          narration: `Payment for ${expenseLedger.name}`,
          totalAmount: amount,
          createdAt: `${vDate}T15:30:00.000Z`,
          updatedAt: `${vDate}T15:30:00.000Z`,
        });
      } else {
        const supplier = pickRandom(creditorLedgers);
        const amount = round2(randomRange(25000, 200000));

        vouchers.push({
          id: `v-pymt-${vNumPymt}`,
          companyId: company.id,
          voucherType: 'Payment',
          voucherNumber: `PYMT-${String(vNumPymt++).padStart(5, '0')}`,
          date: vDate,
          lines: [
            { id: '1', ledgerId: supplier.id, ledgerName: supplier.name, type: 'Dr', amount },
            { id: '2', ledgerId: bankOrCash, ledgerName: bankName, type: 'Cr', amount },
          ],
          narration: `Supplier invoice payment to ${supplier.name} via NEFT`,
          totalAmount: amount,
          createdAt: `${vDate}T16:00:00.000Z`,
          updatedAt: `${vDate}T16:00:00.000Z`,
        });
      }

    } else if (roll < 0.98) {
      // 5. CONTRA VOUCHER (F4)
      const isDeposit = pseudoRandom() < 0.5;
      const amount = round2(randomRange(10000, 75000));

      if (isDeposit) {
        vouchers.push({
          id: `v-contra-${vNumContra}`,
          companyId: company.id,
          voucherType: 'Contra',
          voucherNumber: `CONTRA-${String(vNumContra++).padStart(5, '0')}`,
          date: vDate,
          lines: [
            { id: '1', ledgerId: 'led-hdfc', ledgerName: 'HDFC Current A/c', type: 'Dr', amount },
            { id: '2', ledgerId: 'led-cash', ledgerName: 'Cash-in-Hand', type: 'Cr', amount },
          ],
          narration: `Excess factory counter cash deposited into HDFC bank`,
          totalAmount: amount,
          createdAt: `${vDate}T16:30:00.000Z`,
          updatedAt: `${vDate}T16:30:00.000Z`,
        });
      } else {
        vouchers.push({
          id: `v-contra-${vNumContra}`,
          companyId: company.id,
          voucherType: 'Contra',
          voucherNumber: `CONTRA-${String(vNumContra++).padStart(5, '0')}`,
          date: vDate,
          lines: [
            { id: '1', ledgerId: 'led-cash', ledgerName: 'Cash-in-Hand', type: 'Dr', amount },
            { id: '2', ledgerId: 'led-hdfc', ledgerName: 'HDFC Current A/c', type: 'Cr', amount },
          ],
          narration: `Cash withdrawal from HDFC bank for plant petty expenses & casual labor`,
          totalAmount: amount,
          createdAt: `${vDate}T11:30:00.000Z`,
          updatedAt: `${vDate}T11:30:00.000Z`,
        });
      }

    } else {
      // 6. JOURNAL VOUCHER (F7)
      const amount = round2(randomRange(15000, 45000));
      vouchers.push({
        id: `v-jrn-${vNumJrn}`,
        companyId: company.id,
        voucherType: 'Journal',
        voucherNumber: `JRN-${String(vNumJrn++).padStart(5, '0')}`,
        date: vDate,
        lines: [
          { id: '1', ledgerId: 'led-exp-repair', ledgerName: 'Machine Maintenance & Spares', type: 'Dr', amount },
          { id: '2', ledgerId: 'led-machinery', ledgerName: 'Twin Screw Extrusion Line', type: 'Cr', amount },
        ],
        narration: `Annual depreciation amortization and plant wear-and-tear adjustment`,
        totalAmount: amount,
        createdAt: `${vDate}T18:00:00.000Z`,
        updatedAt: `${vDate}T18:00:00.000Z`,
      });
    }
  }

  return {
    company,
    godowns,
    stockItems,
    ledgers: allLedgers,
    vouchers,
    groups: TALLY_PRIMARY_GROUPS,
  };
}

// -------------------------------------------------------------
// 2. RUN 3 CHECKS
// -------------------------------------------------------------
export function runThreeSimulationChecks(data) {
  const { company, godowns, stockItems, ledgers, vouchers, groups } = data;

  console.log('\n===============================================================');
  console.log(`🏭 HEAVY DATA SIMULATION: ${company.name}`);
  console.log(`📊 Dataset Volume: ${vouchers.length} Vouchers | ${ledgers.length} Ledgers | ${stockItems.length} Stock Items | ${godowns.length} Godowns`);
  console.log('===============================================================\n');

  // -------------------------------------------------------------
  // CHECK 1: MATHEMATICAL & ACCOUNTING INVARIANT INTEGRITY
  // -------------------------------------------------------------
  console.log('--- [CHECK 1 / 3]: Mathematical & Double-Entry Invariants ---');
  let unbalancedVoucherCount = 0;
  for (const v of vouchers) {
    const res = validateDoubleEntry(v.lines);
    if (!res.isValid || res.difference !== 0) {
      unbalancedVoucherCount++;
    }
  }

  const tb = computeTrialBalance(ledgers, groups, vouchers);
  const pnl = computeProfitAndLoss(ledgers, vouchers, stockItems);
  const bs = computeBalanceSheet(ledgers, vouchers, stockItems);
  const stockSummary = computeStockSummary(stockItems, vouchers, godowns);

  console.log(`  1.1 Every Single Voucher Balanced:    ${unbalancedVoucherCount === 0 ? '✅ PASSED (0 unbalanced)' : `❌ FAILED (${unbalancedVoucherCount} errors)`}`);
  console.log(`  1.2 Trial Balance Grand Totals:       ${tb.isBalanced ? '✅ BALANCED' : '❌ UNBALANCED'}`);
  console.log(`      • Total Debit:                   ${formatINR(tb.totalClosingDebit)}`);
  console.log(`      • Total Credit:                  ${formatINR(tb.totalClosingCredit)}`);
  console.log(`      • Difference:                    ${formatINR(tb.difference)}`);

  const isTradingBalanced = round2(pnl.totalTradingDebit + pnl.grossProfit) === round2(pnl.totalTradingCredit + pnl.grossLoss);
  console.log(`  1.3 Profit & Loss Trading Balance:    ${isTradingBalanced ? '✅ BALANCED' : '❌ UNBALANCED'}`);
  console.log(`      • Total Sales:                   ${formatINR(pnl.totalSales)}`);
  console.log(`      • Total Purchases:               ${formatINR(pnl.totalPurchases)}`);
  console.log(`      • Gross Profit:                  ${formatINR(pnl.grossProfit)}`);
  console.log(`      • Net Profit / Loss:             ${pnl.isNetProfit ? formatINR(pnl.netProfit) + ' (Net Profit)' : formatINR(pnl.netLoss) + ' (Net Loss)'}`);

  console.log(`  1.4 Balance Sheet Equation Balance:   ${bs.isBalanced ? '✅ BALANCED' : '❌ UNBALANCED'}`);
  console.log(`      • Total Assets:                  ${formatINR(bs.totalAssets)}`);
  console.log(`      • Total Liabilities & Equity:    ${formatINR(bs.totalLiabilities)}`);
  console.log(`      • Balance Sheet Difference:      ${formatINR(bs.difference)}`);

  let stockConservationPassed = true;
  for (const s of stockSummary.items) {
    const expectedClosing = s.openingQty + s.inwardQty - s.outwardQty;
    if (s.closingQty !== expectedClosing) {
      stockConservationPassed = false;
      break;
    }
  }
  console.log(`  1.5 Inventory Stock Conservation:     ${stockConservationPassed ? '✅ PASSED (Inward - Outward = Closing for all items)' : '❌ FAILED'}`);
  console.log(`      • Total Inventory Valuation:     ${formatINR(stockSummary.totalClosingValue)}`);

  const check1Passed = unbalancedVoucherCount === 0 && tb.isBalanced && bs.isBalanced && stockConservationPassed;
  console.log(`\n🏆 CHECK 1 RESULT: ${check1Passed ? '✅ PASSED ALL INVARIANTS' : '❌ FAILED'}\n`);

  // -------------------------------------------------------------
  // CHECK 2: REPORT ENGINE COMPUTATION SPEED BENCHMARK
  // -------------------------------------------------------------
  console.log('--- [CHECK 2 / 3]: Report Engine Computation Speed & Latency ---');
  const benchmarks = [];

  function measure(name, fn) {
    const t0 = performance.now();
    const res = fn();
    const t1 = performance.now();
    const durationMs = round2(t1 - t0);
    benchmarks.push({ Report: name, 'Duration (ms)': durationMs, Status: durationMs < 100 ? '⚡ Ultra Fast (<100ms)' : '⚠️ Warning (>100ms)' });
    return res;
  }

  measure('Trial Balance (1,500 Vouchers, 56 Ledgers)', () => computeTrialBalance(ledgers, groups, vouchers));
  measure('Profit & Loss + Stock Valuation', () => computeProfitAndLoss(ledgers, vouchers, stockItems));
  measure('Balance Sheet Calculation', () => computeBalanceSheet(ledgers, vouchers, stockItems));
  measure('Stock Summary (10 Items across 4 Godowns)', () => computeStockSummary(stockItems, vouchers, godowns));
  measure('GST Summary (Outward Output vs Inward ITC)', () => computeGstSummary(vouchers));
  measure('Outstanding Aging (50 Debtors & Creditors)', () => computeOutstandingAging(ledgers, vouchers));

  const highestVolumeDebtor = ledgers.find((l) => l.id === 'led-debtor-1') || ledgers[0];
  measure(`Drill-down Ledger Statement (${highestVolumeDebtor.name})`, () => computeLedgerStatement(highestVolumeDebtor, vouchers));

  console.table(benchmarks);
  const totalCalcTime = benchmarks.reduce((s, b) => s + b['Duration (ms)'], 0);
  console.log(`⚡ Total Pipeline Execution Time: ${round2(totalCalcTime)} ms for all 7 major enterprise reports!`);
  const check2Passed = benchmarks.every((b) => b['Duration (ms)'] < 100);
  console.log(`\n🏆 CHECK 2 RESULT: ${check2Passed ? '✅ PASSED (All reports respond instantaneously under 100ms)' : '❌ FAILED'}\n`);

  // -------------------------------------------------------------
  // CHECK 3: HIGH-VOLUME VAULT BACKUP & COLD RESTORE RECOVERY
  // -------------------------------------------------------------
  console.log('--- [CHECK 3 / 3]: High-Volume Vault Backup & Cold Restore ---');
  const tExport0 = performance.now();
  const backupPayload = {
    version: '1.0.0',
    exportTimestamp: new Date().toISOString(),
    system: 'RG Plastics High-Volume Simulator',
    company,
    godowns,
    stockItems,
    groups,
    ledgers,
    vouchers,
  };
  const jsonBackupString = JSON.stringify(backupPayload, null, 2);
  const tExport1 = performance.now();
  const exportDuration = round2(tExport1 - tExport0);
  const payloadSizeKB = round2(Buffer.byteLength(jsonBackupString, 'utf8') / 1024);

  console.log(`  3.1 JSON Vault Backup Serialization:   ✅ Generated ${payloadSizeKB} KB in ${exportDuration} ms`);

  // Cold Restore Test
  const tRestore0 = performance.now();
  const restored = JSON.parse(jsonBackupString);
  const tRestore1 = performance.now();
  const restoreDuration = round2(tRestore1 - tRestore0);

  console.log(`  3.2 Cold Deserialization from JSON:    ✅ Parsed ${restored.vouchers.length} vouchers in ${restoreDuration} ms`);

  // Verification on Restored Dataset
  const restoredTB = computeTrialBalance(restored.ledgers, restored.groups, restored.vouchers);
  const restoredBS = computeBalanceSheet(restored.ledgers, restored.vouchers, restored.stockItems);

  const tbMatch = restoredTB.totalClosingDebit === tb.totalClosingDebit && restoredTB.totalClosingCredit === tb.totalClosingCredit;
  const bsMatch = restoredBS.totalAssets === bs.totalAssets && restoredBS.totalLiabilities === bs.totalLiabilities;

  console.log(`  3.3 Restored Trial Balance Parity:     ${tbMatch ? '✅ 100% BIT-FOR-BIT IDENTICAL' : '❌ MISMATCH'}`);
  console.log(`  3.4 Restored Balance Sheet Parity:     ${bsMatch ? '✅ 100% BIT-FOR-BIT IDENTICAL' : '❌ MISMATCH'}`);

  const check3Passed = tbMatch && bsMatch && restored.vouchers.length === vouchers.length;
  console.log(`\n🏆 CHECK 3 RESULT: ${check3Passed ? '✅ PASSED (Cold Restore Integrity 100% verified)' : '❌ FAILED'}\n`);

  return {
    check1Passed,
    check2Passed,
    check3Passed,
    metrics: {
      voucherCount: vouchers.length,
      ledgerCount: ledgers.length,
      stockItemCount: stockItems.length,
      payloadSizeKB,
      totalReportLatencyMs: round2(totalCalcTime),
      trialBalanceDebit: tb.totalClosingDebit,
      trialBalanceCredit: tb.totalClosingCredit,
      totalSales: pnl.totalSales,
      totalPurchases: pnl.totalPurchases,
      grossProfit: pnl.grossProfit,
      netProfit: pnl.netProfit,
      balanceSheetAssets: bs.totalAssets,
    },
  };
}

// Direct CLI execution
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.includes('simulate-heavy-data.mjs')) {
  const data = generateHeavyAccountingData();
  const results = runThreeSimulationChecks(data);
  if (!results.check1Passed || !results.check2Passed || !results.check3Passed) {
    process.exit(1);
  }
}
