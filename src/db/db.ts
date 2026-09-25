import Dexie, { type EntityTable } from 'dexie';
import type { AppSettings, Budget, Category, Transaction } from '../domain/types';
import { DEFAULT_CATEGORIES } from './defaults';
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

  constructor(name = 'kakeibo') {
    super(name);
    this.version(1).stores({
      transactions: 'id, date, categoryId, updatedAt',
      categories: 'id, order, updatedAt',
      budgets: 'id, &[yearMonth+categoryId], yearMonth, updatedAt',
      settings: 'key',
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
