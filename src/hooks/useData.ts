import { useLiveQuery } from 'dexie-react-hooks';
import type { YearMonth } from '../domain/types';
import { DEFAULT_SETTINGS } from '../domain/types';
import {
  earliestTransactionDate,
  getSettings,
  listBudgets,
  listCategories,
  listPendingRecurring,
  listRecurring,
  listSubcategories,
  listTransactionsInPeriod,
} from '../db/repository';
import { currentPeriod } from '../domain/period';

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

/** 複数月の取引をまとめて購読する（月の順に配列で返す） */
export function useTransactionsForMonths(yms: readonly YearMonth[]) {
  const key = yms.join(',');
  return useLiveQuery(() => Promise.all(yms.map((ym) => listTransactionsInPeriod(ym))), [key]);
}

export function useRecurring() {
  return useLiveQuery(listRecurring, []);
}

/** 今月までの確認待ちの固定費 */
export function usePendingRecurring() {
  const { monthStartDay } = useSettings();
  const current = currentPeriod(monthStartDay);
  return useLiveQuery(() => listPendingRecurring(current), [current]);
}

export function useEarliestTransactionDate() {
  return useLiveQuery(earliestTransactionDate, []);
}

/** 複数月の予算をまとめて購読する（月の順に配列で返す） */
export function useBudgetsForMonths(yms: readonly YearMonth[]) {
  const key = yms.join(',');
  return useLiveQuery(() => Promise.all(yms.map((ym) => listBudgets(ym))), [key]);
}

export function useSubcategories(options: { includeArchived?: boolean } = {}) {
  const includeArchived = options.includeArchived ?? false;
  return useLiveQuery(() => listSubcategories({ includeArchived }), [includeArchived]);
}
