import { PostgrestError } from '@supabase/supabase-js';
import {
  Party,
  PartyCategory,
  Transaction,
  TransactionItem,
  TransactionType,
  SuspenseEntry,
  SuspenseClaim,
  AuditLogEntry,
  DatabaseVaultSnapshot,
} from '@/types/transaction';
import {
  calcTotal,
  normalizeParty,
  resolvePartyCategory,
  recalculateSuspenseEntry,
  round2,
} from '@/lib/calculations';
import { supabase } from '@/lib/supabase';

type DbItem = { id: string; item_name: string; quantity: number | string; unit: string | null; rate: number | string };
type DbTransaction = {
  id: string;
  transaction_no: string | null;
  transaction_date: string;
  party_id: string;
  transaction_type: string;
  narration: string | null;
  amount?: number | string | null;
  reference_no?: string | null;
  parties: { name: string; party_type?: string | null } | { name: string; party_type?: string | null }[] | null;
  transaction_items: DbItem[] | null;
  is_deleted?: boolean | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
};

function dbError(error: PostgrestError | Error | null): never {
  throw new Error(error?.message || 'The database request could not be completed.');
}

function asNumber(value: number | string | null | undefined): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeTxnType(typeStr: string | null | undefined): TransactionType {
  const t = (typeStr || '').toLowerCase().replace(/[_\s-]+/g, '');
  if (t === 'sale') return 'Sale';
  if (t === 'purchase') return 'Purchase';
  if (t === 'payment') return 'Payment';
  if (t === 'receipt') return 'Receipt';
  if (t === 'stocktransfer') return 'Stock Transfer';
  if (t === 'paymenttransfer') return 'Payment Transfer';
  return 'Sale';
}

export function mapTransaction(row: DbTransaction): Transaction {
  const party = Array.isArray(row.parties) ? row.parties[0] : row.parties;
  const items: TransactionItem[] = (row.transaction_items ?? []).map((item) => {
    const quantity = asNumber(item.quantity);
    const ratePerUnit = asNumber(item.rate);
    return {
      id: item.id,
      itemName: item.item_name,
      quantity,
      unit: item.unit || 'kg',
      ratePerUnit,
      totalAmount: calcTotal(quantity, ratePerUnit),
    };
  });
  const firstItem = items[0] ?? { itemName: '', quantity: 0, unit: 'kg', ratePerUnit: 0, totalAmount: 0 };
  const rawNarration = row.narration ?? '';

  let source: 'Cash' | 'Bank' | undefined;
  let transferPartyId: string | undefined;
  let transferPartyName: string | undefined;
  let transferRole: 'creditor' | 'debitor' | undefined;

  const transferMatch = rawNarration.match(
    /\[Transfer:\s*([a-zA-Z]+)\s*to\s*([^\]|]+)(?:\|\s*id:([^\]|]*))?(?:\|\s*role:([^\]]*))?\]/i
  );
  if (transferMatch) {
    source = transferMatch[1].toLowerCase() === 'bank' ? 'Bank' : 'Cash';
    transferPartyName = transferMatch[2]?.trim();
    transferPartyId = transferMatch[3]?.trim();
    transferRole = transferMatch[4]?.trim() as 'creditor' | 'debitor' | undefined;
  }

  const explicitTypeMatch = rawNarration.match(/\[Type:\s*([^\]]+)\]/i);
  let type: TransactionType = normalizeTxnType(row.transaction_type);
  if (transferMatch) {
    type = 'Payment Transfer';
  } else if (explicitTypeMatch) {
    type = normalizeTxnType(explicitTypeMatch[1]);
  }

  const refMatch = rawNarration.match(/\[Ref:\s*([^\]]+)\]/i);
  const referenceNo = (row.reference_no && row.reference_no.trim()) || (refMatch ? refMatch[1]?.trim() : undefined);

  const cleanNarration = rawNarration
    .replace(/\[Transfer:[^\]]+\]\s*/gi, '')
    .replace(/\[Type:[^\]]+\]\s*/gi, '')
    .replace(/\[Ref:[^\]]+\]\s*/gi, '')
    .trim();

  const itemsTotal = items.reduce((sum, item) => sum + item.totalAmount, 0);
  const rowAmount = row.amount != null ? asNumber(row.amount) : undefined;
  const totalAmount = (items.length === 0 && rowAmount != null)
    ? rowAmount
    : (itemsTotal || (rowAmount != null ? rowAmount : 0));

  return {
    id: row.id,
    transactionNo: row.transaction_no ?? undefined,
    date: row.transaction_date,
    partyId: row.party_id,
    partyName: party?.name ?? 'Unknown party',
    partyType: party?.party_type ?? null,
    narration: cleanNarration,
    type,
    itemName: firstItem.itemName || (type === 'Receipt' ? 'Receipt Voucher' : ''),
    quantity: firstItem.quantity,
    ratePerUnit: firstItem.ratePerUnit,
    totalAmount,
    amount: rowAmount,
    referenceNo,
    items,
    source,
    transferPartyId,
    transferPartyName,
    transferRole,
    isDeleted: Boolean(row.is_deleted),
    deletedAt: row.deleted_at ?? undefined,
    deletedBy: row.deleted_by ?? undefined,
  };
}

export async function loadTransactions(): Promise<Transaction[]> {
  // 1. Try querying with soft-delete audit columns
  const auditQuery = await supabase
    .from('transactions')
    .select('id, transaction_no, transaction_date, party_id, transaction_type, narration, amount, is_deleted, deleted_at, deleted_by, parties(name, party_type), transaction_items(id, item_name, quantity, unit, rate)')
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (!auditQuery.error && auditQuery.data) {
    return (auditQuery.data as unknown as DbTransaction[]).map(mapTransaction);
  }

  // 2. Fallback to standard columns if soft-delete migration not yet applied
  const primary = await supabase
    .from('transactions')
    .select('id, transaction_no, transaction_date, party_id, transaction_type, narration, amount, parties(name, party_type), transaction_items(id, item_name, quantity, unit, rate)')
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (!primary.error && primary.data) {
    return (primary.data as unknown as DbTransaction[]).map(mapTransaction);
  }

  const secondary = await supabase
    .from('transactions')
    .select('id, transaction_no, transaction_date, party_id, transaction_type, narration, parties(name), transaction_items(id, item_name, quantity, unit, rate)')
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (secondary.error) dbError(secondary.error);
  return ((secondary.data ?? []) as unknown as DbTransaction[]).map(mapTransaction);
}

function parsePartyMetadata(notes: string | null | undefined): {
  location?: string;
  investment?: number;
  initialLoss?: number;
  openingBalance?: number;
} {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes);
    if (parsed && typeof parsed === 'object') {
      return {
        location: typeof parsed.location === 'string' ? parsed.location : undefined,
        investment: typeof parsed.investment === 'number' ? parsed.investment : undefined,
        initialLoss:
          typeof parsed.initialLoss === 'number'
            ? parsed.initialLoss
            : typeof parsed.loss === 'number'
            ? parsed.loss
            : undefined,
        openingBalance:
          typeof parsed.openingBalance === 'number'
            ? parsed.openingBalance
            : typeof parsed.opening_balance === 'number'
            ? parsed.opening_balance
            : undefined,
      };
    }
  } catch {
    // not JSON
  }
  return {};
}

