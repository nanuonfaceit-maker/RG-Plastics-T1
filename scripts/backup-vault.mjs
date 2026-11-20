/**
 * Zero-Cost Vault Backup Script
 * Fetches all tables (including soft-deleted records and audit logs) from Supabase
 * and saves a compressed or formatted JSON file.
 *
 * Can be run manually: node scripts/backup-vault.mjs
 * Or automatically via GitHub Actions every night.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase URL or Key in environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchTable(name) {
  try {
    const { data, error } = await supabase.from(name).select('*');
    if (error) {
      console.warn(`Warning: Could not fetch table "${name}":`, error.message);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.warn(`Warning: Exception fetching table "${name}":`, err.message);
    return [];
  }
}

async function run() {
  console.log('Initiating RG Plastics database backup...');
  const timestamp = new Date().toISOString();
  const dateStr = timestamp.slice(0, 10);

  const [
    parties,
    transactions,
    transactionItems,
    suspenseEntries,
    suspenseClaims,
    openingCashSettings,
    openingCashHistory,
    auditLogs,
  ] = await Promise.all([
    fetchTable('parties'),
    fetchTable('transactions'),
    fetchTable('transaction_items'),
    fetchTable('suspense_entries'),
    fetchTable('suspense_claims'),
    fetchTable('opening_cash_settings'),
    fetchTable('opening_cash_history'),
    fetchTable('audit_logs'),
  ]);

  const deletedTxnCount = transactions.filter((t) => t.is_deleted).length;

  const backupData = {
    metadata: {
      system: 'RG Plastics Business Management & Accounting',
      exportedAt: timestamp,
      version: '1.0.0',
      totalRecords: {
        parties: parties.length,
        transactions: transactions.length,
        deletedTransactions: deletedTxnCount,
        transactionItems: transactionItems.length,
        suspenseEntries: suspenseEntries.length,
        suspenseClaims: suspenseClaims.length,
        openingCashSettings: openingCashSettings.length,
        openingCashHistory: openingCashHistory.length,
        auditLogs: auditLogs.length,
      },
    },
    tables: {
      parties,
      transactions,
      transactionItems,
      suspenseEntries,
      suspenseClaims,
      openingCashSettings,
      openingCashHistory,
      auditLogs,
    },
  };

  const outDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const jsonStr = JSON.stringify(backupData, null, 2);
  const outJsonPath = path.join(outDir, `rg-backup-${dateStr}.json`);
  const outGzPath = path.join(outDir, `rg-backup-${dateStr}.json.gz`);

  fs.writeFileSync(outJsonPath, jsonStr, 'utf-8');
  const compressed = zlib.gzipSync(Buffer.from(jsonStr, 'utf-8'));
  fs.writeFileSync(outGzPath, compressed);

  console.log(`Backup completed successfully!`);
  console.log(`- JSON File: ${outJsonPath} (${(jsonStr.length / 1024).toFixed(1)} KB)`);
  console.log(`- Compressed: ${outGzPath} (${(compressed.length / 1024).toFixed(1)} KB)`);
  console.log(`- Transactions backed up: ${transactions.length} (${deletedTxnCount} deleted/archived)`);
}

run().catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});
