-- ==============================================================================
-- Migration: 20261020_suspense_account.sql
-- 1. Fix parties_party_type_check constraint to allow debtor, creditor, suspense, expense, transfer
-- 2. Create suspense_entries and suspense_claims tables
-- 3. Configure RLS and permissions for authenticated users
-- ==============================================================================

-- 1. Fix parties and transactions check constraints & ensure opening_balance column exists
ALTER TABLE public.parties DROP CONSTRAINT IF EXISTS parties_party_type_check;
ALTER TABLE public.parties ADD CONSTRAINT parties_party_type_check 
  CHECK (party_type IS NULL OR party_type IN ('customer', 'supplier', 'both', 'debtor', 'creditor', 'suspense', 'expense', 'transfer'));

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_transaction_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_transaction_type_check 
  CHECK (transaction_type IN ('sale', 'purchase', 'payment', 'receipt', 'stock_transfer', 'payment_transfer'));

ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS investment numeric DEFAULT 0;
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS initial_loss numeric DEFAULT 0;
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS opening_balance numeric DEFAULT 0;

-- 2. Create suspense_entries table
CREATE TABLE IF NOT EXISTS public.suspense_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_no text NOT NULL UNIQUE DEFAULT ('SUS-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6))),
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(15, 2) NOT NULL CHECK (amount > 0),
  narration text NOT NULL DEFAULT '',
  reference_no text,
  status text NOT NULL DEFAULT 'unclaimed' CHECK (status IN ('unclaimed', 'partially_claimed', 'fully_claimed')),
  claimed_amount numeric(15, 2) NOT NULL DEFAULT 0.00 CHECK (claimed_amount >= 0),
  available_amount numeric(15, 2) NOT NULL DEFAULT 0.00 CHECK (available_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- 3. Create suspense_claims table
CREATE TABLE IF NOT EXISTS public.suspense_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_no text NOT NULL UNIQUE DEFAULT ('CLM-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6))),
  suspense_entry_id uuid NOT NULL REFERENCES public.suspense_entries(id) ON DELETE CASCADE,
  party_id uuid NOT NULL REFERENCES public.parties(id) ON DELETE RESTRICT,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  claim_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(15, 2) NOT NULL CHECK (amount > 0),
  narration text,
  reference_no text,
  is_reversed boolean NOT NULL DEFAULT false,
  reversal_reason text,
  reversed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- 4. Indices
CREATE INDEX IF NOT EXISTS idx_suspense_entries_date ON public.suspense_entries (entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_suspense_entries_status ON public.suspense_entries (status);
CREATE INDEX IF NOT EXISTS idx_suspense_claims_entry_id ON public.suspense_claims (suspense_entry_id);
CREATE INDEX IF NOT EXISTS idx_suspense_claims_party_id ON public.suspense_claims (party_id);
CREATE INDEX IF NOT EXISTS idx_suspense_claims_date ON public.suspense_claims (claim_date DESC);

-- 5. Enable RLS
ALTER TABLE public.suspense_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suspense_claims ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
DROP POLICY IF EXISTS Authenticated users can manage suspense_entries ON public.suspense_entries;
CREATE POLICY Authenticated users can manage suspense_entries
  ON public.suspense_entries
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS Authenticated users can manage suspense_claims ON public.suspense_claims;
CREATE POLICY Authenticated users can manage suspense_claims
  ON public.suspense_claims
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 7. Grant access to authenticated and service_role
GRANT ALL ON TABLE public.suspense_entries TO authenticated;
GRANT ALL ON TABLE public.suspense_claims TO authenticated;
GRANT ALL ON TABLE public.suspense_entries TO service_role;
GRANT ALL ON TABLE public.suspense_claims TO service_role;

-- 8. Delete or soft-delete party RPC
create or replace function public.delete_party(
  p_party_id uuid,
  p_delete_transactions boolean default false
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.rg_require_transaction_role();

  if p_delete_transactions then
    -- delete transaction items for all transactions of this party
    delete from public.transaction_items
    where transaction_id in (
      select id from public.transactions
      where party_id = p_party_id or narration like '%|id:' || p_party_id::text || '%'
    );

    -- delete the transactions
    delete from public.transactions
    where party_id = p_party_id or narration like '%|id:' || p_party_id::text || '%';
  end if;

  -- Try hard delete
  begin
    delete from public.parties where id = p_party_id;
  exception when foreign_key_violation then
    update public.parties set is_active = false, updated_at = now() where id = p_party_id;
  end;
end;
$$;

revoke all on function public.delete_party(uuid, boolean) from public;
grant execute on function public.delete_party(uuid, boolean) to authenticated;

