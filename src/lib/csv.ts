import { Transaction } from '@/types/transaction';

const CSV_HEADERS = ['Date', 'Transaction No', 'Party Name', 'Transaction Type', 'Item Name', 'Unit', 'Quantity', 'Rate Per Unit', 'Line Amount', 'Transaction Total', 'Narration'];
export function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str = String(value);
  const isFormula = /^[=+\-@\t]/.test(str);
  if (isFormula) {
    str = `'${str}`;
  }
  return (isFormula || /[",\n\r]/.test(str)) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function transactionsToCSV(transactions: Transaction[]): string {
  const rows = transactions.flatMap((transaction) => {
    const partyDisplay =
      transaction.type === 'Payment Transfer' && transaction.transferPartyName
        ? `${transaction.partyName} (From Cr) → ${transaction.transferPartyName} (To Dr)`
        : transaction.partyName;

    if (transaction.type === 'Receipt') {
      const receiptItemName = transaction.itemName && transaction.itemName !== 'Receipt'
        ? transaction.itemName
        : (transaction.narration?.trim() || transaction.itemName || 'Receipt Voucher');

      return [
        [
          transaction.date,
          transaction.transactionNo ?? '',
          partyDisplay,
          transaction.type,
          receiptItemName,
          '',
          '—',
          '—',
          String(transaction.totalAmount),
          String(transaction.totalAmount),
          transaction.narration,
        ]
          .map((value) => escapeCSV(String(value)))
          .join(','),
      ];
    }

    const items = transaction.items.length
      ? transaction.items
      : [{ itemName: transaction.itemName, unit: '', quantity: transaction.quantity, ratePerUnit: transaction.ratePerUnit, totalAmount: transaction.totalAmount }];

    return items.map((item) =>
      [
        transaction.date,
        transaction.transactionNo ?? '',
        partyDisplay,
        transaction.type,
        item.itemName,
        item.unit,
        String(item.quantity),
        String(item.ratePerUnit),
        String(item.totalAmount),
        String(transaction.totalAmount),
        transaction.narration,
      ]
        .map((value) => escapeCSV(String(value)))
        .join(',')
    );
  });
  return [CSV_HEADERS.join(','), ...rows].join('\n');
}

export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); document.body.removeChild(anchor); URL.revokeObjectURL(url);
}