export async function loadParties(): Promise<Party[]> {
  // First try querying with audit and soft-delete columns if migration ran, else fallback cleanly
  let rows: Record<string, unknown>[] = [];
  const auditQuery = await supabase
    .from('parties')
    .select('id, name, party_type, is_active, address, notes, location, investment, initial_loss, opening_balance, is_deleted, deleted_at, deleted_by')
    .order('name');

  if (!auditQuery.error && auditQuery.data) {
    rows = (auditQuery.data ?? []) as unknown as Record<string, unknown>[];
  } else {
    const primary = await supabase
      .from('parties')
      .select('id, name, party_type, is_active, address, notes, location, investment, initial_loss, opening_balance')
      .order('name');

    if (primary.error) {
      // Fallback if opening_balance not yet added in Supabase
      const secondary = await supabase
        .from('parties')
        .select('id, name, party_type, is_active, address, notes, location, investment, initial_loss')
        .order('name');
      if (secondary.error) {
        const fallback = await supabase
          .from('parties')
          .select('id, name, party_type, is_active, address, notes')
          .order('name');
        if (fallback.error) dbError(fallback.error);
        rows = (fallback.data ?? []) as unknown as Record<string, unknown>[];
      } else {
        rows = (secondary.data ?? []) as unknown as Record<string, unknown>[];
      }
    } else {
      rows = (primary.data ?? []) as unknown as Record<string, unknown>[];
    }
  }

  return rows.map((party) => {
    const meta = parsePartyMetadata(party.notes as string | null);
    const location = String(party.location ?? meta.location ?? party.address ?? '').trim();
    const investment = asNumber(
      (party.investment as number | string | null | undefined) ?? meta.investment ?? 0
    );
    const initialLoss = asNumber(
      (party.initial_loss as number | string | null | undefined) ?? meta.initialLoss ?? 0
    );
    const openingBalance = asNumber(
      (party.opening_balance as number | string | null | undefined) ?? meta.openingBalance ?? 0
    );
    let rawType = party.party_type as string | null | undefined;
    if (rawType && rawType.toLowerCase() === 'both') {
      const clean = resolvePartyCategory('', [], String(party.id), String(party.name));
      rawType = clean;
      void supabase.from('parties').update({ party_type: clean }).eq('id', party.id);
    }
    return {
      id: String(party.id),
      name: String(party.name),
      partyType: (rawType as Party['partyType']) || null,
      location,
      investment,
      initialLoss,
      openingBalance,
      isActive: party.is_active !== false && party.is_active !== null && !party.is_deleted,
      isDeleted: Boolean(party.is_deleted),
      deletedAt: (party.deleted_at as string) || undefined,
      deletedBy: (party.deleted_by as string) || undefined,
    };
  });
}

export function toLegacyDbPartyType(category?: string | null): string | null {
  if (!category) return null;
  const c = category.trim().toLowerCase();
  if (c.includes('deb') || c.includes('cust')) return 'customer';
  if (c.includes('cred') || c.includes('supp') || c.includes('vend')) return 'supplier';
  if (c === 'both') return 'both';
  return null;
}

export async function saveParty(party: {
  id?: string;
  name: string;
  partyType?: Party['partyType'];
  location?: string;
  investment?: number;
  initialLoss?: number;
  openingBalance?: number;
}): Promise<Party> {
  const normalizedName = party.name.trim();
  const location = party.location?.trim() || '';
  const investment = Math.round((Number(party.investment) || 0) * 100) / 100;
  const initialLoss = Math.round((Number(party.initialLoss) || 0) * 100) / 100;
  const openingBalance = Math.round((Number(party.openingBalance) || 0) * 100) / 100;
  const partyType = party.partyType || null;
  const metaPayload = JSON.stringify({
    category: partyType,
    partyType,
    location,
    investment,
    initialLoss,
    openingBalance,
  });

  // Helper to execute RPC with check-constraint fallback
  async function invokeSavePartyRpc(paramCount: 7 | 6, partyTypeArg: string | null) {
    const payload: Record<string, unknown> = {
      p_name: normalizedName,
      p_party_type: partyTypeArg,
      p_location: location,
      p_investment: investment,
      p_initial_loss: initialLoss,
      p_party_id: party.id || null,
    };
    if (paramCount === 7) {
      payload.p_opening_balance = openingBalance;
    }
    const res = await supabase.rpc('save_party', payload);
    if (res.error && res.error.message?.includes('parties_party_type_check')) {
      const legacyType = toLegacyDbPartyType(partyTypeArg);
      payload.p_party_type = legacyType;
      return await supabase.rpc('save_party', payload);
    }
    return res;
  }

  // 1. Try 7-parameter RPC save_party
  try {
    const rpcRes7 = await invokeSavePartyRpc(7, partyType);
    if (!rpcRes7.error && rpcRes7.data) {
      await supabase.from('parties').update({ notes: metaPayload }).eq('id', rpcRes7.data);
      const parties = await loadParties();
      const saved = parties.find((p) => p.id === rpcRes7.data || normalizeParty(p.name) === normalizeParty(normalizedName));
      if (saved) return saved;
      return {
        id: String(rpcRes7.data),
        name: normalizedName,
        partyType,
        location,
        investment,
        initialLoss,
        openingBalance,
        isActive: true,
      };
    }
  } catch {
    // Continue to 6-parameter attempt
  }

  // 2. Try 6-parameter RPC save_party
  try {
    const rpcRes6 = await invokeSavePartyRpc(6, partyType);
    if (!rpcRes6.error && rpcRes6.data) {
      await supabase.from('parties').update({ notes: metaPayload, opening_balance: openingBalance }).eq('id', rpcRes6.data);
      const parties = await loadParties();
      const saved = parties.find((p) => p.id === rpcRes6.data || normalizeParty(p.name) === normalizeParty(normalizedName));
      if (saved) return saved;
      return {
        id: String(rpcRes6.data),
        name: normalizedName,
        partyType,
        location,
        investment,
        initialLoss,
        openingBalance,
        isActive: true,
      };
    }
  } catch {
    // Continue to direct table fallback
  }

  // 3. Fallback: Direct table operations with check-constraint fallback
  let partyId = party.id;
  let lastErr: Error | PostgrestError | null = null;
  if (!partyId) {
    const { data: resolvedId, error: resolveErr } = await supabase.rpc('resolve_party', {
      p_name: normalizedName,
    });
    if (!resolveErr && resolvedId) {
      partyId = resolvedId;
    } else {
      let insertType = partyType;
      let insertRes = await supabase
        .from('parties')
        .insert({
          name: normalizedName,
          party_type: insertType,
          location,
          address: location,
          investment,
          initial_loss: initialLoss,
          opening_balance: openingBalance,
          notes: metaPayload,
        })
        .select('id')
        .single();

      if (insertRes.error && insertRes.error.message?.includes('opening_balance')) {
        insertRes = await supabase
          .from('parties')
          .insert({
            name: normalizedName,
            party_type: insertType,
            location,
            address: location,
            investment,
            initial_loss: initialLoss,
            notes: metaPayload,
          })
          .select('id')
          .single();
      }

      if (insertRes.error && insertRes.error.message?.includes('parties_party_type_check')) {
        insertType = (toLegacyDbPartyType(partyType) as Party['partyType']) || null;
        insertRes = await supabase
          .from('parties')
          .insert({
            name: normalizedName,
            party_type: insertType,
            location,
            address: location,
            investment,
            initial_loss: initialLoss,
            opening_balance: openingBalance,
            notes: metaPayload,
          })
          .select('id')
          .single();

        if (insertRes.error && insertRes.error.message?.includes('opening_balance')) {
          insertRes = await supabase
            .from('parties')
            .insert({
              name: normalizedName,
              party_type: insertType,
              location,
              address: location,
              investment,
              initial_loss: initialLoss,
              notes: metaPayload,
            })
            .select('id')
            .single();
        }
      }

      if (insertRes.error) {
        lastErr = insertRes.error;
      } else {
        partyId = insertRes.data?.id;
      }
    }
  }

  if (partyId) {
    let updated = false;
    let updateType = partyType;

    async function attemptUpdate(payload: Record<string, unknown>) {
      let res = await supabase.from('parties').update(payload).eq('id', partyId);
      if (res.error && res.error.message?.includes('parties_party_type_check')) {
        updateType = (toLegacyDbPartyType(partyType) as Party['partyType']) || null;
        res = await supabase.from('parties').update({ ...payload, party_type: updateType }).eq('id', partyId);
      }
      return res;
    }

    const fullRes = await attemptUpdate({
      name: normalizedName,
      party_type: updateType,
      location,
      address: location,
      investment,
      initial_loss: initialLoss,
      opening_balance: openingBalance,
      notes: metaPayload,
    });

    if (!fullRes.error) {
      updated = true;
    } else {
      const noObRes = await attemptUpdate({
        name: normalizedName,
        party_type: updateType,
        location,
        address: location,
        investment,
        initial_loss: initialLoss,
        notes: metaPayload,
      });

      if (!noObRes.error) {
        updated = true;
      } else {
        const baseRes = await attemptUpdate({
          name: normalizedName,
          party_type: updateType,
          address: location,
          notes: metaPayload,
        });

        if (!baseRes.error) {
          updated = true;
        } else {
          lastErr = baseRes.error;
        }
      }
    }

    if (updated) {
      const parties = await loadParties();
      const saved = parties.find((p) => p.id === partyId || normalizeParty(p.name) === normalizeParty(normalizedName));
      if (saved) return saved;
    }
  }

  if (lastErr) {
    dbError(lastErr);
  }

  return {
    id: partyId || '',
    name: normalizedName,
    partyType,
    location,
    investment,
    initialLoss,
    openingBalance,
    isActive: true,
  };
}

