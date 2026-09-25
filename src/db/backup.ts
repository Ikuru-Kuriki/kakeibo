import type { Budget, Category, RecurringRule, Subcategory, Transaction } from '../domain/types';
import { migrateRecurringNamesToSubcategories, type RecurringRuleV3 } from './migrations';
import { db, type SettingsRow } from './db';
import { V1_DEFAULT_COLOR_MIGRATION } from './defaults';

/**
 * JSON バックアップ（エクスポート／インポート）。
 * 端末内保存はブラウザに消される可能性があるため、定期的なエクスポートを推奨する。
 * 論理削除済みの行も含めて丸ごと出力する（将来の同期・復元で使えるように）。
 */

export const BACKUP_FORMAT = 'kakeibo-backup';
/** DB スキーマを変えたら上げ、migrateBackup に変換を追加する */
export const SCHEMA_VERSION = 4;

export interface BackupData {
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  exportedAt: string;
  data: {
    transactions: Transaction[];
    categories: Category[];
    budgets: Budget[];
    settings: SettingsRow[];
    recurring: RecurringRule[];
    subcategories: Subcategory[];
  };
}

export async function exportBackup(): Promise<BackupData> {
  return db.transaction('r', [db.transactions, db.categories, db.budgets, db.settings, db.recurring, db.subcategories], async () => ({
    format: BACKUP_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      transactions: await db.transactions.toArray(),
      categories: await db.categories.toArray(),
      budgets: await db.budgets.toArray(),
      settings: await db.settings.toArray(),
      recurring: await db.recurring.toArray(),
      subcategories: await db.subcategories.toArray(),
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
  if (backup.schemaVersion < 2) {
    // v2: 既定カテゴリの色変更（DB の version(2) と同じ変換）
    const categories = backup.data.categories.map((c) => {
      const m = V1_DEFAULT_COLOR_MIGRATION.find((x) => x.name === c.name && x.from === c.color);
      return m ? { ...c, color: m.to } : c;
    });
    backup = { ...backup, schemaVersion: 2, data: { ...backup.data, categories } };
  }
  if (backup.schemaVersion < 3) {
    // v3: 固定費を追加（v2 以前のバックアップには無い）
    backup = { ...backup, schemaVersion: 3, data: { ...backup.data, recurring: [] } };
  }
  if (backup.schemaVersion < 4) {
    // v4: 固定費の名前を小分類に移す（DB の version(4) と同じ変換）
    const result = migrateRecurringNamesToSubcategories(
      backup.data.recurring as unknown as RecurringRuleV3[],
      backup.data.transactions,
    );
    backup = {
      ...backup,
      schemaVersion: 4,
      data: { ...backup.data, ...result },
    };
  }
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
  assertRows('recurring', data.recurring ?? [], [...meta, 'type', 'categoryId', 'amount', 'dayOfMonth', 'startMonth']);
  assertRows('subcategories', data.subcategories ?? [], [...meta, 'categoryId', 'name']);
  return migrateBackup({
    format: BACKUP_FORMAT,
    schemaVersion: parsed.schemaVersion,
    exportedAt: String(parsed.exportedAt ?? ''),
    data: {
      transactions: data.transactions as Transaction[],
      categories: data.categories as Category[],
      budgets: data.budgets as Budget[],
      settings: (data.settings ?? []) as SettingsRow[],
      recurring: (data.recurring ?? []) as RecurringRule[],
      subcategories: (data.subcategories ?? []) as Subcategory[],
    },
  });
}

/** 現在のデータをすべて置き換えて復元する */
export async function importBackup(backup: BackupData): Promise<void> {
  const tables = [db.transactions, db.categories, db.budgets, db.settings, db.recurring, db.subcategories];
  await db.transaction('rw', tables, async () => {
    await Promise.all(tables.map((t) => t.clear()));
    await db.transactions.bulkAdd(backup.data.transactions);
    await db.categories.bulkAdd(backup.data.categories);
    await db.budgets.bulkAdd(backup.data.budgets);
    await db.settings.bulkAdd(backup.data.settings);
    await db.recurring.bulkAdd(backup.data.recurring);
    await db.subcategories.bulkAdd(backup.data.subcategories);
  });
}

export function backupFileName(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `kakeibo-backup-${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}.json`;
}
