import type { Budget, Category, Transaction } from '../domain/types';
import { db, type SettingsRow } from './db';

/**
 * JSON バックアップ（エクスポート／インポート）。
 * 端末内保存はブラウザに消される可能性があるため、定期的なエクスポートを推奨する。
 * 論理削除済みの行も含めて丸ごと出力する（将来の同期・復元で使えるように）。
 */

export const BACKUP_FORMAT = 'kakeibo-backup';
/** DB スキーマを変えたら上げ、migrateBackup に変換を追加する */
export const SCHEMA_VERSION = 1;

export interface BackupData {
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  exportedAt: string;
  data: {
    transactions: Transaction[];
    categories: Category[];
    budgets: Budget[];
    settings: SettingsRow[];
  };
}

export async function exportBackup(): Promise<BackupData> {
  return db.transaction('r', [db.transactions, db.categories, db.budgets, db.settings], async () => ({
    format: BACKUP_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      transactions: await db.transactions.toArray(),
      categories: await db.categories.toArray(),
      budgets: await db.budgets.toArray(),
      settings: await db.settings.toArray(),
    },
  }));
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function assertRows(name: string, rows: unknown, keys: string[]): void {
  if (!Array.isArray(rows)) throw new Error(`バックアップの ${name} が不正です`);
  for (const row of rows) {
    if (!isObject(row) || keys.some((k) => !(k in row))) {
      throw new Error(`バックアップの ${name} に不正な行があります`);
    }
  }
}

/** 古い形式のバックアップを現行形式へ変換する */
function migrateBackup(backup: BackupData): BackupData {
  if (backup.schemaVersion > SCHEMA_VERSION) {
    throw new Error('このバックアップは新しいバージョンのアプリで作成されています');
  }
  // 例: if (backup.schemaVersion < 2) { ...変換...; backup = { ...backup, schemaVersion: 2 } }
  return backup;
}

export function parseBackup(json: string): BackupData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('JSON として読み込めませんでした');
  }
  if (!isObject(parsed) || parsed.format !== BACKUP_FORMAT || typeof parsed.schemaVersion !== 'number') {
    throw new Error('家計簿のバックアップファイルではありません');
  }
  const data = parsed.data;
  if (!isObject(data)) throw new Error('バックアップのデータが不正です');
  const meta = ['id', 'createdAt', 'updatedAt', 'deletedAt'];
  assertRows('transactions', data.transactions, [...meta, 'date', 'amount', 'type', 'categoryId']);
  assertRows('categories', data.categories, [...meta, 'name', 'type', 'color', 'order']);
  assertRows('budgets', data.budgets, [...meta, 'yearMonth', 'categoryId', 'amount']);
  assertRows('settings', data.settings ?? [], ['key']);
  return migrateBackup({
    format: BACKUP_FORMAT,
    schemaVersion: parsed.schemaVersion,
    exportedAt: String(parsed.exportedAt ?? ''),
    data: {
      transactions: data.transactions as Transaction[],
      categories: data.categories as Category[],
      budgets: data.budgets as Budget[],
      settings: (data.settings ?? []) as SettingsRow[],
    },
  });
}

/** 現在のデータをすべて置き換えて復元する */
export async function importBackup(backup: BackupData): Promise<void> {
  await db.transaction('rw', [db.transactions, db.categories, db.budgets, db.settings], async () => {
    await Promise.all([db.transactions.clear(), db.categories.clear(), db.budgets.clear(), db.settings.clear()]);
    await db.transactions.bulkAdd(backup.data.transactions);
    await db.categories.bulkAdd(backup.data.categories);
    await db.budgets.bulkAdd(backup.data.budgets);
    await db.settings.bulkAdd(backup.data.settings);
  });
}

export function backupFileName(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `kakeibo-backup-${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}.json`;
}