export async function requireAuthorizedUser(): Promise<{ id: string; role: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please sign in before accessing transactions.');
  const { data, error } = await supabase.from('profiles').select('id, role').eq('id', user.id).maybeSingle();
  if (error) dbError(error);
  if (!data || !['admin', 'staff'].includes(data.role)) {
    throw new Error('Your account does not have an authorized RG Plastics profile.');
  }
  return data;
}

async function resolvePartyId(name: string, parties: Party[]): Promise<string> {
  const normalized = normalizeParty(name);
  const matching = parties.find((party) => normalizeParty(party.name) === normalized);
  if (matching) return matching.id;

  try {
    const { data, error } = await supabase.rpc('resolve_party', { p_name: name.trim() });
    if (!error && typeof data === 'string' && data) {
      return data;
    }
  } catch {
    // Continue to direct table fallback
  }

  // Fallback 1: Query parties table directly
  const { data: existing } = await supabase
    .from('parties')
    .select('id, name')
    .ilike('name', name.trim())
    .limit(1);

  if (existing && existing.length > 0 && existing[0]?.id) {
    return String(existing[0].id);
  }

  // Fallback 2: Direct insert
  const { data: inserted, error: insertErr } = await supabase
    .from('parties')
    .insert({ name: name.trim() })
    .select('id')
    .single();

  if (insertErr) dbError(insertErr);
  if (!inserted?.id) throw new Error('The party could not be created.');
  return String(inserted.id);
}

function itemPayload(items: TransactionItem[]) {
  return items.map((item) => ({
    item_name: item.itemName.trim(),
    quantity: item.quantity,
    unit: item.unit.trim() || 'kg',
    rate: item.ratePerUnit,
  }));
}

