import { useLiveQuery } from 'dexie-react-hooks';
import type { YearMonth } from '../domain/types';
import { DEFAULT_SETTINGS } from '../domain/types';
import { getSettings, listBudgets, listCategories, listTransactionsInPeriod } from '../db/repository';

/**
 * DB の内容をリアクティブに購読するフック群。DB が更新されると自動で再描画される。
 * 読み込み中は undefined を返す（settings のみ既定値）。
 */

export function useSettings() {
  return useLiveQuery(getSettings, []) ?? DEFAULT_SETTINGS;
}

export function useCategories(options: { includeArchived?: boolean } = {}) {
  const includeArchived = options.includeArchived ?? false;
  return useLiveQuery(() => listCategories({ includeArchived }), [includeArchived]);
}

export function useTransactions(ym: YearMonth) {
  return useLiveQuery(() => listTransactionsInPeriod(ym), [ym]);
}

export function useBudgets(ym: YearMonth) {
  return useLiveQuery(() => listBudgets(ym), [ym]);
}
