import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { Transaction } from '@/types/transaction';
import {
  formatINR,
  formatDate,
  formatNumber,
} from '@/lib/calculations';
import { TypeBadge, Button } from './ui';

interface Props {
  transaction: Transaction;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function TransactionDetail({
  transaction,
  onBack,
  onEdit,
  onDelete,
}: Props) {
  const isTransfer = transaction.type === 'Payment Transfer';
  const isReceipt = transaction.type === 'Receipt';
  const rows: { label: string; value: string }[] = isTransfer
    ? [
        { label: 'Date', value: formatDate(transaction.date) },
        { label: 'Transfer Mode / Source', value: transaction.source || 'Cash' },
        { label: 'Creditor Party (Deducted)', value: transaction.partyName },
        { label: 'Debtor Party (Added)', value: transaction.transferPartyName || '—' },
        { label: 'Transfer Amount', value: formatINR(transaction.totalAmount) },
      ]
    : isReceipt
    ? [
        { label: 'Voucher No', value: transaction.transactionNo || '—' },
        { label: 'Date', value: formatDate(transaction.date) },
        { label: 'Party Name', value: transaction.partyName },
        { label: 'Receipt Amount', value: formatINR(transaction.totalAmount) },
        { label: 'Payment Mode / Source', value: transaction.source || 'Cash' },
        ...(transaction.referenceNo ? [{ label: 'Reference No', value: transaction.referenceNo }] : []),
      ]
    : [
        { label: 'Date', value: formatDate(transaction.date) },
        { label: 'Party Name', value: transaction.partyName },
        { label: 'Transaction Type', value: transaction.type },
        { label: 'Total Amount', value: formatINR(transaction.totalAmount) },
      ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <TypeBadge type={transaction.type} />
              <span className="text-sm text-gray-500">
                {formatDate(transaction.date)}
              </span>
            </div>
            <h1 className="mt-2 text-lg font-semibold text-gray-900">
              {isTransfer && transaction.transferPartyName
                ? `${transaction.partyName} → ${transaction.transferPartyName}`
                : transaction.partyName}
            </h1>
            <p className="text-sm text-gray-500">
              {isTransfer
                ? `Source: ${transaction.source || 'Cash'}`
                : isReceipt
                ? `Receipt Voucher · Source: ${transaction.source || 'Cash'}`
                : `${transaction.items.length} item${transaction.items.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-xl font-bold text-gray-900">
              {formatINR(transaction.totalAmount)}
            </p>
          </div>
        </div>

        <dl className="mt-5 divide-y divide-gray-100 border-t border-gray-100">
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between py-2.5"
            >
              <dt className="text-sm text-gray-500">{r.label}</dt>
              <dd className="text-sm font-medium text-gray-900">{r.value}</dd>
            </div>
          ))}
        </dl>

        {isTransfer ? (
          <div className="mt-4 rounded-xl border border-purple-200 bg-purple-50/50 p-4">
            <h3 className="text-xs font-semibold text-purple-900 uppercase tracking-wide">
              Payment Transfer Breakdown
            </h3>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-white p-3 border border-purple-100">
                <span className="text-xs text-rose-600 font-medium">Creditor Party (Amount Deducted -)</span>
                <p className="mt-0.5 text-base font-semibold text-gray-900">{transaction.partyName}</p>
                <p className="text-xs text-rose-600 font-semibold mt-1">-{formatINR(transaction.totalAmount)}</p>
              </div>
              <div className="rounded-lg bg-white p-3 border border-purple-100">
                <span className="text-xs text-emerald-600 font-medium">Debtor Party (Amount Added +)</span>
                <p className="mt-0.5 text-base font-semibold text-gray-900">{transaction.transferPartyName || '—'}</p>
                <p className="text-xs text-emerald-600 font-semibold mt-1">+{formatINR(transaction.totalAmount)}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-purple-700">
              Source Account / Mode: <span className="font-semibold">{transaction.source || 'Cash'}</span>
            </p>
          </div>
        ) : isReceipt ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <h3 className="text-xs font-semibold text-emerald-900 uppercase tracking-wide">
              Receipt Voucher Details
            </h3>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-white p-3 border border-emerald-100">
                <span className="text-xs text-gray-500 font-medium">Party (Debtor Credited)</span>
                <p className="mt-0.5 text-base font-semibold text-gray-900">{transaction.partyName}</p>
                <p className="text-xs text-emerald-600 font-medium mt-1">
                  Outstanding balance reduced by {formatINR(transaction.totalAmount)}
                </p>
              </div>
              <div className="rounded-lg bg-white p-3 border border-emerald-100">
                <span className="text-xs text-gray-500 font-medium">Receipt Amount</span>
                <p className="mt-0.5 text-xl font-bold text-emerald-700">{formatINR(transaction.totalAmount)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Source: <span className="font-semibold text-gray-700">{transaction.source || 'Cash'}</span>
                  {transaction.referenceNo ? ` · Ref: ${transaction.referenceNo}` : ''}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-gray-100">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">
              <span>Item</span>
              <span>Qty</span>
              <span>Rate</span>
              <span>Amount</span>
            </div>
            {transaction.items.map((item, index) => (
              <div
                key={item.id ?? index}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2 text-sm text-gray-700"
              >
                <span className="min-w-0 truncate">
                  {item.itemName} <span className="text-xs text-gray-400">{item.unit}</span>
                </span>
                <span>{formatNumber(item.quantity)}</span>
                <span>{formatINR(item.ratePerUnit)}</span>
                <span className="font-medium">{formatINR(item.totalAmount)}</span>
              </div>
            ))}
          </div>
        )}

        {transaction.narration && (
          <div className="mt-4 rounded-lg bg-gray-50 p-3">
            <p className="text-xs font-medium text-gray-500">Narration / Notes</p>
            <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
              {transaction.narration}
            </p>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <Button variant="secondary" onClick={onEdit} className="flex-1">
            <Pencil size={16} />
            Edit
          </Button>
          <Button variant="danger" onClick={onDelete} className="flex-1">
            <Trash2 size={16} />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
