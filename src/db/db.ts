import Dexie, { type EntityTable } from 'dexie';
import type { AppSettings, Budget, Category, RecurringRule, Transaction } from '../domain/types';
import { DEFAULT_CATEGORIES, V1_DEFAULT_COLOR_MIGRATION } from './defaults';
import { newMeta } from './meta';

export interface SettingsRow extends AppSettings {
  key: 'app';
}

/**
 * IndexedDB スキーマ。
 * スキーマを変更するときは既存の version() を書き換えず、新しい version(n+1) を追加して
 * 必要なら .upgrade() でデータを移行する。バックアップの SCHEMA_VERSION も合わせて上げること。
 */
export class KakeiboDB extends Dexie {
  transactions!: EntityTable<Transaction, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  budgets!: EntityTable<Budget, 'id'>;
  settings!: EntityTable<SettingsRow, 'key'>;
  recurring!: EntityTable<RecurringRule, 'id'>;

  constructor(name = 'kakeibo') {
    super(name);
    this.version(1).stores({
      transactions: 'id, date, categoryId, updatedAt',
      categories: 'id, order, updatedAt',
      budgets: 'id, &[yearMonth+categoryId], yearMonth, updatedAt',
      settings: 'key',
    });

    // v2: 既定カテゴリの色を見分けやすい配色に変更（テーブル構造は同じ。ユーザーが変えた色はそのまま）
    this.version(2)
      .stores({})
      .upgrade(async (tx) => {
        await tx
          .table<Category, string>('categories')
          .toCollection()
          .modify((c) => {
            const m = V1_DEFAULT_COLOR_MIGRATION.find((x) => x.name === c.name && x.from === c.color);
            if (m) {
              c.color = m.to;
              c.updatedAt = new Date().toISOString();
            }
          });
      });

    // v3: 固定費（recurring）を追加。取引に固定費の ID の索引を追加
    this.version(3).stores({
      transactions: 'id, date, categoryId, updatedAt, recurringId',
      recurring: 'id, updatedAt',
    });

    this.on('populate', async (tx) => {
      await tx.table('categories').bulkAdd(
        DEFAULT_CATEGORIES.map((c, i) => ({ ...newMeta(), ...c, order: i, archived: false })),
      );
    });
  }
}

export const db = new KakeiboDB();

/** ブラウザにストレージの永続化を要求する（自動削除されにくくする） */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}

export type StorageStatus = 'persisted' | 'best-effort' | 'unsupported';

/** ブラウザがこのサイトのデータを「消さない」扱いにしているか */
export async function getStorageStatus(): Promise<StorageStatus> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persisted) return 'unsupported';
  return (await navigator.storage.persisted()) ? 'persisted' : 'best-effort';
}