export async function saveTransaction(transaction: Transaction, parties: Party[]): Promise<Transaction> {
  const partyId = transaction.partyId || await resolvePartyId(transaction.partyName, parties);

  // Ensure primary party has a permanent single category assigned based on first transaction if unassigned or 'both'
  const normPartyName = normalizeParty(transaction.partyName);
  const matchingParty = parties.find((p) => p.id === partyId || normalizeParty(p.name) === normPartyName);
  const currentCategory = matchingParty?.partyType;

  if (!currentCategory || currentCategory.toLowerCase() === 'both') {
    let assignedCategory: PartyCategory = 'debtor';
    if (transaction.type === 'Sale' || transaction.type === 'Receipt') {
      assignedCategory = 'debtor';
    } else if (
      transaction.type === 'Purchase' ||
      transaction.type === 'Payment' ||
      transaction.type === 'Payment Transfer'
    ) {
      assignedCategory = 'creditor';
    } else if (transaction.type === 'Stock Transfer') {
      assignedCategory = 'transfer';
    }
    const legacyCategory = toLegacyDbPartyType(assignedCategory);
    try {
      await supabase
        .from('parties')
        .update({
          party_type: legacyCategory || assignedCategory,
          notes: JSON.stringify({ category: assignedCategory, partyType: assignedCategory }),
        })
        .eq('id', partyId);
    } catch {
      // Best-effort category assignment
    }
    if (matchingParty) {
      matchingParty.partyType = assignedCategory;
    }
  }

  let transferPartyId = transaction.transferPartyId;
  if (transaction.type === 'Payment Transfer' && transaction.transferPartyName && !transferPartyId) {
    transferPartyId = await resolvePartyId(transaction.transferPartyName, parties);
  }

  // Ensure destination transfer party has debtor category assigned if unassigned or 'both'
  if (transaction.type === 'Payment Transfer' && transferPartyId) {
    const normDebName = normalizeParty(transaction.transferPartyName || '');
    const matchingDebtor = parties.find((p) => p.id === transferPartyId || normalizeParty(p.name) === normDebName);
    if (!matchingDebtor?.partyType || matchingDebtor.partyType.toLowerCase() === 'both') {
      try {
        await supabase
          .from('parties')
          .update({
            party_type: 'customer',
            notes: JSON.stringify({ category: 'debtor', partyType: 'debtor' }),
          })
          .eq('id', transferPartyId);
      } catch {
        // Best-effort category assignment
      }
      if (matchingDebtor) {
        matchingDebtor.partyType = 'debtor';
      }
    }
  }

  // Format narration to embed transfer metadata if Payment Transfer (strip existing tags first to prevent duplicate stacking)
  let formattedNarration = (transaction.narration || '')
    .replace(/\[Transfer:[^\]]+\]\s*/gi, '')
    .replace(/\[Type:[^\]]+\]\s*/gi, '')
    .replace(/\[Ref:[^\]]+\]\s*/gi, '')
    .trim();
  if (transaction.type === 'Payment Transfer') {
    const source = transaction.source || 'Cash';
    const debPartyName = transaction.transferPartyName || '';
    const debPartyId = transferPartyId || '';
    const transferHeader = `[Transfer: ${source} to ${debPartyName}|id:${debPartyId}|role:creditor]`;
    formattedNarration = formattedNarration
      ? `${transferHeader} ${formattedNarration}`
      : transferHeader;
  } else if (!['Sale', 'Purchase'].includes(transaction.type)) {
    const typeHeader = `[Type: ${transaction.type}]`;
    formattedNarration = formattedNarration
      ? `${typeHeader} ${formattedNarration}`
      : typeHeader;
  }

  if (transaction.referenceNo && !formattedNarration.includes(`[Ref: ${transaction.referenceNo}]`)) {
    formattedNarration = `[Ref: ${transaction.referenceNo}] ${formattedNarration}`.trim();
  }

  // Ensure there is at least one item row to satisfy legacy DB check if migration hasn't run
  // For Receipt, do NOT create phantom item rows
  const isReceipt = transaction.type === 'Receipt';
  const items = isReceipt
    ? []
    : (transaction.items && transaction.items.length > 0)
      ? transaction.items
      : [{
          itemName: transaction.type === 'Payment Transfer'
            ? `Payment Transfer (${transaction.source || 'Cash'})`
            : transaction.itemName || transaction.type,
          quantity: 1,
          unit: 'nos',
          ratePerUnit: transaction.totalAmount,
          totalAmount: transaction.totalAmount,
        }];

  const dbType = transaction.type.toLowerCase().replace(/\s+/g, '_');
  const payload: Record<string, unknown> = {
    p_party_id: partyId,
    p_transaction_date: transaction.date,
    p_transaction_type: dbType,
    p_narration: formattedNarration,
    p_items: itemPayload(items),
    p_amount: transaction.totalAmount,
  };

  let result = transaction.id
    ? await supabase.rpc('update_party_transaction', { p_transaction_id: transaction.id, ...payload })
    : await supabase.rpc('create_party_transaction', payload);

  // Fallback if database RPC does not recognize p_amount
  if (result.error && (result.error.message?.includes('p_amount') || result.error.code === 'PGRST202')) {
    const payloadWithoutAmount = { ...payload };
    delete (payloadWithoutAmount as Record<string, unknown>).p_amount;
    result = transaction.id
      ? await supabase.rpc('update_party_transaction', { p_transaction_id: transaction.id, ...payloadWithoutAmount })
      : await supabase.rpc('create_party_transaction', payloadWithoutAmount);
  }

  // Fallback if database RPC or check constraint strictly expects 'sale' or 'purchase'
  if (result.error && !['sale', 'purchase'].includes(dbType)) {
    const legacyType = (transaction.type === 'Purchase' || transaction.type === 'Payment Transfer' || transaction.type === 'Payment') ? 'purchase' : 'sale';
    const legacyPayload = {
      ...payload,
      p_transaction_type: legacyType,
    };
    result = transaction.id
      ? await supabase.rpc('update_party_transaction', { p_transaction_id: transaction.id, ...legacyPayload })
      : await supabase.rpc('create_party_transaction', legacyPayload);
  }

  if (result.error) dbError(result.error);
  const transactionId = typeof result.data === 'string' ? result.data : transaction.id;
  if (!transactionId) throw new Error('The database did not return the saved transaction.');

  const primary = await supabase
    .from('transactions')
    .select('id, transaction_no, transaction_date, party_id, transaction_type, narration, amount, parties(name, party_type), transaction_items(id, item_name, quantity, unit, rate)')
    .eq('id', transactionId)
    .single();

  if (!primary.error && primary.data) {
    return mapTransaction(primary.data as unknown as DbTransaction);
  }

  const secondary = await supabase
    .from('transactions')
    .select('id, transaction_no, transaction_date, party_id, transaction_type, narration, parties(name), transaction_items(id, item_name, quantity, unit, rate)')
    .eq('id', transactionId)
    .single();

  if (secondary.error) dbError(secondary.error);
  return mapTransaction(secondary.data as unknown as DbTransaction);
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_party_transaction', { p_transaction_id: id });
  if (error) {
    // Fallback: update soft-delete column directly if RPC is not yet updated
    const { error: updErr } = await supabase
      .from('transactions')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (updErr) dbError(error);
  }
}

export async function restoreTransaction(id: string): Promise<void> {
  const { error } = await supabase.rpc('restore_party_transaction', { p_transaction_id: id });
  if (error) {
    const { error: updErr } = await supabase
      .from('transactions')
      .update({ is_deleted: false, deleted_at: null, deleted_by: null })
      .eq('id', id);
    if (updErr) dbError(updErr);
  }
}

export async function restoreParty(id: string): Promise<void> {
  const { error } = await supabase.rpc('restore_party', { p_party_id: id });
  if (error) {
    const { error: updErr } = await supabase
      .from('parties')
      .update({ is_deleted: false, is_active: true, deleted_at: null, deleted_by: null })
      .eq('id', id);
    if (updErr) dbError(updErr);
  }
}

