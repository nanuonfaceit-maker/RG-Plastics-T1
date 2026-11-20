/**
 * Core Accounting Engine
 * Implements strict double-entry ledger calculation, trial balance balancing,
 * voucher validation, and Indian currency/date formatting.
 */
import type {
  AccountGroup,
  AccountNature,
  LedgerAccount,
  Voucher,
  BalanceType,
  TallyVoucherType,
  VoucherEntryLine,
} from '../types/accounting.ts';
import type { StockItem, Godown, ItemEntryLine } from '../types/inventory.ts';
import { validateDoubleEntry, TALLY_PRIMARY_GROUPS } from '../types/accounting.ts';

export { validateDoubleEntry };

/**
 * Format amounts according to the Indian Numbering System (e.g. ₹1,23,456.78)
 */
export function formatINR(amount: number, showSign: boolean = false): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '₹0.00';

  const isNeg = n < 0;
  const abs = Math.abs(n);
  const parts = abs.toFixed(2).split('.');
  let intPart = parts[0];
  const decPart = parts[1];

  // Indian comma formatting: last 3 digits, then groups of 2
  if (intPart.length > 3) {
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    intPart = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
  }

  const sign = isNeg ? '-' : showSign && n > 0 ? '+' : '';
  return `${sign}₹${intPart}.${decPart}`;
}

export function formatINRWithDrCr(amount: number, type?: BalanceType): string {
  const abs = Math.abs(amount);
  if (abs === 0) return `${formatINR(0)} Settled`;
  return `${formatINR(abs)} ${type || (amount >= 0 ? 'Dr' : 'Cr')}`;
}

export function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Convert numbers to Indian Rupees in words with Paise support
 */
