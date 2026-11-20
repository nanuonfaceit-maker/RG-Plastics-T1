-- ==============================================================================
-- Migration: 20261020_opening_cash_and_receipt_rpcs.sql
-- 1. Add amount column to transactions
-- 2. Create opening_cash_settings (singleton) and opening_cash_history (audit) tables
-- 3. Implement rg_require_admin_role() security check
-- 4. Implement get_opening_hand_cash() and set_opening_hand_cash() RPCs
-- 5. Update create_party_transaction() and update_party_transaction() for itemless receipts
-- 6. Implement atomic claim_suspense_entry() and reverse_suspense_claim() RPCs
-- ==============================================================================

-- 1. Add amount column to transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS amount numeric(15, 2);

-- 2. Opening Cash Tables
CREATE TABLE IF NOT EXISTS public.opening_cash_settings (
  id text PRIMARY KEY DEFAULT 'current',
  amount numeric(15, 2) NOT NULL DEFAULT 0.00 CHECK (amount >= 0),
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Insert singleton default if not exists
INSERT INTO public.opening_cash_settings (id, amount, notes)
VALUES ('current', 0.00, 'Initial opening hand cash setting')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.opening_cash_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric(15, 2) NOT NULL CHECK (amount >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- RLS
ALTER TABLE public.opening_cash_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opening_cash_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read opening cash settings" ON public.opening_cash_settings;
CREATE POLICY "Authenticated users can read opening cash settings"
  ON public.opening_cash_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can read opening cash history" ON public.opening_cash_history;
CREATE POLICY "Authenticated users can read opening cash history"
  ON public.opening_cash_history FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.opening_cash_settings TO authenticated;
GRANT SELECT ON public.opening_cash_history TO authenticated;
GRANT ALL ON public.opening_cash_settings TO service_role;
GRANT ALL ON public.opening_cash_history TO service_role;

-- 3. Security check for administrators
CREATE OR REPLACE FUNCTION public.rg_require_admin_role()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized: Admin privileges required to manage opening cash settings';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.rg_require_admin_role() FROM public;

-- 4. Opening Cash RPCs
CREATE OR REPLACE FUNCTION public.get_opening_hand_cash()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount numeric;
BEGIN
  PERFORM public.rg_require_transaction_role();
  SELECT amount INTO v_amount FROM public.opening_cash_settings WHERE id = 'current';
  RETURN coalesce(v_amount, 0.00);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_opening_hand_cash(
  p_amount numeric,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_at timestamptz := now();
  v_history_id uuid := gen_random_uuid();
BEGIN
  PERFORM public.rg_require_admin_role();
  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'Opening hand cash must be a non-negative number';
  END IF;

  INSERT INTO public.opening_cash_settings (id, amount, notes, updated_at, updated_by)
  VALUES ('current', p_amount, p_notes, v_updated_at, auth.uid())
  ON CONFLICT (id) DO UPDATE
  SET amount = EXCLUDED.amount,
      notes = EXCLUDED.notes,
      updated_at = EXCLUDED.updated_at,
      updated_by = EXCLUDED.updated_by;

  INSERT INTO public.opening_cash_history (id, amount, notes, created_at, created_by)
  VALUES (v_history_id, p_amount, p_notes, v_updated_at, auth.uid());

  RETURN jsonb_build_object(
    'id', 'current',
    'amount', p_amount,
    'notes', p_notes,
    'updated_at', v_updated_at,
    'history_id', v_history_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_opening_hand_cash() FROM public;
GRANT EXECUTE ON FUNCTION public.get_opening_hand_cash() TO authenticated;
REVOKE ALL ON FUNCTION public.set_opening_hand_cash(numeric, text) FROM public;
GRANT EXECUTE ON FUNCTION public.set_opening_hand_cash(numeric, text) TO authenticated;

-- 5. Updated Transaction RPCs supporting amount and zero-item receipts
DROP FUNCTION IF EXISTS public.create_party_transaction(uuid, date, text, text, jsonb);
DROP FUNCTION IF EXISTS public.update_party_transaction(uuid, uuid, date, text, text, jsonb);

CREATE OR REPLACE FUNCTION public.create_party_transaction(
  p_party_id uuid,
  p_transaction_date date,
  p_transaction_type text,
  p_narration text,
  p_items jsonb,
  p_amount numeric DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id uuid;
  v_type text := lower(btrim(p_transaction_type));
  v_computed_amount numeric := 0;
BEGIN
  PERFORM public.rg_require_transaction_role();
  IF v_type NOT IN ('sale', 'purchase', 'payment', 'receipt', 'stock_transfer', 'payment_transfer') THEN
    RAISE EXCEPTION 'Invalid transaction type';
  END IF;

  IF v_type = 'receipt' THEN
    IF p_amount IS NULL OR p_amount <= 0 THEN
      RAISE EXCEPTION 'Receipt amount must be greater than zero';
    END IF;
    v_computed_amount := p_amount;
  ELSIF p_items IS NOT NULL AND jsonb_typeof(p_items) = 'array' AND jsonb_array_length(p_items) > 0 THEN
    SELECT coalesce(sum(coalesce(quantity, 1) * coalesce(rate, 0)), 0)
    INTO v_computed_amount
    FROM jsonb_to_recordset(p_items) AS item(quantity numeric, rate numeric);
    IF p_amount IS NOT NULL AND p_amount > 0 THEN
      v_computed_amount := p_amount;
    END IF;
  ELSE
    v_computed_amount := coalesce(p_amount, 0);
  END IF;

  INSERT INTO public.transactions (transaction_date, party_id, transaction_type, narration, created_by, amount)
  VALUES (p_transaction_date, p_party_id, v_type, nullif(btrim(p_narration), ''), auth.uid(), v_computed_amount)
  RETURNING id INTO result_id;

  -- Insert items only for non-receipt transactions that contain item lines
  IF v_type <> 'receipt' AND p_items IS NOT NULL AND jsonb_typeof(p_items) = 'array' AND jsonb_array_length(p_items) > 0 THEN
    INSERT INTO public.transaction_items (transaction_id, item_name, quantity, unit, rate)
    SELECT result_id, btrim(coalesce(item_name, 'Transfer')), coalesce(quantity, 1), coalesce(nullif(btrim(unit), ''), 'unit'), coalesce(rate, 0)
    FROM jsonb_to_recordset(p_items) AS item(item_name text, quantity numeric, unit text, rate numeric);
  END IF;

  RETURN result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_party_transaction(
  p_transaction_id uuid,
  p_party_id uuid,
  p_transaction_date date,
  p_transaction_type text,
  p_narration text,
  p_items jsonb,
  p_amount numeric DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type text := lower(btrim(p_transaction_type));
  v_computed_amount numeric := 0;
BEGIN
  PERFORM public.rg_require_transaction_role();
  IF v_type NOT IN ('sale', 'purchase', 'payment', 'receipt', 'stock_transfer', 'payment_transfer') THEN
    RAISE EXCEPTION 'Invalid transaction type';
  END IF;

  IF v_type = 'receipt' THEN
    IF p_amount IS NULL OR p_amount <= 0 THEN
      RAISE EXCEPTION 'Receipt amount must be greater than zero';
    END IF;
    v_computed_amount := p_amount;
  ELSIF p_items IS NOT NULL AND jsonb_typeof(p_items) = 'array' AND jsonb_array_length(p_items) > 0 THEN
    SELECT coalesce(sum(coalesce(quantity, 1) * coalesce(rate, 0)), 0)
    INTO v_computed_amount
    FROM jsonb_to_recordset(p_items) AS item(quantity numeric, rate numeric);
    IF p_amount IS NOT NULL AND p_amount > 0 THEN
      v_computed_amount := p_amount;
    END IF;
  ELSE
    v_computed_amount := coalesce(p_amount, 0);
  END IF;

  UPDATE public.transactions
  SET party_id = p_party_id,
      transaction_date = p_transaction_date,
      transaction_type = v_type,
      narration = nullif(btrim(p_narration), ''),
      amount = v_computed_amount
  WHERE id = p_transaction_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction not found'; END IF;

  DELETE FROM public.transaction_items WHERE transaction_id = p_transaction_id;

  IF v_type <> 'receipt' AND p_items IS NOT NULL AND jsonb_typeof(p_items) = 'array' AND jsonb_array_length(p_items) > 0 THEN
    INSERT INTO public.transaction_items (transaction_id, item_name, quantity, unit, rate)
    SELECT p_transaction_id, btrim(coalesce(item_name, 'Transfer')), coalesce(quantity, 1), coalesce(nullif(btrim(unit), ''), 'unit'), coalesce(rate, 0)
    FROM jsonb_to_recordset(p_items) AS item(item_name text, quantity numeric, unit text, rate numeric);
  END IF;

  RETURN p_transaction_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_party_transaction(uuid, date, text, text, jsonb, numeric) FROM public;
REVOKE ALL ON FUNCTION public.update_party_transaction(uuid, uuid, date, text, text, jsonb, numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.create_party_transaction(uuid, date, text, text, jsonb, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_party_transaction(uuid, uuid, date, text, text, jsonb, numeric) TO authenticated;

-- 6. Atomic Suspense Claim RPCs
CREATE OR REPLACE FUNCTION public.claim_suspense_entry(
  p_suspense_entry_id uuid,
  p_party_id uuid,
  p_claim_date date,
  p_amount numeric,
  p_narration text DEFAULT NULL,
  p_reference_no text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry record;
  v_claimed numeric;
  v_available numeric;
  v_claim_id uuid := gen_random_uuid();
  v_claim_no text;
  v_txn_id uuid;
  v_new_status text;
  v_party_name text;
  v_narration text;
BEGIN
  PERFORM public.rg_require_transaction_role();

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Claim amount must be greater than zero';
  END IF;

  -- 1. Lock suspense entry row
  SELECT * INTO v_entry FROM public.suspense_entries WHERE id = p_suspense_entry_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Suspense entry not found';
  END IF;

  -- 2. Calculate true available balance
  SELECT coalesce(sum(amount), 0) INTO v_claimed
  FROM public.suspense_claims
  WHERE suspense_entry_id = p_suspense_entry_id AND is_reversed = false;

  v_available := round((v_entry.amount - v_claimed)::numeric, 2);

  -- 3. Enforce anti-overclaim barrier
  IF p_amount > v_available THEN
    RAISE EXCEPTION 'Claim amount (₹%) exceeds available suspense balance (₹%)', p_amount, v_available;
  END IF;

  -- 4. Generate claim number and resolve party name
  v_claim_no := 'CLM-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(v_claim_id::text, 1, 6));
  SELECT name INTO v_party_name FROM public.parties WHERE id = p_party_id;
  v_narration := '[Suspense Claim: ' || v_claim_no || ' | Entry: ' || v_entry.entry_no || '] ' || coalesce(p_narration, v_entry.narration, '');

  -- 5. Insert linked Receipt transaction (amount populated, zero items)
  INSERT INTO public.transactions (transaction_date, party_id, transaction_type, narration, created_by, amount)
  VALUES (p_claim_date, p_party_id, 'receipt', btrim(v_narration), auth.uid(), p_amount)
  RETURNING id INTO v_txn_id;

  -- 6. Insert suspense claim row
  INSERT INTO public.suspense_claims (
    id, claim_no, suspense_entry_id, party_id, transaction_id,
    claim_date, amount, narration, reference_no, is_reversed, created_by
  )
  VALUES (
    v_claim_id, v_claim_no, p_suspense_entry_id, p_party_id, v_txn_id,
    p_claim_date, p_amount, p_narration, coalesce(p_reference_no, v_entry.reference_no), false, auth.uid()
  );

  -- 7. Update parent suspense entry balance and status
  v_claimed := v_claimed + p_amount;
  v_available := v_entry.amount - v_claimed;
  IF v_available <= 0.005 THEN
    v_new_status := 'fully_claimed';
    v_available := 0.00;
  ELSE
    v_new_status := 'partially_claimed';
  END IF;

  UPDATE public.suspense_entries
  SET claimed_amount = v_claimed,
      available_amount = v_available,
      status = v_new_status,
      updated_at = now()
  WHERE id = p_suspense_entry_id;

  RETURN jsonb_build_object(
    'claim_id', v_claim_id,
    'claim_no', v_claim_no,
    'transaction_id', v_txn_id,
    'suspense_entry_id', p_suspense_entry_id,
    'party_id', p_party_id,
    'amount', p_amount,
    'claim_date', p_claim_date,
    'narration', p_narration,
    'reference_no', coalesce(p_reference_no, v_entry.reference_no),
    'new_status', v_new_status,
    'new_available_amount', v_available,
    'new_claimed_amount', v_claimed
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_suspense_claim(
  p_claim_id uuid,
  p_reversal_reason text DEFAULT 'Reversed by user'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim record;
  v_entry record;
  v_claimed numeric;
  v_available numeric;
  v_new_status text;
BEGIN
  PERFORM public.rg_require_transaction_role();

  -- 1. Lock claim row
  SELECT * INTO v_claim FROM public.suspense_claims WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Claim not found'; END IF;
  IF v_claim.is_reversed THEN RAISE EXCEPTION 'This claim has already been reversed'; END IF;

  -- 2. Lock parent entry
  SELECT * INTO v_entry FROM public.suspense_entries WHERE id = v_claim.suspense_entry_id FOR UPDATE;

  -- 3. Delete linked receipt transaction if exists
  IF v_claim.transaction_id IS NOT NULL THEN
    DELETE FROM public.transaction_items WHERE transaction_id = v_claim.transaction_id;
    DELETE FROM public.transactions WHERE id = v_claim.transaction_id;
  END IF;

  -- 4. Mark claim as reversed
  UPDATE public.suspense_claims
  SET is_reversed = true,
      reversal_reason = p_reversal_reason,
      reversed_at = now()
  WHERE id = p_claim_id;

  -- 5. Recalculate parent entry
  SELECT coalesce(sum(amount), 0) INTO v_claimed
  FROM public.suspense_claims
  WHERE suspense_entry_id = v_claim.suspense_entry_id AND is_reversed = false;

  v_available := v_entry.amount - v_claimed;
  IF v_claimed <= 0 THEN
    v_new_status := 'unclaimed';
  ELSIF v_available <= 0.005 THEN
    v_new_status := 'fully_claimed';
    v_available := 0.00;
  ELSE
    v_new_status := 'partially_claimed';
  END IF;

  UPDATE public.suspense_entries
  SET claimed_amount = v_claimed,
      available_amount = v_available,
      status = v_new_status,
      updated_at = now()
  WHERE id = v_claim.suspense_entry_id;

  RETURN jsonb_build_object(
    'claim_id', p_claim_id,
    'suspense_entry_id', v_claim.suspense_entry_id,
    'new_status', v_new_status,
    'new_available_amount', v_available,
    'new_claimed_amount', v_claimed
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_suspense_entry(uuid, uuid, date, numeric, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.claim_suspense_entry(uuid, uuid, date, numeric, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.reverse_suspense_claim(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.reverse_suspense_claim(uuid, text) TO authenticated;