export async function deleteParty(
  idOrName: string,
  deleteRelatedTransactions = false,
  partyName?: string
): Promise<void> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrName);
  let actualId: string | null = isUuid ? idOrName : null;
  let actualName = (partyName || (!isUuid ? idOrName : '')).trim();

  // If actualId is known but not actualName, or vice-versa, resolve from DB
  if (actualId && !actualName) {
    const { data: p } = await supabase
      .from('parties')
      .select('name')
      .eq('id', actualId)
      .maybeSingle();
    if (p?.name) actualName = p.name;
  } else if (!actualId && actualName) {
    const { data: p } = await supabase
      .from('parties')
      .select('id, name')
      .ilike('name', actualName)
      .limit(1);
    if (p && p.length > 0 && p[0]?.id) {
      actualId = String(p[0].id);
      actualName = String(p[0].name);
    }
  }

  // 1. Try dedicated database RPC if available
  if (actualId) {
    try {
      const { error: rpcErr } = await supabase.rpc('delete_party', {
        p_party_id: actualId,
        p_delete_transactions: deleteRelatedTransactions,
      });
      if (!rpcErr) {
        return;
      }
    } catch {
      // Fall through to client fallback
    }
  }

  // 2. Fallback: If deleteRelatedTransactions is true, delete all transactions using delete_party_transaction RPC
  if (deleteRelatedTransactions) {
    const matchingTxnIds = new Set<string>();

    if (actualId) {
      const { data: primaryTxns } = await supabase
        .from('transactions')
        .select('id')
        .eq('party_id', actualId);
      for (const t of primaryTxns || []) {
        if (t?.id) matchingTxnIds.add(String(t.id));
      }

      const { data: transferTxns } = await supabase
        .from('transactions')
        .select('id')
        .ilike('narration', `%|id:${actualId}%`);
      for (const t of transferTxns || []) {
        if (t?.id) matchingTxnIds.add(String(t.id));
      }
    }

    if (actualName) {
      const { data: nameTxns } = await supabase
        .from('transactions')
        .select('id')
        .ilike('narration', `%${actualName}%`);
      for (const t of nameTxns || []) {
        if (t?.id) matchingTxnIds.add(String(t.id));
      }
    }

    // Call authorized delete_party_transaction RPC for each transaction
    for (const txnId of matchingTxnIds) {
      try {
        await deleteTransaction(txnId);
      } catch (err) {
        console.warn(`Could not delete transaction ${txnId}:`, err);
      }
    }
  }

  // 3. Remove or deactivate party record
  if (actualId) {
    if (deleteRelatedTransactions) {
      // Attempt hard delete first
      const { error: deleteErr } = await supabase.from('parties').delete().eq('id', actualId);
      if (deleteErr) {
        // If FK constraint or RLS blocks hard delete, soft-delete
        const { error: softErr } = await supabase
          .from('parties')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', actualId);
        if (softErr) dbError(softErr);
      }
    } else {
      // Soft-delete: mark inactive so historical ledger stays intact
      const { error: softErr } = await supabase
        .from('parties')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', actualId);
      if (softErr) dbError(softErr);
    }
  } else if (actualName) {
    // Party was not previously registered in parties table (created on the fly in transactions)
    // Mark as inactive so calculations and search know it is deleted
    const { error: insertErr } = await supabase
      .from('parties')
      .insert({ name: actualName, is_active: false });
    if (insertErr) {
      await supabase.from('parties').update({ is_active: false }).ilike('name', actualName);
    }
  }
}

// ==========================================
// OPENING HAND CASH DATA MANAGEMENT
// ==========================================

export const OPENING_CASH_STORAGE_KEY = 'rg_opening_hand_cash_v1';
export const OPENING_CASH_NOTES_KEY = 'rg_opening_hand_cash_notes_v1';
export const OPENING_CASH_UPDATED_AT_KEY = 'rg_opening_hand_cash_updated_at_v1';

export function getLocalOpeningHandCash(): number {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(OPENING_CASH_STORAGE_KEY);
      if (raw != null) {
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? round2(parsed) : 0;
      }
    }
  } catch {
    // ignore
  }
  return 0;
}

export function setLocalOpeningHandCash(amount: number, notes?: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(OPENING_CASH_STORAGE_KEY, String(amount));
      if (notes !== undefined) {
        localStorage.setItem(OPENING_CASH_NOTES_KEY, notes);
      }
      localStorage.setItem(OPENING_CASH_UPDATED_AT_KEY, new Date().toISOString());
    }
  } catch {
    // ignore
  }
}

export async function loadOpeningHandCash(): Promise<number> {
  // 1. Try atomic RPC get_opening_hand_cash
  try {
    const { data, error } = await supabase.rpc('get_opening_hand_cash');
    if (!error && data !== null && data !== undefined) {
      const amount = asNumber(data);
      setLocalOpeningHandCash(amount);
      return amount;
    }
  } catch {
    // RPC might not exist yet or connection issue
  }

  // 2. Direct select on opening_cash_settings table
  try {
    const { data, error } = await supabase
      .from('opening_cash_settings')
      .select('amount, notes, updated_at')
      .eq('id', 'current')
      .maybeSingle();

    if (!error && data && data.amount !== null && data.amount !== undefined) {
      const amount = asNumber(data.amount);
      setLocalOpeningHandCash(amount, data.notes || undefined);
      return amount;
    }
  } catch {
    // Table might not exist yet or connection issue
  }

  // 3. Seamless fallback to local storage
  return getLocalOpeningHandCash();
}

export async function saveOpeningHandCash(amount: number, notes?: string): Promise<void> {
  const numAmount = round2(asNumber(amount));
  if (numAmount < 0) {
    throw new Error('Opening hand cash must be a non-negative number.');
  }

  // Optimistically and locally persist immediately
  setLocalOpeningHandCash(numAmount, notes);

  let rpcSuccess = false;
  // 1. Try atomic RPC set_opening_hand_cash (checks profiles.role = 'admin')
  try {
    const { data, error } = await supabase.rpc('set_opening_hand_cash', {
      p_amount: numAmount,
      p_notes: notes || null,
    });
    if (!error && data) {
      rpcSuccess = true;
    } else if (error) {
      // If unauthorized, re-throw exception so UI can display proper error
      if (error.message?.includes('Not authorized') || error.message?.includes('Admin privileges required')) {
        throw new Error(error.message);
      }
      console.warn('RPC set_opening_hand_cash error:', error.message);
    }
  } catch (err) {
    if (err instanceof Error && (err.message.includes('Not authorized') || err.message.includes('Admin privileges required'))) {
      throw err;
    }
    console.warn('RPC set_opening_hand_cash threw:', err);
  }

  if (rpcSuccess) return;

  // 2. Direct table fallback
  try {
    const now = new Date().toISOString();
    const { error: upsertErr } = await supabase
      .from('opening_cash_settings')
      .upsert({
        id: 'current',
        amount: numAmount,
        notes: notes || null,
        updated_at: now,
      });

    if (!upsertErr) {
      try {
        await supabase.from('opening_cash_history').insert({
          amount: numAmount,
          notes: notes || null,
          created_at: now,
        });
      } catch {
        // ignore history insert error
      }
      return;
    }
  } catch (err) {
    console.warn('Direct opening_cash_settings update threw:', err);
  }

  // Local fallback has already been set
}

// ==========================================
// SUSPENSE ACCOUNT DATA MANAGEMENT
// ==========================================

const SUSPENSE_ENTRIES_KEY = 'rg_suspense_entries_v1';
const SUSPENSE_CLAIMS_KEY = 'rg_suspense_claims_v1';

