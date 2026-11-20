import React, { useState } from 'react';
import { Modal, Button, Input, Textarea } from './ui';
import { todayISO } from '@/lib/calculations';
import { AlertCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { date: string; amount: number; narration: string; referenceNo?: string }) => Promise<void>;
}

export function SuspenseEntryModal({ open, onClose, onSubmit }: Props) {
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [narration, setNarration] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setDate(todayISO());
    setAmount('');
    setReferenceNo('');
    setNarration('');
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }
    if (!narration.trim()) {
      setError('Please provide a narration or note describing this unidentified payment.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        date,
        amount: numAmount,
        narration: narration.trim(),
        referenceNo: referenceNo.trim() || undefined,
      });
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record suspense entry.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!submitting) {
          resetForm();
          onClose();
        }
      }}
      title="Record Suspense Entry"
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              resetForm();
              onClose();
            }}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Recording...' : 'Record to Suspense'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-gray-500">
          Record money received or recorded when the identity of the actual party is unknown.
        </p>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Transaction Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <Input
            label="Amount (₹)"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            autoFocus
          />
        </div>

        <Input
          label="Reference No. (Optional)"
          type="text"
          placeholder="e.g. UTR / IMPS / Cheque number"
          value={referenceNo}
          onChange={(e) => setReferenceNo(e.target.value)}
        />

        <Textarea
          label="Narration / Notes"
          placeholder="e.g. Direct bank deposit received from unknown party"
          rows={3}
          value={narration}
          onChange={(e) => setNarration(e.target.value)}
          required
        />
      </form>
    </Modal>
  );
}