export function numberToWordsINR(amount: number): string {
  if (!Number.isFinite(amount)) return 'Zero Rupees Only';

  const isNeg = amount < 0;
  const absAmt = Math.abs(amount);
  const rounded = Math.round(absAmt * 100) / 100;
  const n = Math.floor(rounded);
  const paise = Math.round((rounded - n) * 100);

  if (n === 0 && paise === 0) return 'Zero Rupees Only';

  const units = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertBelowThousand(num: number): string {
    let str = '';
    if (num >= 100) {
      str += units[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    if (num >= 20) {
      str += tens[Math.floor(num / 10)] + ' ';
      num %= 10;
    }
    if (num > 0) {
      str += units[num] + ' ';
    }
    return str.trim();
  }

  let words = '';
  if (n > 0) {
    const crore = Math.floor(n / 10000000);
    let rem = n % 10000000;
    const lakh = Math.floor(rem / 100000);
    rem %= 100000;
    const thousand = Math.floor(rem / 1000);
    rem %= 1000;

    if (crore > 0) words += convertBelowThousand(crore) + ' Crore ';
    if (lakh > 0) words += convertBelowThousand(lakh) + ' Lakh ';
    if (thousand > 0) words += convertBelowThousand(thousand) + ' Thousand ';
    if (rem > 0) words += convertBelowThousand(rem);
    words = `${words.trim()} Rupees`;
  }

  if (paise > 0) {
    const paiseWords = convertBelowThousand(paise);
    if (words) {
      words += ` and ${paiseWords} Paise`;
    } else {
      words = `${paiseWords} Paise`;
    }
  }

  const prefix = isNeg ? 'Minus ' : '';
  return `${prefix}${words} Only`;
}

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function round2(n: number): number {
  const num = Number(n);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate net closing balance for a ledger account
 */
export interface LedgerStatementEntry {
  voucherId: string;
  voucherNumber: string;
  voucherType: TallyVoucherType;
  date: string;
  particulars: string;
  debit: number;
  credit: number;
  runningBalance: number;
  runningType: BalanceType;
}

export interface LedgerStatement {
  ledger: LedgerAccount;
  openingBalance: number;
  openingType: BalanceType;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  closingType: BalanceType;
  entries: LedgerStatementEntry[];
}

export function computeLedgerStatement(
  ledger: LedgerAccount,
  vouchers: Voucher[],
  fromDate?: string,
  toDate?: string
): LedgerStatement {
  // Opening balance in signed terms: Dr is positive, Cr is negative (for Assets/Expenses)
  let netCents = (ledger.openingType === 'Dr' ? 1 : -1) * Math.round((ledger.openingBalance || 0) * 100);

  // Filter vouchers related to this ledger
  const sortedVouchers = [...vouchers]
    .filter((v) => v.lines.some((l) => l.ledgerId === ledger.id))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.voucherNumber.localeCompare(b.voucherNumber)));

  // If fromDate is specified, advance netCents by all vouchers strictly before fromDate
  if (fromDate) {
    for (const v of sortedVouchers) {
      if (v.date < fromDate) {
        let vDr = 0;
        let vCr = 0;
        for (const line of v.lines) {
          if (line.ledgerId === ledger.id) {
            if (line.type === 'Dr') vDr += Math.round(Number(line.amount || 0) * 100);
            else if (line.type === 'Cr') vCr += Math.round(Number(line.amount || 0) * 100);
          }
        }
        netCents += vDr - vCr;
      }
    }
  }

  const periodOpeningBalance = fromDate ? Math.abs(netCents) / 100 : (ledger.openingBalance || 0);
  const periodOpeningType: BalanceType = fromDate ? (netCents >= 0 ? 'Dr' : 'Cr') : (ledger.openingType || 'Dr');

  let periodDebitCents = 0;
  let periodCreditCents = 0;
  const entries: LedgerStatementEntry[] = [];

  for (const v of sortedVouchers) {
    if (fromDate && v.date < fromDate) continue;
    if (toDate && v.date > toDate) continue;

    let voucherDr = 0;
    let voucherCr = 0;

    for (const line of v.lines) {
      if (line.ledgerId === ledger.id) {
        if (line.type === 'Dr') voucherDr += Math.round(Number(line.amount || 0) * 100);
        else if (line.type === 'Cr') voucherCr += Math.round(Number(line.amount || 0) * 100);
      }
    }

    const otherLines = v.lines.filter((l) => l.ledgerId !== ledger.id);
    const particulars =
      otherLines.length === 1
        ? otherLines[0].ledgerName
        : otherLines.length > 1
        ? `As per details (${otherLines.map((o) => o.ledgerName).slice(0, 2).join(', ')}${otherLines.length > 2 ? '...' : ''})`
        : v.narration || v.voucherType;

    netCents += voucherDr - voucherCr;
    periodDebitCents += voucherDr;
    periodCreditCents += voucherCr;

    const runningBal = Math.abs(netCents) / 100;
    const runningType: BalanceType = netCents >= 0 ? 'Dr' : 'Cr';

    entries.push({
      voucherId: v.id,
      voucherNumber: v.voucherNumber,
      voucherType: v.voucherType,
      date: v.date,
      particulars: particulars,
      debit: voucherDr / 100,
      credit: voucherCr / 100,
      runningBalance: runningBal,
      runningType: runningType,
    });
  }

  const closingBalance = Math.abs(netCents) / 100;
  const closingType: BalanceType = netCents >= 0 ? 'Dr' : 'Cr';

  return {
    ledger,
    openingBalance: periodOpeningBalance,
    openingType: periodOpeningType,
    totalDebit: periodDebitCents / 100,
    totalCredit: periodCreditCents / 100,
    closingBalance,
    closingType,
    entries,
  };
}

/**
 * Trial Balance Row
 */
export interface TrialBalanceItem {
  ledgerId: string;
  ledgerName: string;
  groupId: string;
  groupName: string;
  nature: AccountNature;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export interface TrialBalanceGroupSummary {
  group: AccountGroup;
  closingDebit: number;
  closingCredit: number;
  items: TrialBalanceItem[];
}

export interface TrialBalanceReport {
  fromDate?: string;
  toDate?: string;
  groups: TrialBalanceGroupSummary[];
  totalOpeningDebit: number;
  totalOpeningCredit: number;
  totalPeriodDebit: number;
  totalPeriodCredit: number;
  totalClosingDebit: number;
  totalClosingCredit: number;
  isBalanced: boolean;
  difference: number;
}

export function computeTrialBalance(
  ledgers: LedgerAccount[],
  groups: AccountGroup[],
  vouchers: Voucher[],
  fromDate?: string,
  toDate?: string
): TrialBalanceReport {
  const groupMap = new Map<string, AccountGroup>();
  for (const g of groups) groupMap.set(g.id, g);
  for (const g of TALLY_PRIMARY_GROUPS) {
    if (!groupMap.has(g.id)) groupMap.set(g.id, g);
  }

  const items: TrialBalanceItem[] = [];

  let totalOpDr = 0;
  let totalOpCr = 0;
  let totalPrDr = 0;
  let totalPrCr = 0;
  let totalClDr = 0;
  let totalClCr = 0;

  for (const l of ledgers) {
    const stmt = computeLedgerStatement(l, vouchers, fromDate, toDate);
    const grp = groupMap.get(l.groupId) || {
      id: l.groupId,
      name: l.groupName || 'Current Assets',
      nature: l.nature || 'Asset',
    };

    const opBal = fromDate ? stmt.openingBalance : (l.openingBalance || 0);
    const opType = fromDate ? stmt.openingType : (l.openingType || 'Dr');
    const opDr = opType === 'Dr' ? opBal : 0;
    const opCr = opType === 'Cr' ? opBal : 0;
    const clDr = stmt.closingType === 'Dr' ? stmt.closingBalance : 0;
    const clCr = stmt.closingType === 'Cr' ? stmt.closingBalance : 0;

    totalOpDr += Math.round(opDr * 100);
    totalOpCr += Math.round(opCr * 100);
    totalPrDr += Math.round(stmt.totalDebit * 100);
    totalPrCr += Math.round(stmt.totalCredit * 100);
    totalClDr += Math.round(clDr * 100);
    totalClCr += Math.round(clCr * 100);

    items.push({
      ledgerId: l.id,
      ledgerName: l.name,
      groupId: grp.id,
      groupName: grp.name,
      nature: grp.nature,
      openingDebit: opDr,
      openingCredit: opCr,
      periodDebit: stmt.totalDebit,
      periodCredit: stmt.totalCredit,
      closingDebit: clDr,
      closingCredit: clCr,
    });
  }

  // Group items by group
  const groupSummaryMap = new Map<string, TrialBalanceGroupSummary>();
  for (const item of items) {
    let gSummary = groupSummaryMap.get(item.groupId);
    if (!gSummary) {
      const g = groupMap.get(item.groupId) || {
        id: item.groupId,
        name: item.groupName,
        nature: item.nature,
      };
      gSummary = {
        group: g,
        closingDebit: 0,
        closingCredit: 0,
        items: [],
      };
      groupSummaryMap.set(item.groupId, gSummary);
    }
    gSummary.items.push(item);
    gSummary.closingDebit = round2(gSummary.closingDebit + item.closingDebit);
    gSummary.closingCredit = round2(gSummary.closingCredit + item.closingCredit);
  }

  const diff = Math.abs(totalClDr - totalClCr) / 100;

  return {
    fromDate,
    toDate,
    groups: Array.from(groupSummaryMap.values()).sort((a, b) => a.group.name.localeCompare(b.group.name)),
    totalOpeningDebit: totalOpDr / 100,
    totalOpeningCredit: totalOpCr / 100,
    totalPeriodDebit: totalPrDr / 100,
    totalPeriodCredit: totalPrCr / 100,
    totalClosingDebit: totalClDr / 100,
    totalClosingCredit: totalClCr / 100,
    isBalanced: diff === 0,
    difference: diff,
  };
}

/**
 * Generate next auto-incrementing voucher number
 */
export function generateNextVoucherNumber(vouchers: Voucher[], type: TallyVoucherType): string {
  const prefixMap: Record<TallyVoucherType, string> = {
    Payment: 'PMT',
    Receipt: 'RCPT',
    Contra: 'CNTR',
    Journal: 'JRNL',
    Sales: 'SALES',
    Purchase: 'PURC',
    'Debit Note': 'DBNT',
    'Credit Note': 'CRNT',
  };

  const defaultPrefix = prefixMap[type] || 'VCH';
  const matching = vouchers.filter((v) => v.voucherType === type);

  if (matching.length === 0) {
    return `${defaultPrefix}-001`;
  }

  // Extract trailing numeric sequence (\d+)$
  let maxSeq = 0;
  let detectedPrefix = `${defaultPrefix}-`;
  let padLength = 3;

  for (const v of matching) {
    const match = v.voucherNumber.match(/^(.*?)(\d+)$/);
    if (match) {
      const parsed = parseInt(match[2], 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
        detectedPrefix = match[1];
        padLength = Math.max(match[2].length, 3);
      }
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(padLength, '0');
  return `${detectedPrefix}${nextSeq}`;
}

// ============================================================================
// INVENTORY & STOCK VALUATION
// ============================================================================

export interface StockSummaryItem {
  item: StockItem;
  openingQty: number;
  openingRate: number;
  openingValue: number;
  inwardQty: number;
  inwardValue: number;
  outwardQty: number;
  outwardValue: number;
  closingQty: number;
  avgRate: number;
  closingValue: number;
  godownAllocations: {
    godownId: string;
    godownName: string;
    qty: number;
  }[];
}

export interface StockSummaryReport {
  items: StockSummaryItem[];
  totalOpeningValue: number;
  totalInwardValue: number;
  totalOutwardValue: number;
  totalClosingValue: number;
}

export function computeStockSummary(
  stockItems: StockItem[],
  vouchers: Voucher[],
  godowns: Godown[] = [],
  filterGodownId?: string,
  fromDate?: string,
  toDate?: string
): StockSummaryReport {
  const godownMap = new Map<string, string>();
  for (const g of godowns) godownMap.set(g.id, g.name);

  const items: StockSummaryItem[] = [];
  let totalOpeningVal = 0;
  let totalInwardVal = 0;
  let totalOutwardVal = 0;
  let totalClosingVal = 0;

  for (const item of stockItems) {
    if (filterGodownId && item.godownId && item.godownId !== filterGodownId) {
      // Continue but check if item has movements in this godown
    }

    const baseOpQty = Number(item.openingQty || 0);
    const baseOpRate = Number(item.openingRate || 0);
    const baseOpVal = item.openingValue !== undefined ? Number(item.openingValue) : round2(baseOpQty * baseOpRate);

    let priorInQty = 0;
    let priorInVal = 0;
    let priorOutQty = 0;
    let priorOutVal = 0;

    let inQty = 0;
    let inVal = 0;
    let outQty = 0;
    let outVal = 0;

    // Godown distribution tracker
    const godownDist = new Map<string, number>();
    if (item.godownId) {
      godownDist.set(item.godownId, baseOpQty);
    }

    for (const v of vouchers) {
      if (!v.itemLines || v.itemLines.length === 0) continue;

      const isBeforeFrom = fromDate && v.date < fromDate;
      const isAfterTo = toDate && v.date > toDate;

      for (const line of v.itemLines) {
        if (line.itemId === item.id) {
          const lineQty = Number(line.quantity || 0);
          const lineAmt = Number(line.amount || 0);
          const gId = line.godownId || item.godownId || 'g-main';

          if (v.voucherType === 'Purchase' || v.voucherType === 'Credit Note') {
            if (isBeforeFrom) {
              priorInQty += lineQty;
              priorInVal += lineAmt;
            } else if (!isAfterTo) {
              inQty += lineQty;
              inVal += lineAmt;
            }
            if (!isAfterTo) {
              const currentGQty = godownDist.get(gId) || 0;
              godownDist.set(gId, currentGQty + lineQty);
            }
          } else if (v.voucherType === 'Sales' || v.voucherType === 'Debit Note') {
            if (isBeforeFrom) {
              priorOutQty += lineQty;
              priorOutVal += lineAmt;
            } else if (!isAfterTo) {
              outQty += lineQty;
              outVal += lineAmt;
            }
            if (!isAfterTo) {
              const currentGQty = godownDist.get(gId) || 0;
              godownDist.set(gId, currentGQty - lineQty);
            }
          }
        }
      }
    }

    const opQty = fromDate ? baseOpQty + priorInQty - priorOutQty : baseOpQty;
    const priorAvailQty = baseOpQty + priorInQty;
    const priorAvailVal = baseOpVal + priorInVal;
    const priorAvgRate = priorAvailQty > 0 ? round2(priorAvailVal / priorAvailQty) : baseOpRate;
    const opVal = fromDate ? round2(Math.max(0, opQty) * priorAvgRate) : baseOpVal;
    const opRate = opQty > 0 ? priorAvgRate : baseOpRate;

    const closingQty = opQty + inQty - outQty;

    // Weighted Average Valuation: (Opening Value + Inward Value) / (Opening Qty + Inward Qty)
    const totalAvailQty = opQty + inQty;
    const totalAvailVal = opVal + inVal;
    const avgRate = totalAvailQty > 0 ? round2(totalAvailVal / totalAvailQty) : opRate;
    const closingVal = round2(Math.max(0, closingQty) * avgRate);

    totalOpeningVal += opVal;
    totalInwardVal += inVal;
    totalOutwardVal += outVal;
    totalClosingVal += closingVal;

    const allocations = Array.from(godownDist.entries()).map(([gId, q]) => ({
      godownId: gId,
      godownName: godownMap.get(gId) || (gId === 'g-main' ? 'Main Godown' : 'Godown'),
      qty: q,
    }));

    // If filtered by godown, check matching
    if (filterGodownId) {
      const matchAlloc = allocations.find((a) => a.godownId === filterGodownId);
      if (!matchAlloc && item.godownId !== filterGodownId) {
        continue;
      }
    }

    items.push({
      item,
      openingQty: opQty,
      openingRate: opRate,
      openingValue: opVal,
      inwardQty: inQty,
      inwardValue: inVal,
      outwardQty: outQty,
      outwardValue: outVal,
      closingQty,
      avgRate,
      closingValue: closingVal,
      godownAllocations: allocations,
    });
  }

  return {
    items,
    totalOpeningValue: round2(totalOpeningVal),
    totalInwardValue: round2(totalInwardVal),
    totalOutwardValue: round2(totalOutwardVal),
    totalClosingValue: round2(totalClosingVal),
  };
}

// ============================================================================
// PROFIT & LOSS STATEMENT (TRADING + P&L)
// ============================================================================

export interface PnLLineItem {
  ledgerId: string;
  name: string;
  amount: number;
}

export interface ProfitAndLossReport {
  fromDate?: string;
  toDate?: string;

  // Trading Account
  openingStock: number;
  purchases: PnLLineItem[];
  totalPurchases: number;
  directExpenses: PnLLineItem[];
  totalDirectExpenses: number;
  totalTradingDebit: number;

  sales: PnLLineItem[];
  totalSales: number;
  directIncomes: PnLLineItem[];
  totalDirectIncomes: number;
  closingStock: number;
  totalTradingCredit: number;

  grossProfit: number;
  grossLoss: number;
  isGrossProfit: boolean;

  // Profit & Loss Account
  indirectExpenses: PnLLineItem[];
  totalIndirectExpenses: number;
  totalPnLDebit: number;

  indirectIncomes: PnLLineItem[];
  totalIndirectIncomes: number;
  totalPnLCredit: number;

  netProfit: number;
  netLoss: number;
  isNetProfit: boolean;
}

export function computeProfitAndLoss(
  ledgers: LedgerAccount[],
  vouchers: Voucher[],
  stockItems: StockItem[] = [],
  fromDate?: string,
  toDate?: string
): ProfitAndLossReport {
  // 1. Stock Valuation
  const stockSummary = computeStockSummary(stockItems, vouchers, undefined, undefined, fromDate, toDate);
  const openingStock = stockSummary.totalOpeningValue;
  const closingStock = stockSummary.totalClosingValue;

  const purchases: PnLLineItem[] = [];
  let totalPurchases = 0;

  const directExpenses: PnLLineItem[] = [];
  let totalDirectExpenses = 0;

  const sales: PnLLineItem[] = [];
  let totalSales = 0;

  const directIncomes: PnLLineItem[] = [];
  let totalDirectIncomes = 0;

  const indirectExpenses: PnLLineItem[] = [];
  let totalIndirectExpenses = 0;

  const indirectIncomes: PnLLineItem[] = [];
  let totalIndirectIncomes = 0;

  for (const l of ledgers) {
    const stmt = computeLedgerStatement(l, vouchers, fromDate, toDate);
    // When evaluating a specific period (fromDate defined), measure only activity during that period.
    // When evaluating without fromDate, closing balance reflects cumulative activity.
    const netDr = fromDate
      ? round2(stmt.totalDebit - stmt.totalCredit)
      : (stmt.closingType === 'Dr' ? stmt.closingBalance : -stmt.closingBalance);
    const netCr = fromDate
      ? round2(stmt.totalCredit - stmt.totalDebit)
      : (stmt.closingType === 'Cr' ? stmt.closingBalance : -stmt.closingBalance);

    if (l.groupId === 'purchase-accounts') {
      if (netDr !== 0) {
        purchases.push({ ledgerId: l.id, name: l.name, amount: netDr });
        totalPurchases += netDr;
      }
    } else if (l.groupId === 'direct-expenses') {
      if (netDr !== 0) {
        directExpenses.push({ ledgerId: l.id, name: l.name, amount: netDr });
        totalDirectExpenses += netDr;
      }
    } else if (l.groupId === 'sales-accounts') {
      if (netCr !== 0) {
        sales.push({ ledgerId: l.id, name: l.name, amount: netCr });
        totalSales += netCr;
      }
    } else if (l.groupId === 'direct-income') {
      if (netCr !== 0) {
        directIncomes.push({ ledgerId: l.id, name: l.name, amount: netCr });
        totalDirectIncomes += netCr;
      }
    } else if (l.groupId === 'indirect-expenses') {
      if (netDr !== 0) {
        indirectExpenses.push({ ledgerId: l.id, name: l.name, amount: netDr });
        totalIndirectExpenses += netDr;
      }
    } else if (l.groupId === 'indirect-income') {
      if (netCr !== 0) {
        indirectIncomes.push({ ledgerId: l.id, name: l.name, amount: netCr });
        totalIndirectIncomes += netCr;
      }
    }
  }

  // Trading Account calculations
  const totalTradingDebit = round2(openingStock + totalPurchases + totalDirectExpenses);
  const totalTradingCredit = round2(totalSales + totalDirectIncomes + closingStock);
  const tradingDiff = round2(totalTradingCredit - totalTradingDebit);

  const isGrossProfit = tradingDiff >= 0;
  const grossProfit = isGrossProfit ? tradingDiff : 0;
  const grossLoss = !isGrossProfit ? Math.abs(tradingDiff) : 0;

  // P&L Account calculations
  const totalPnLCredit = round2((isGrossProfit ? grossProfit : 0) + totalIndirectIncomes);
  const totalPnLDebit = round2((!isGrossProfit ? grossLoss : 0) + totalIndirectExpenses);
  const pnlDiff = round2(totalPnLCredit - totalPnLDebit);

  const isNetProfit = pnlDiff >= 0;
  const netProfit = isNetProfit ? pnlDiff : 0;
  const netLoss = !isNetProfit ? Math.abs(pnlDiff) : 0;

  return {
    fromDate,
    toDate,
    openingStock: round2(openingStock),
    purchases,
    totalPurchases: round2(totalPurchases),
    directExpenses,
    totalDirectExpenses: round2(totalDirectExpenses),
    totalTradingDebit,

    sales,
    totalSales: round2(totalSales),
    directIncomes,
    totalDirectIncomes: round2(totalDirectIncomes),
    closingStock: round2(closingStock),
    totalTradingCredit,

    grossProfit,
    grossLoss,
    isGrossProfit,

    indirectExpenses,
    totalIndirectExpenses: round2(totalIndirectExpenses),
    totalPnLDebit,

    indirectIncomes,
    totalIndirectIncomes: round2(totalIndirectIncomes),
    totalPnLCredit,

    netProfit,
    netLoss,
    isNetProfit,
  };
}

// ============================================================================
// BALANCE SHEET
// ============================================================================

export interface BalanceSheetSectionItem {
  id: string;
  name: string;
  amount: number;
  subtext?: string;
}

export interface BalanceSheetSection {
  title: string;
  total: number;
  items: BalanceSheetSectionItem[];
}

export interface BalanceSheetReport {
  asOfDate: string;

  // Liabilities
  capitalAccounts: BalanceSheetSection;
  reservesAndSurplus: BalanceSheetSection;
  netProfitOrLoss: number;
  loansLiability: BalanceSheetSection;
  currentLiabilities: BalanceSheetSection;
  totalLiabilities: number;

  // Assets
  fixedAssets: BalanceSheetSection;
  investments: BalanceSheetSection;
  currentAssets: BalanceSheetSection;
  closingStock: number;
  totalAssets: number;

  difference: number;
  isBalanced: boolean;
}

export function computeBalanceSheet(
  ledgers: LedgerAccount[],
  vouchers: Voucher[],
  stockItems: StockItem[] = [],
  fromDate?: string,
  toDate?: string
): BalanceSheetReport {
  const pnl = computeProfitAndLoss(ledgers, vouchers, stockItems, fromDate, toDate);
  const netProfitOrLoss = pnl.isNetProfit ? pnl.netProfit : -pnl.netLoss;
  const closingStock = pnl.closingStock;

  // Liabilities Sections
  const capitalItems: BalanceSheetSectionItem[] = [];
  let capitalTotal = 0;

  const reservesItems: BalanceSheetSectionItem[] = [];
  let reservesTotal = 0;

  const loanItems: BalanceSheetSectionItem[] = [];
  let loansTotal = 0;

  const currLiabItems: BalanceSheetSectionItem[] = [];
  let currLiabTotal = 0;

  // Assets Sections
  const fixedAssetItems: BalanceSheetSectionItem[] = [];
  let fixedAssetsTotal = 0;

  const investItems: BalanceSheetSectionItem[] = [];
  let investTotal = 0;

  const currAssetItems: BalanceSheetSectionItem[] = [];
  let currAssetsTotal = 0;

  // Duties & Taxes Netting (Output vs Input)
  let netDutiesTaxes = 0;

  for (const l of ledgers) {
    // Exclude stock-in-hand ledger because inventory valuation dynamically provides closing stock!
    if (l.groupId === 'stock-in-hand') {
      continue;
    }
    // Exclude system P&L ledger since current year Net Profit is added from PnL
    if (l.id === 'led-pnl' || l.name === 'Profit & Loss A/c') {
      continue;
    }

    const stmt = computeLedgerStatement(l, vouchers, fromDate, toDate);
    const bal = stmt.closingBalance;
    if (bal === 0) continue;

    const isCr = stmt.closingType === 'Cr';
    const signedCr = isCr ? bal : -bal;
    const isDr = stmt.closingType === 'Dr';
    const signedDr = isDr ? bal : -bal;

    // Check Groups
    if (l.groupId === 'capital-account') {
      capitalItems.push({ id: l.id, name: l.name, amount: signedCr });
      capitalTotal += signedCr;
    } else if (l.groupId === 'reserves-surplus') {
      reservesItems.push({ id: l.id, name: l.name, amount: signedCr });
      reservesTotal += signedCr;
    } else if (
      l.groupId === 'loans-liab' ||
      l.groupId === 'bank-od-occ' ||
      l.groupId === 'secured-loans' ||
      l.groupId === 'unsecured-loans'
    ) {
      loanItems.push({ id: l.id, name: l.name, amount: signedCr });
      loansTotal += signedCr;
    } else if (l.groupId === 'sundry-creditors') {
      currLiabItems.push({ id: l.id, name: l.name, amount: signedCr, subtext: 'Sundry Creditor' });
      currLiabTotal += signedCr;
    } else if (l.groupId === 'duties-taxes') {
      // Accumulate net tax balance: Cr is liability, Dr is asset
      netDutiesTaxes += signedCr;
    } else if (l.groupId === 'curr-liabilities' || l.groupId === 'provisions' || l.groupId === 'suspense-acc') {
      currLiabItems.push({ id: l.id, name: l.name, amount: signedCr });
      currLiabTotal += signedCr;
    } else if (l.groupId === 'fixed-assets') {
      fixedAssetItems.push({ id: l.id, name: l.name, amount: signedDr });
      fixedAssetsTotal += signedDr;
    } else if (l.groupId === 'investments') {
      investItems.push({ id: l.id, name: l.name, amount: signedDr });
      investTotal += signedDr;
    } else if (l.groupId === 'sundry-debtors') {
      currAssetItems.push({ id: l.id, name: l.name, amount: signedDr, subtext: 'Sundry Debtor' });
      currAssetsTotal += signedDr;
    } else if (l.groupId === 'cash-in-hand') {
      currAssetItems.push({ id: l.id, name: l.name, amount: signedDr, subtext: 'Cash' });
      currAssetsTotal += signedDr;
    } else if (l.groupId === 'bank-accounts') {
      currAssetItems.push({ id: l.id, name: l.name, amount: signedDr, subtext: 'Bank' });
      currAssetsTotal += signedDr;
    } else if (l.groupId === 'curr-assets' || l.groupId === 'deposits-asset' || l.groupId === 'loans-adv-asset') {
      currAssetItems.push({ id: l.id, name: l.name, amount: signedDr });
      currAssetsTotal += signedDr;
    }
  }

  // Handle net duties & taxes
  if (round2(netDutiesTaxes) > 0) {
    currLiabItems.push({
      id: 'duties-taxes-net',
      name: 'Duties & Taxes (Net Payable)',
      amount: round2(netDutiesTaxes),
    });
    currLiabTotal += round2(netDutiesTaxes);
  } else if (round2(netDutiesTaxes) < 0) {
    currAssetItems.push({
      id: 'duties-taxes-itc',
      name: 'Duties & Taxes (Input Tax Credit)',
      amount: round2(Math.abs(netDutiesTaxes)),
    });
    currAssetsTotal += round2(Math.abs(netDutiesTaxes));
  }

  // Add Closing Stock to Current Assets
  if (closingStock > 0) {
    currAssetItems.push({
      id: 'closing-stock-asset',
      name: 'Stock-in-Hand (Closing Stock)',
      amount: round2(closingStock),
      subtext: 'Inventory Valuation',
    });
    currAssetsTotal += round2(closingStock);
  }

  // Add Net Profit to Reserves & Surplus
  reservesTotal += netProfitOrLoss;

  const totalLiabilities = round2(capitalTotal + reservesTotal + loansTotal + currLiabTotal);
  const totalAssets = round2(fixedAssetsTotal + investTotal + currAssetsTotal);
  const diff = round2(Math.abs(totalAssets - totalLiabilities));

  return {
    asOfDate: toDate || todayISO(),
    capitalAccounts: { title: 'Capital Account', total: round2(capitalTotal), items: capitalItems },
    reservesAndSurplus: { title: 'Reserves & Surplus', total: round2(reservesTotal), items: reservesItems },
    netProfitOrLoss: round2(netProfitOrLoss),
    loansLiability: { title: 'Loans (Liability)', total: round2(loansTotal), items: loanItems },
    currentLiabilities: { title: 'Current Liabilities', total: round2(currLiabTotal), items: currLiabItems },
    totalLiabilities,

    fixedAssets: { title: 'Fixed Assets', total: round2(fixedAssetsTotal), items: fixedAssetItems },
    investments: { title: 'Investments', total: round2(investTotal), items: investItems },
    currentAssets: { title: 'Current Assets', total: round2(currAssetsTotal), items: currAssetItems },
    closingStock: round2(closingStock),
    totalAssets,

    difference: diff,
    isBalanced: diff < 0.05,
  };
}

// ============================================================================
// GST SUMMARY (GSTR-1 & GSTR-3B ESTIMATE)
// ============================================================================

export interface GstTaxBreakdown {
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
}

export interface GstSummaryReport {
  fromDate?: string;
  toDate?: string;
  outwardSupplies: GstTaxBreakdown;
  inwardSupplies: GstTaxBreakdown;
  netPayable: {
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
  };
  b2bSalesCount: number;
  b2bPurchaseCount: number;
}

export function computeGstSummary(
  vouchers: Voucher[],
  fromDate?: string,
  toDate?: string
): GstSummaryReport {
  let outTaxable = 0;
  let outCgst = 0;
  let outSgst = 0;
  let outIgst = 0;
  let salesCount = 0;

  let inTaxable = 0;
  let inCgst = 0;
  let inSgst = 0;
  let inIgst = 0;
  let purcCount = 0;

  for (const v of vouchers) {
    if (fromDate && v.date < fromDate) continue;
    if (toDate && v.date > toDate) continue;

    if (v.voucherType === 'Sales') {
      salesCount++;
      if (v.itemLines && v.itemLines.length > 0) {
        for (const line of v.itemLines) {
          outTaxable += Number(line.amount || 0);
          outCgst += Number(line.cgst || 0);
          outSgst += Number(line.sgst || 0);
          outIgst += Number(line.igst || 0);
        }
      } else {
        // Fallback to ledger lines
        for (const line of v.lines) {
          const lName = line.ledgerName.toLowerCase();
          if (line.type === 'Cr') {
            if (lName.includes('cgst')) outCgst += line.amount;
            else if (lName.includes('sgst')) outSgst += line.amount;
            else if (lName.includes('igst')) outIgst += line.amount;
            else if (lName.includes('sales')) outTaxable += line.amount;
          }
        }
      }
    } else if (v.voucherType === 'Credit Note') {
      // Credit Note reduces outward supplies & output liability
      if (v.itemLines && v.itemLines.length > 0) {
        for (const line of v.itemLines) {
          outTaxable -= Number(line.amount || 0);
          outCgst -= Number(line.cgst || 0);
          outSgst -= Number(line.sgst || 0);
          outIgst -= Number(line.igst || 0);
        }
      } else {
        for (const line of v.lines) {
          const lName = line.ledgerName.toLowerCase();
          if (line.type === 'Dr') {
            if (lName.includes('cgst')) outCgst -= line.amount;
            else if (lName.includes('sgst')) outSgst -= line.amount;
            else if (lName.includes('igst')) outIgst -= line.amount;
            else if (lName.includes('sales') || lName.includes('credit')) outTaxable -= line.amount;
          }
        }
      }
    } else if (v.voucherType === 'Purchase') {
      purcCount++;
      if (v.itemLines && v.itemLines.length > 0) {
        for (const line of v.itemLines) {
          inTaxable += Number(line.amount || 0);
          inCgst += Number(line.cgst || 0);
          inSgst += Number(line.sgst || 0);
          inIgst += Number(line.igst || 0);
        }
      } else {
        // Fallback to ledger lines
        for (const line of v.lines) {
          const lName = line.ledgerName.toLowerCase();
          if (line.type === 'Dr') {
            if (lName.includes('cgst')) inCgst += line.amount;
            else if (lName.includes('sgst')) inSgst += line.amount;
            else if (lName.includes('igst')) inIgst += line.amount;
            else if (lName.includes('purchase')) inTaxable += line.amount;
          }
        }
      }
    } else if (v.voucherType === 'Debit Note') {
      // Debit Note reduces inward supplies & input tax credit
      if (v.itemLines && v.itemLines.length > 0) {
        for (const line of v.itemLines) {
          inTaxable -= Number(line.amount || 0);
          inCgst -= Number(line.cgst || 0);
          inSgst -= Number(line.sgst || 0);
          inIgst -= Number(line.igst || 0);
        }
      } else {
        for (const line of v.lines) {
          const lName = line.ledgerName.toLowerCase();
          if (line.type === 'Cr') {
            if (lName.includes('cgst')) inCgst -= line.amount;
            else if (lName.includes('sgst')) inSgst -= line.amount;
            else if (lName.includes('igst')) inIgst -= line.amount;
            else if (lName.includes('purchase') || lName.includes('debit')) inTaxable -= line.amount;
          }
        }
      }
    }
  }

  const netCgst = round2(outCgst - inCgst);
  const netSgst = round2(outSgst - inSgst);
  const netIgst = round2(outIgst - inIgst);
  const netTotal = round2((outCgst + outSgst + outIgst) - (inCgst + inSgst + inIgst));

  return {
    fromDate,
    toDate,
    outwardSupplies: {
      taxableValue: round2(outTaxable),
      cgst: round2(outCgst),
      sgst: round2(outSgst),
      igst: round2(outIgst),
      totalTax: round2(outCgst + outSgst + outIgst),
    },
    inwardSupplies: {
      taxableValue: round2(inTaxable),
      cgst: round2(inCgst),
      sgst: round2(inSgst),
      igst: round2(inIgst),
      totalTax: round2(inCgst + inSgst + inIgst),
    },
    netPayable: {
      cgst: netCgst,
      sgst: netSgst,
      igst: netIgst,
      total: netTotal,
    },
    b2bSalesCount: salesCount,
    b2bPurchaseCount: purcCount,
  };
}

// ============================================================================
// OUTSTANDING RECEIVABLES & PAYABLES WITH AGEING
// ============================================================================

export interface OutstandingPartyItem {
  ledgerId: string;
  partyName: string;
  gstin?: string;
  phone?: string;
  totalOutstanding: number;
  type: BalanceType;
  isAdvance?: boolean;
  aging: {
    days0_30: number;
    days31_60: number;
    days61_90: number;
    days90Plus: number;
  };
  latestVoucherDate?: string;
}

export interface OutstandingReport {
  type: 'Receivables' | 'Payables';
  totalOutstanding: number;
  total0_30: number;
  total31_60: number;
  total61_90: number;
  total90Plus: number;
  parties: OutstandingPartyItem[];
}

export function computeOutstandingAging(
  ledgers: LedgerAccount[],
  vouchers: Voucher[],
  type: 'Receivables' | 'Payables',
  asOfDate: string = todayISO()
): OutstandingReport {
  const targetGroupId = type === 'Receivables' ? 'sundry-debtors' : 'sundry-creditors';
  const expectedBalType: BalanceType = type === 'Receivables' ? 'Dr' : 'Cr';

  const relevantLedgers = ledgers.filter((l) => l.groupId === targetGroupId);
  const parties: OutstandingPartyItem[] = [];

  let grandTotal = 0;
  let grand0_30 = 0;
  let grand31_60 = 0;
  let grand61_90 = 0;
  let grand90Plus = 0;

  const asOfTime = new Date(asOfDate + 'T00:00:00').getTime();

  for (const l of relevantLedgers) {
    const stmt = computeLedgerStatement(l, vouchers);
    if (stmt.closingBalance === 0) continue;

    // Retain contrary balances as customer or vendor advances
    const isAdvance = stmt.closingType !== expectedBalType;
    const totalBal = stmt.closingBalance;
    grandTotal += isAdvance ? -totalBal : totalBal;

    // Allocate into aging brackets based on voucher dates
    let rem = totalBal;
    let b0_30 = 0;
    let b31_60 = 0;
    let b61_90 = 0;
    let b90Plus = 0;

    const voucherLineType = isAdvance
      ? (expectedBalType === 'Dr' ? 'Cr' : 'Dr')
      : expectedBalType;

    // Sort relevant vouchers descending (latest to oldest)
    const partyVouchers = vouchers
      .filter((v) => v.lines.some((line) => line.ledgerId === l.id && line.type === voucherLineType))
      .sort((a, b) => b.date.localeCompare(a.date));

    for (const v of partyVouchers) {
      if (rem <= 0) break;
      const vLine = v.lines.find((line) => line.ledgerId === l.id && line.type === voucherLineType);
      const lineAmt = vLine ? vLine.amount : 0;
      const alloc = Math.min(rem, lineAmt);

      const vTime = new Date(v.date + 'T00:00:00').getTime();
      const diffDays = Math.max(0, Math.floor((asOfTime - vTime) / (1000 * 60 * 60 * 24)));

      if (diffDays <= 30) b0_30 += alloc;
      else if (diffDays <= 60) b31_60 += alloc;
      else if (diffDays <= 90) b61_90 += alloc;
      else b90Plus += alloc;

      rem -= alloc;
    }

    // Any remaining balance falls into 90+ days (e.g. from opening balance)
    if (rem > 0) {
      b90Plus += rem;
    }

    if (!isAdvance) {
      grand0_30 += b0_30;
      grand31_60 += b31_60;
      grand61_90 += b61_90;
      grand90Plus += b90Plus;
    }

    parties.push({
      ledgerId: l.id,
      partyName: isAdvance ? `${l.name} (Advance)` : l.name,
      gstin: l.gstin,
      phone: l.phone,
      totalOutstanding: round2(totalBal),
      type: stmt.closingType,
      isAdvance,
      aging: {
        days0_30: round2(b0_30),
        days31_60: round2(b31_60),
        days61_90: round2(b61_90),
        days90Plus: round2(b90Plus),
      },
      latestVoucherDate: partyVouchers[0]?.date,
    });
  }

  return {
    type,
    totalOutstanding: round2(grandTotal),
    total0_30: round2(grand0_30),
    total31_60: round2(grand31_60),
    total61_90: round2(grand61_90),
    total90Plus: round2(grand90Plus),
    parties: parties.sort((a, b) => b.totalOutstanding - a.totalOutstanding),
  };
}

export const computeOutstandingBalances = computeOutstandingAging;
