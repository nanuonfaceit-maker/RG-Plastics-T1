-- Run in the Supabase SQL Editor to add party profile fields, opening_balance, and transaction RPCs.

ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS investment numeric DEFAULT 0;
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS initial_loss numeric DEFAULT 0;
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS opening_balance numeric DEFAULT 0;

-- Drop previous 6-parameter version if present to avoid signature conflicts:
DROP FUNCTION IF EXISTS public.save_party(text, text, text, numeric, numeric, uuid);

-- Create or update party with full details (name, category, location, investment, initial loss, opening balance)
create or replace function public.save_party(
  p_name text,
  p_party_type text default null,
  p_location text default null,
  p_investment numeric default 0,
  p_initial_loss numeric default 0,
  p_party_id uuid default null,
  p_opening_balance numeric default 0
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_name text := regexp_replace(btrim(p_name), '\s+', ' ', 'g');
  result_id uuid := p_party_id;
begin
  perform public.rg_require_transaction_role();
  if normalized_name = '' then raise exception 'Party name is required'; end if;
  perform pg_advisory_xact_lock(hashtext('rg-party:' || lower(normalized_name)));

  if result_id is not null then
    update public.parties
    set name = normalized_name,
        party_type = p_party_type,
        location = p_location,
        address = coalesce(p_location, address),
        investment = coalesce(p_investment, 0),
        initial_loss = coalesce(p_initial_loss, 0),
        opening_balance = coalesce(p_opening_balance, 0),
        updated_at = now()
    where id = result_id;
    return result_id;
  end if;

  select id into result_id from public.parties
  where lower(regexp_replace(btrim(name), '\s+', ' ', 'g')) = lower(normalized_name)
  limit 1;

  if result_id is null then
    insert into public.parties (name, party_type, location, address, investment, initial_loss, opening_balance)
    values (normalized_name, p_party_type, p_location, p_location, coalesce(p_investment, 0), coalesce(p_initial_loss, 0), coalesce(p_opening_balance, 0))
    returning id into result_id;
  else
    update public.parties
    set party_type = coalesce(p_party_type, party_type),
        location = coalesce(p_location, location),
        address = coalesce(p_location, address),
        investment = coalesce(p_investment, investment),
        initial_loss = coalesce(p_initial_loss, initial_loss),
        opening_balance = coalesce(p_opening_balance, opening_balance),
        updated_at = now()
    where id = result_id;
  end if;

  return result_id;
end;
$$;

-- Allow extended transaction types: sale, purchase, payment, receipt, stock_transfer, payment_transfer
create or replace function public.create_party_transaction(
  p_party_id uuid, p_transaction_date date, p_transaction_type text,
  p_narration text, p_items jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare result_id uuid;
begin
  perform public.rg_require_transaction_role();
  if lower(p_transaction_type) not in ('sale', 'purchase', 'payment', 'receipt', 'stock_transfer', 'payment_transfer') then
    raise exception 'Invalid transaction type';
  end if;

  insert into public.transactions (transaction_date, party_id, transaction_type, narration, created_by)
  values (p_transaction_date, p_party_id, lower(p_transaction_type), nullif(btrim(p_narration), ''), auth.uid())
  returning id into result_id;

  if p_items is not null and jsonb_typeof(p_items) = 'array' and jsonb_array_length(p_items) > 0 then
    insert into public.transaction_items (transaction_id, item_name, quantity, unit, rate)
    select result_id, btrim(coalesce(item_name, 'Transfer')), coalesce(quantity, 1), coalesce(nullif(btrim(unit), ''), 'unit'), coalesce(rate, 0)
    from jsonb_to_recordset(p_items) as item(item_name text, quantity numeric, unit text, rate numeric);
  end if;

  return result_id;
end;
$$;

create or replace function public.update_party_transaction(
  p_transaction_id uuid, p_party_id uuid, p_transaction_date date,
  p_transaction_type text, p_narration text, p_items jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.rg_require_transaction_role();
  if lower(p_transaction_type) not in ('sale', 'purchase', 'payment', 'receipt', 'stock_transfer', 'payment_transfer') then
    raise exception 'Invalid transaction type';
  end if;

  update public.transactions
  set party_id = p_party_id,
      transaction_date = p_transaction_date,
      transaction_type = lower(p_transaction_type),
      narration = nullif(btrim(p_narration), '')
  where id = p_transaction_id;

  if not found then raise exception 'Transaction not found'; end if;
  delete from public.transaction_items where transaction_id = p_transaction_id;

  if p_items is not null and jsonb_typeof(p_items) = 'array' and jsonb_array_length(p_items) > 0 then
    insert into public.transaction_items (transaction_id, item_name, quantity, unit, rate)
    select p_transaction_id, btrim(coalesce(item_name, 'Transfer')), coalesce(quantity, 1), coalesce(nullif(btrim(unit), ''), 'unit'), coalesce(rate, 0)
    from jsonb_to_recordset(p_items) as item(item_name text, quantity numeric, unit text, rate numeric);
  end if;

  return p_transaction_id;
end;
$$;

revoke all on function public.save_party(text, text, text, numeric, numeric, uuid, numeric) from public;
grant execute on function public.save_party(text, text, text, numeric, numeric, uuid, numeric) to authenticated;
grant execute on function public.create_party_transaction(uuid, date, text, text, jsonb) to authenticated;
grant execute on function public.update_party_transaction(uuid, uuid, date, text, text, jsonb) to authenticated;

-- Delete or soft-delete party with option to delete associated transactions
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