function getLocalSuspenseEntries(): SuspenseEntry[] {
  try {
    const raw = localStorage.getItem(SUSPENSE_ENTRIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalSuspenseEntries(entries: SuspenseEntry[]) {
  try {
    localStorage.setItem(SUSPENSE_ENTRIES_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

function getLocalSuspenseClaims(): SuspenseClaim[] {
  try {
    const raw = localStorage.getItem(SUSPENSE_CLAIMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalSuspenseClaims(claims: SuspenseClaim[]) {
  try {
    localStorage.setItem(SUSPENSE_CLAIMS_KEY, JSON.stringify(claims));
  } catch {
    // ignore
  }
}

function generateEntryNo(): string {
  const d = new Date();
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SUS-${dateStr}-${rand}`;
}

function generateClaimNo(): string {
  const d = new Date();
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CLM-${dateStr}-${rand}`;
}

export async function loadSuspenseClaims(entryId?: string): Promise<SuspenseClaim[]> {
  try {
    let query = supabase
      .from('suspense_claims')
      .select('id, claim_no, suspense_entry_id, party_id, transaction_id, claim_date, amount, narration, reference_no, is_reversed, reversal_reason, created_at, parties(name)')
      .order('created_at', { ascending: false });

    if (entryId) {
      query = query.eq('suspense_entry_id', entryId);
    }

    const { data, error } = await query;
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        const local = getLocalSuspenseClaims();
        return entryId ? local.filter((c) => c.suspenseEntryId === entryId) : local;
      }
      dbError(error);
    }

    if (data) {
      const mapped: SuspenseClaim[] = data.map((rowRecord) => {
        const row = rowRecord as Record<string, unknown>;
        const party = Array.isArray(row.parties) ? row.parties[0] : row.parties;
        return {
          id: String(row.id),
          claimNo: (row.claim_no as string) || '',
          suspenseEntryId: String(row.suspense_entry_id),
          partyId: String(row.party_id),
          partyName: (party as { name?: string })?.name || '',
          transactionId: row.transaction_id ? String(row.transaction_id) : undefined,
          claimDate: (row.claim_date as string) || '',
          amount: Number(row.amount || 0),
          narration: (row.narration as string) || '',
          referenceNo: (row.reference_no as string) || '',
          isReversed: Boolean(row.is_reversed),
          reversalReason: (row.reversal_reason as string) || '',
          createdAt: (row.created_at as string) || '',
        };
      });
      if (!entryId) setLocalSuspenseClaims(mapped);
      return mapped;
    }
  } catch {
    // fallback
  }

  const local = getLocalSuspenseClaims();
  return entryId ? local.filter((c) => c.suspenseEntryId === entryId) : local;
}

export async function loadSuspenseEntries(): Promise<SuspenseEntry[]> {
  const allClaims = await loadSuspenseClaims();

  try {
    const { data, error } = await supabase
      .from('suspense_entries')
      .select('id, entry_no, entry_date, amount, narration, reference_no, status, claimed_amount, available_amount, created_at')
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        const local = getLocalSuspenseEntries();
        return local.map((e) => recalculateSuspenseEntry(e, allClaims));
      }
      dbError(error);
    }

    if (data) {
      const mapped: SuspenseEntry[] = data.map((rowRecord) => {
        const row = rowRecord as Record<string, unknown>;
        const entry: SuspenseEntry = {
          id: String(row.id),
          entryNo: (row.entry_no as string) || '',
          date: (row.entry_date as string) || '',
          amount: Number(row.amount || 0),
          narration: (row.narration as string) || '',
          referenceNo: (row.reference_no as string) || '',
          status: (row.status as SuspenseEntry['status']) || 'unclaimed',
          claimedAmount: Number(row.claimed_amount || 0),
          availableAmount: Number(row.available_amount || 0),
          claims: [],
          createdAt: (row.created_at as string) || '',
        };
        return recalculateSuspenseEntry(entry, allClaims);
      });
      setLocalSuspenseEntries(mapped);
      return mapped;
    }
  } catch {
    // fallback
  }

  const local = getLocalSuspenseEntries();
  return local.map((e) => recalculateSuspenseEntry(e, allClaims));
}

export async function createSuspenseEntry(entry: {
  date: string;
  amount: number;
  narration: string;
  referenceNo?: string;
}): Promise<SuspenseEntry> {
  const amount = round2(Number(entry.amount) || 0);
  if (amount <= 0) throw new Error('Suspense amount must be greater than zero.');

  const entryNo = generateEntryNo();
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `sus-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  const newEntry: SuspenseEntry = {
    id,
    entryNo,
    date: entry.date,
    amount,
    narration: (entry.narration || '').trim(),
    referenceNo: (entry.referenceNo || '').trim(),
    status: 'unclaimed',
    claimedAmount: 0,
    availableAmount: amount,
    claims: [],
    createdAt: now,
  };

  try {
    const { data, error } = await supabase
      .from('suspense_entries')
      .insert({
        id,
        entry_no: entryNo,
        entry_date: entry.date,
        amount,
        narration: newEntry.narration,
        reference_no: newEntry.referenceNo || null,
        status: 'unclaimed',
        claimed_amount: 0,
        available_amount: amount,
      })
      .select()
      .single();

    if (!error && data) {
      newEntry.id = String(data.id);
      newEntry.entryNo = data.entry_no || entryNo;
      newEntry.createdAt = data.created_at || now;
    }
  } catch {
    // table doesn't exist yet, stored in localStorage
  }

  const local = getLocalSuspenseEntries();
  setLocalSuspenseEntries([newEntry, ...local]);
  return newEntry;
}

export async function claimSuspenseEntry(
  claimData: {
    suspenseEntryId: string;
    partyId: string;
    partyName?: string;
    claimDate: string;
    amount: number;
    narration?: string;
    referenceNo?: string;
  },
  parties: Party[]
): Promise<{ claim: SuspenseClaim; entry: SuspenseEntry; transaction?: Transaction }> {
  const claimAmount = round2(Number(claimData.amount) || 0);
  if (claimAmount <= 0) throw new Error('Claim amount must be greater than zero.');

  const party = parties.find((p) => p.id === claimData.partyId || normalizeParty(p.name) === normalizeParty(claimData.partyName || ''));
  const resolvedPartyId = party?.id || claimData.partyId;
  const resolvedPartyName = party?.name || claimData.partyName || 'Identified Party';

  // 1. Try atomic RPC claim_suspense_entry first
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('claim_suspense_entry', {
      p_suspense_entry_id: claimData.suspenseEntryId,
      p_party_id: resolvedPartyId,
      p_claim_date: claimData.claimDate,
      p_amount: claimAmount,
      p_narration: claimData.narration || null,
      p_reference_no: claimData.referenceNo || null,
    });

    if (!rpcErr && rpcData) {
      const claimId = String(rpcData.claim_id);
      const claimNo = String(rpcData.claim_no);
      const transactionId = rpcData.transaction_id ? String(rpcData.transaction_id) : undefined;
      const now = new Date().toISOString();

      const newClaim: SuspenseClaim = {
        id: claimId,
        claimNo,
        suspenseEntryId: claimData.suspenseEntryId,
        partyId: resolvedPartyId,
        partyName: resolvedPartyName,
        transactionId,
        claimDate: claimData.claimDate,
        amount: claimAmount,
        narration: claimData.narration || '',
        referenceNo: claimData.referenceNo || rpcData.reference_no || '',
        isReversed: false,
        createdAt: now,
      };

      const localClaims = getLocalSuspenseClaims();
      setLocalSuspenseClaims([newClaim, ...localClaims]);

      const entries = await loadSuspenseEntries();
      let updatedEntry = entries.find((e) => e.id === claimData.suspenseEntryId);
      if (!updatedEntry) {
        const local = getLocalSuspenseEntries().find((e) => e.id === claimData.suspenseEntryId);
        if (local) {
          updatedEntry = {
            ...local,
            claimedAmount: asNumber(rpcData.new_claimed_amount ?? (local.claimedAmount + claimAmount)),
            availableAmount: asNumber(rpcData.new_available_amount ?? (local.availableAmount - claimAmount)),
            status: (rpcData.new_status as 'unclaimed' | 'partially_claimed' | 'fully_claimed') || (local.availableAmount - claimAmount <= 0.005 ? 'fully_claimed' : 'partially_claimed'),
          };
        }
      }

      if (updatedEntry) {
        const localEntries = getLocalSuspenseEntries();
        setLocalSuspenseEntries(localEntries.map((e) => (e.id === updatedEntry!.id ? updatedEntry! : e)));
      }

      let linkedTransaction: Transaction | undefined;
      if (transactionId) {
        try {
          const { data: txnData } = await supabase
            .from('transactions')
            .select('id, transaction_no, transaction_date, party_id, transaction_type, narration, amount, parties(name, party_type), transaction_items(id, item_name, quantity, unit, rate)')
            .eq('id', transactionId)
            .maybeSingle();

          if (txnData) {
            linkedTransaction = mapTransaction(txnData as unknown as DbTransaction);
          }
        } catch {
          // ignore
        }
        if (!linkedTransaction) {
          linkedTransaction = {
            id: transactionId,
            date: claimData.claimDate,
            partyId: resolvedPartyId,
            partyName: resolvedPartyName,
            type: 'Receipt',
            itemName: 'Receipt Voucher',
            quantity: 0,
            ratePerUnit: 0,
            totalAmount: claimAmount,
            amount: claimAmount,
            narration: `[Suspense Claim: ${claimNo} | Entry: ${claimData.suspenseEntryId}] ${claimData.narration || ''}`.trim(),
            items: [],
            referenceNo: claimData.referenceNo,
          };
        }
      }

      return {
        claim: newClaim,
        entry: updatedEntry || {
          id: claimData.suspenseEntryId,
          entryNo: '',
          date: claimData.claimDate,
          amount: claimAmount,
          narration: '',
          status: 'partially_claimed',
          claimedAmount: claimAmount,
          availableAmount: 0,
          claims: [newClaim],
          createdAt: now,
        },
        transaction: linkedTransaction,
      };
    } else if (rpcErr) {
      if (rpcErr.message?.includes('exceeds available') || rpcErr.message?.includes('greater than zero') || rpcErr.message?.includes('Not authorized')) {
        throw new Error(rpcErr.message);
      }
      console.warn('RPC claim_suspense_entry returned error, falling back:', rpcErr.message);
    }
  } catch (err) {
    if (err instanceof Error && (err.message.includes('exceeds available') || err.message.includes('greater than zero') || err.message.includes('Not authorized'))) {
      throw err;
    }
    console.warn('RPC claim_suspense_entry threw, falling back to local multi-step:', err);
  }

  // 2. Seamless local / multi-call fallback
  const entries = await loadSuspenseEntries();
  const targetEntry = entries.find((e) => e.id === claimData.suspenseEntryId);
  if (!targetEntry) throw new Error('Suspense entry not found.');

  if (claimAmount > round2(targetEntry.availableAmount) + 0.005) {
    throw new Error(
      `Claim amount (₹${claimAmount.toLocaleString('en-IN')}) exceeds available balance (₹${targetEntry.availableAmount.toLocaleString('en-IN')}).`
    );
  }

  const claimNo = generateClaimNo();
  const claimId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `clm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  // Create linked transaction for the party with type === 'Receipt' and empty items
  let linkedTransaction: Transaction | undefined;
  try {
    const claimNarration = `[Suspense Claim: ${claimNo} | Entry: ${targetEntry.entryNo}] ${claimData.narration || targetEntry.narration || ''}`.trim();
    linkedTransaction = await saveTransaction({
      id: '',
      date: claimData.claimDate,
      partyId: resolvedPartyId,
      partyName: resolvedPartyName,
      type: 'Receipt',
      itemName: 'Receipt Voucher',
      quantity: 0,
      ratePerUnit: 0,
      totalAmount: claimAmount,
      amount: claimAmount,
      narration: claimNarration,
      referenceNo: claimData.referenceNo || targetEntry.referenceNo,
      items: [], // CRITICAL: no phantom items
    }, parties);
  } catch (err) {
    console.error('Failed to create linked ledger transaction:', err);
  }

  const newClaim: SuspenseClaim = {
    id: claimId,
    claimNo,
    suspenseEntryId: targetEntry.id,
    partyId: resolvedPartyId,
    partyName: resolvedPartyName,
    transactionId: linkedTransaction?.id,
    claimDate: claimData.claimDate,
    amount: claimAmount,
    narration: claimData.narration || '',
    referenceNo: claimData.referenceNo || targetEntry.referenceNo || '',
    isReversed: false,
    createdAt: now,
  };

  try {
    const { error: insertErr } = await supabase.from('suspense_claims').insert({
      id: claimId,
      claim_no: claimNo,
      suspense_entry_id: targetEntry.id,
      party_id: resolvedPartyId,
      transaction_id: linkedTransaction?.id || null,
      claim_date: claimData.claimDate,
      amount: claimAmount,
      narration: newClaim.narration || null,
      reference_no: newClaim.referenceNo || null,
      is_reversed: false,
    });
    if (insertErr) {
      console.warn('Could not insert suspense claim to Supabase:', insertErr.message);
    }
  } catch (err) {
    console.warn('Suspense claim insert error:', err);
  }

  const localClaims = getLocalSuspenseClaims();
  setLocalSuspenseClaims([newClaim, ...localClaims]);

  const allClaims = await loadSuspenseClaims();
  const updatedEntry = recalculateSuspenseEntry(targetEntry, allClaims);

  try {
    await supabase
      .from('suspense_entries')
      .update({
        claimed_amount: updatedEntry.claimedAmount,
        available_amount: updatedEntry.availableAmount,
        status: updatedEntry.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetEntry.id);
  } catch {
    // table might not exist
  }

  const localEntries = getLocalSuspenseEntries();
  setLocalSuspenseEntries(localEntries.map((e) => (e.id === updatedEntry.id ? updatedEntry : e)));

  return {
    claim: newClaim,
    entry: updatedEntry,
    transaction: linkedTransaction,
  };
}

export async function reverseSuspenseClaim(
  claimId: string,
  reason: string,
  _parties?: Party[]
): Promise<{ claim: SuspenseClaim; entry: SuspenseEntry }> {
  void _parties;
  const reversalReason = (reason || 'Reversed by user').trim();
  const now = new Date().toISOString();

  // 1. Try atomic RPC reverse_suspense_claim first
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('reverse_suspense_claim', {
      p_claim_id: claimId,
      p_reversal_reason: reversalReason,
    });

    if (!rpcErr && rpcData) {
      const suspenseEntryId = String(rpcData.suspense_entry_id);
      const localClaims = getLocalSuspenseClaims();
      const updatedClaims = localClaims.map((c) =>
        c.id === claimId
          ? { ...c, isReversed: true, reversalReason, reversedAt: now }
          : c
      );
      setLocalSuspenseClaims(updatedClaims);

      const entries = await loadSuspenseEntries();
      let updatedEntry = entries.find((e) => e.id === suspenseEntryId);
      if (!updatedEntry) {
        const local = getLocalSuspenseEntries().find((e) => e.id === suspenseEntryId);
        if (local) {
          updatedEntry = {
            ...local,
            claimedAmount: asNumber(rpcData.new_claimed_amount ?? 0),
            availableAmount: asNumber(rpcData.new_available_amount ?? local.amount),
            status: (rpcData.new_status as 'unclaimed' | 'partially_claimed' | 'fully_claimed') || 'unclaimed',
          };
        }
      }

      if (updatedEntry) {
        const localEntries = getLocalSuspenseEntries();
        setLocalSuspenseEntries(localEntries.map((e) => (e.id === updatedEntry!.id ? updatedEntry! : e)));
      }

      const targetClaim = updatedClaims.find((c) => c.id === claimId) || {
        id: claimId,
        claimNo: '',
        suspenseEntryId,
        partyId: '',
        claimDate: '',
        amount: 0,
        isReversed: true,
        reversalReason,
        createdAt: now,
      };

      return {
        claim: targetClaim,
        entry: updatedEntry || {
          id: suspenseEntryId,
          entryNo: '',
          date: '',
          amount: 0,
          narration: '',
          status: 'unclaimed',
          claimedAmount: 0,
          availableAmount: 0,
          claims: updatedClaims.filter((c) => c.suspenseEntryId === suspenseEntryId),
          createdAt: now,
        },
      };
    } else if (rpcErr) {
      if (rpcErr.message?.includes('already been reversed') || rpcErr.message?.includes('Claim not found') || rpcErr.message?.includes('Not authorized')) {
        throw new Error(rpcErr.message);
      }
      console.warn('RPC reverse_suspense_claim returned error, falling back:', rpcErr.message);
    }
  } catch (err) {
    if (err instanceof Error && (err.message.includes('already been reversed') || err.message.includes('Claim not found') || err.message.includes('Not authorized'))) {
      throw err;
    }
    console.warn('RPC reverse_suspense_claim threw, falling back to local multi-step:', err);
  }

  // 2. Fallback multi-step
  const claims = await loadSuspenseClaims();
  const targetClaim = claims.find((c) => c.id === claimId);
  if (!targetClaim) throw new Error('Claim not found.');
  if (targetClaim.isReversed) throw new Error('This claim has already been reversed.');

  // 1. Delete linked transaction if exists
  if (targetClaim.transactionId) {
    try {
      await deleteTransaction(targetClaim.transactionId);
    } catch (err) {
      console.warn('Could not delete linked transaction on claim reversal:', err);
    }
  }

  // 2. Mark claim reversed in Supabase
  try {
    await supabase
      .from('suspense_claims')
      .update({
        is_reversed: true,
        reversal_reason: reversalReason,
        reversed_at: now,
      })
      .eq('id', claimId);
  } catch {
    // fallback
  }

  // Update local claims
  const localClaims = getLocalSuspenseClaims();
  const updatedClaims = localClaims.map((c) =>
    c.id === claimId
      ? { ...c, isReversed: true, reversalReason, reversedAt: now }
      : c
  );
  setLocalSuspenseClaims(updatedClaims);

  // 3. Recalculate entry
  const allClaims = await loadSuspenseClaims();
  const entries = await loadSuspenseEntries();
  const targetEntry = entries.find((e) => e.id === targetClaim.suspenseEntryId);
  if (!targetEntry) throw new Error('Associated suspense entry not found.');

  const updatedEntry = recalculateSuspenseEntry(targetEntry, allClaims);

  try {
    await supabase
      .from('suspense_entries')
      .update({
        claimed_amount: updatedEntry.claimedAmount,
        available_amount: updatedEntry.availableAmount,
        status: updatedEntry.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetEntry.id);
  } catch {
    // ignore
  }

  const localEntries = getLocalSuspenseEntries();
  setLocalSuspenseEntries(localEntries.map((e) => (e.id === updatedEntry.id ? updatedEntry : e)));

  return {
    claim: { ...targetClaim, isReversed: true, reversalReason },
    entry: updatedEntry,
  };
}

export async function loadAuditLogs(limit = 200): Promise<AuditLogEntry[]> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.map((row) => ({
      id: String(row.id),
      tableName: String(row.table_name),
      recordId: String(row.record_id),
      action: row.action as AuditLogEntry['action'],
      oldData: (row.old_data as Record<string, unknown>) ?? null,
      newData: (row.new_data as Record<string, unknown>) ?? null,
      performedBy: row.performed_by ? String(row.performed_by) : undefined,
      createdAt: String(row.created_at),
    }));
  } catch {
    return [];
  }
}

export async function exportFullDatabaseVault(): Promise<DatabaseVaultSnapshot> {
  const [transactions, parties, suspenseEntries, suspenseClaims, openingCash, auditLogs] = await Promise.all([
    loadTransactions(),
    loadParties(),
    loadSuspenseEntries(),
    loadSuspenseClaims(),
    loadOpeningHandCash(),
    loadAuditLogs(500),
  ]);

  const deletedTxnCount = transactions.filter((t) => t.isDeleted).length;

  return {
    exportedAt: new Date().toISOString(),
    system: 'RG Plastics Management & Accounting Vault',
    version: '1.0.0',
    counts: {
      transactions: transactions.length,
      deletedTransactions: deletedTxnCount,
      parties: parties.length,
      suspenseEntries: suspenseEntries.length,
      suspenseClaims: suspenseClaims.length,
      auditLogs: auditLogs.length,
    },
    transactions,
    parties,
    suspenseEntries,
    suspenseClaims,
    openingCashSetting: openingCash,
    auditLogs,
  };
}

export function downloadVaultJSON(snapshot: DatabaseVaultSnapshot): void {
  const dateStr = new Date().toISOString().slice(0, 10);
  const jsonContent = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rg-plastics-vault-backup-${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

