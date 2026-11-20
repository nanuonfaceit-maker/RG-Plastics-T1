import { TransactionType } from '@/types/transaction';

export function TypeBadge({ type }: { type: TransactionType }) {
  const styles: Record<TransactionType, string> = {
    'Sale': 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
    'Purchase': 'bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-200',
    'Payment': 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
    'Receipt': 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200',
    'Stock Transfer': 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
    'Payment Transfer': 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-200',
  };
  const cls = styles[type] || 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-200';
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>
      {type}
    </span>
  );
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
    secondary:
      'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 active:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
    ghost: 'text-gray-600 hover:bg-gray-100 active:bg-gray-200',
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

import { forwardRef } from 'react';

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    error?: string;
  }
>(function Input({ label, error, className = '', ...props }, ref) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-sm font-medium text-gray-700">
          {label}
        </span>
      )}
      <input
        ref={ref}
        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
          error ? 'border-red-400' : 'border-gray-300'
        } ${className}`}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
});

export function Textarea({
  label,
  error,
  className = '',
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
}) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-sm font-medium text-gray-700">
          {label}
        </span>
      )}
      <textarea
        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
          error ? 'border-red-400' : 'border-gray-300'
        } ${className}`}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function Select({
  label,
  error,
  className = '',
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
}) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-sm font-medium text-gray-700">
          {label}
        </span>
      )}
      <select
        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
          error ? 'border-red-400' : 'border-gray-300'
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-gray-900/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="px-5 py-4 text-sm text-gray-600">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  message,
}: {
  title: string;
  message?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
      <p className="text-sm font-medium text-gray-700">{title}</p>
      {message && <p className="mt-1 text-xs text-gray-500">{message}</p>}
    </div>
  );
}

export function SuspenseStatusBadge({
  status,
}: {
  status: 'unclaimed' | 'partially_claimed' | 'fully_claimed';
}) {
  const styles = {
    unclaimed: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
    partially_claimed: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
    fully_claimed: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  };
  const labels = {
    unclaimed: 'Unclaimed',
    partially_claimed: 'Partially Claimed',
    fully_claimed: 'Fully Claimed',
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
