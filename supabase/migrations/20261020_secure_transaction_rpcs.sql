-- Run in the Supabase SQL Editor after reviewing this migration against your
-- existing schema. It preserves RLS and makes each write a single transaction.

create or replace function public.rg_require_transaction_role()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'staff')
  ) then
    raise exception 'Not authorized to manage RG Plastics transactions';
  end if;
end;
$$;

create or replace function public.resolve_party(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_name text := regexp_replace(btrim(p_name), '\s+', ' ', 'g');
  result_id uuid;
begin
  perform public.rg_require_transaction_role();
  if normalized_name = '' then raise exception 'Party name is required'; end if;
  perform pg_advisory_xact_lock(hashtext('rg-party:' || lower(normalized_name)));
  select id into result_id from public.parties
  where lower(regexp_replace(btrim(name), '\s+', ' ', 'g')) = lower(normalized_name)
  limit 1;
  if result_id is null then
    insert into public.parties (name) values (normalized_name) returning id into result_id;
  end if;
  return result_id;
end;
$$;

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
  if p_transaction_type not in ('sale', 'purchase') then raise exception 'Invalid transaction type'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'At least one item is required'; end if;
  if exists (select 1 from jsonb_to_recordset(p_items) as item(item_name text, quantity numeric, unit text, rate numeric) where btrim(coalesce(item_name, '')) = '' or quantity <= 0 or rate <= 0) then raise exception 'Each item needs a name, positive quantity, and positive rate'; end if;
  -- transaction_no is GENERATED ALWAYS in this project, so PostgreSQL supplies it.
  insert into public.transactions (transaction_date, party_id, transaction_type, narration, created_by)
  values (p_transaction_date, p_party_id, p_transaction_type, nullif(btrim(p_narration), ''), auth.uid())
  returning id into result_id;
  insert into public.transaction_items (transaction_id, item_name, quantity, unit, rate)
  select result_id, btrim(item_name), quantity, coalesce(nullif(btrim(unit), ''), 'kg'), rate
  from jsonb_to_recordset(p_items) as item(item_name text, quantity numeric, unit text, rate numeric);
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
  if p_transaction_type not in ('sale', 'purchase') then raise exception 'Invalid transaction type'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'At least one item is required'; end if;
  if exists (select 1 from jsonb_to_recordset(p_items) as item(item_name text, quantity numeric, unit text, rate numeric) where btrim(coalesce(item_name, '')) = '' or quantity <= 0 or rate <= 0) then raise exception 'Each item needs a name, positive quantity, and positive rate'; end if;
  update public.transactions set party_id = p_party_id, transaction_date = p_transaction_date, transaction_type = p_transaction_type, narration = nullif(btrim(p_narration), '') where id = p_transaction_id;
  if not found then raise exception 'Transaction not found'; end if;
  delete from public.transaction_items where transaction_id = p_transaction_id;
  insert into public.transaction_items (transaction_id, item_name, quantity, unit, rate)
  select p_transaction_id, btrim(item_name), quantity, coalesce(nullif(btrim(unit), ''), 'kg'), rate
  from jsonb_to_recordset(p_items) as item(item_name text, quantity numeric, unit text, rate numeric);
  return p_transaction_id;
end;
$$;

create or replace function public.delete_party_transaction(p_transaction_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.rg_require_transaction_role();
  delete from public.transaction_items where transaction_id = p_transaction_id;
  delete from public.transactions where id = p_transaction_id;
  if not found then raise exception 'Transaction not found'; end if;
end;
$$;

revoke all on function public.rg_require_transaction_role() from public;
revoke all on function public.resolve_party(text) from public;
revoke all on function public.create_party_transaction(uuid, date, text, text, jsonb) from public;
revoke all on function public.update_party_transaction(uuid, uuid, date, text, text, jsonb) from public;
revoke all on function public.delete_party_transaction(uuid) from public;
grant execute on function public.resolve_party(text), public.create_party_transaction(uuid, date, text, text, jsonb), public.update_party_transaction(uuid, uuid, date, text, text, jsonb), public.delete_party_transaction(uuid) to authenticated;
