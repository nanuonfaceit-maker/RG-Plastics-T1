-- ==============================================================================
-- Migration: 20261021_audit_vault_and_soft_delete.sql
-- 1. Adds soft-delete columns (is_deleted, deleted_at, deleted_by) to transactions and parties.
-- 2. Creates immutable public.audit_logs table to track every insert, update, delete, and restore.
-- 3. Sets up automated triggers to record full historical change data.
-- 4. Updates delete_party_transaction() and delete_party() to soft-delete without data loss.
-- 5. Adds restore_party_transaction() and restore_party() RPCs.
-- ==============================================================================

-- 1. Add soft-delete columns
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id);

ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id);

-- 2. Create immutable audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'RESTORE')),
  old_data jsonb,
  new_data jsonb,
  performed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for speedy queries on record history
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Enable Row Level Security on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can read audit logs"
  ON public.audit_logs FOR SELECT TO authenticated USING (true);

-- Disallow updates/deletes to audit_logs (append-only)
REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM authenticated, anon, public;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

-- 3. Universal Audit Trigger Function
CREATE OR REPLACE FUNCTION public.rg_audit_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_rec_id uuid;
  v_user uuid := auth.uid();
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_action := 'INSERT';
    v_rec_id := NEW.id;
    INSERT INTO public.audit_logs (table_name, record_id, action, new_data, performed_by, created_at)
    VALUES (TG_TABLE_NAME, v_rec_id, v_action, to_jsonb(NEW), v_user, now());
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF (TG_TABLE_NAME = 'transactions' AND coalesce(OLD.is_deleted, false) = false AND coalesce(NEW.is_deleted, false) = true) THEN
      v_action := 'DELETE';
    ELSIF (TG_TABLE_NAME = 'transactions' AND coalesce(OLD.is_deleted, false) = true AND coalesce(NEW.is_deleted, false) = false) THEN
      v_action := 'RESTORE';
    ELSIF (TG_TABLE_NAME = 'parties' AND coalesce(OLD.is_deleted, false) = false AND coalesce(NEW.is_deleted, false) = true) THEN
      v_action := 'DELETE';
    ELSIF (TG_TABLE_NAME = 'parties' AND coalesce(OLD.is_deleted, false) = true AND coalesce(NEW.is_deleted, false) = false) THEN
      v_action := 'RESTORE';
    ELSE
      v_action := 'UPDATE';
    END IF;
    v_rec_id := NEW.id;
    INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, performed_by, created_at)
    VALUES (TG_TABLE_NAME, v_rec_id, v_action, to_jsonb(OLD), to_jsonb(NEW), v_user, now());
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    v_action := 'DELETE';
    v_rec_id := OLD.id;
    INSERT INTO public.audit_logs (table_name, record_id, action, old_data, performed_by, created_at)
    VALUES (TG_TABLE_NAME, v_rec_id, v_action, to_jsonb(OLD), v_user, now());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Attach triggers to transactions, parties, suspense_entries, and suspense_claims
DROP TRIGGER IF EXISTS trg_audit_transactions ON public.transactions;
CREATE TRIGGER trg_audit_transactions
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.rg_audit_record();

DROP TRIGGER IF EXISTS trg_audit_parties ON public.parties;
CREATE TRIGGER trg_audit_parties
AFTER INSERT OR UPDATE OR DELETE ON public.parties
FOR EACH ROW EXECUTE FUNCTION public.rg_audit_record();

-- 4. Safe Soft-Delete and Restore RPCs
CREATE OR REPLACE FUNCTION public.delete_party_transaction(p_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.rg_require_transaction_role();
  
  -- Soft-delete by setting is_deleted flag and timestamp
  UPDATE public.transactions
  SET is_deleted = true,
      deleted_at = now(),
      deleted_by = auth.uid()
  WHERE id = p_transaction_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_party_transaction(p_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.rg_require_transaction_role();
  
  UPDATE public.transactions
  SET is_deleted = false,
      deleted_at = NULL,
      deleted_by = NULL
  WHERE id = p_transaction_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_party(
  p_party_id uuid,
  p_delete_transactions boolean DEFAULT false
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.rg_require_transaction_role();

  IF p_delete_transactions THEN
    UPDATE public.transactions
    SET is_deleted = true,
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE party_id = p_party_id 
       OR narration LIKE '%|id:' || p_party_id::text || '%';
  END IF;

  -- Soft delete the party
  UPDATE public.parties
  SET is_deleted = true,
      is_active = false,
      deleted_at = now(),
      deleted_by = auth.uid()
  WHERE id = p_party_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Party not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_party(p_party_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.rg_require_transaction_role();

  UPDATE public.parties
  SET is_deleted = false,
      is_active = true,
      deleted_at = NULL,
      deleted_by = NULL
  WHERE id = p_party_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Party not found';
  END IF;
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.delete_party_transaction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_party_transaction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_party(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_party(uuid) TO authenticated;
