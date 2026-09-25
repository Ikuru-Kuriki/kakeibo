import type { Id, RecurringRule, Subcategory, Transaction } from '../domain/types';
import { newMeta } from './meta';

/**
 * データ形式の変換（純粋関数）。DB のバージョンアップ（db.ts）と
 * 古いバックアップの読み込み（backup.ts）の両方で同じ変換を使う。
 */

/** v3 の固定費（名前を持つ） */
export type RecurringRuleV3 = Omit<RecurringRule, 'subcategoryId'> & { name: string };

/**
 * v3 → v4: 固定費の「名前」を小分類にする。
 * - 固定費ごとに、同じカテゴリ・同じ名前の小分類を作り（重複はまとめる）、固定費は小分類を参照する
 * - その固定費から確定した取引にも小分類を付け、メモが名前と同じならメモは空にする（小分類として表示されるため）
 */
export function migrateRecurringNamesToSubcategories(
  rules: readonly RecurringRuleV3[],
  transactions: readonly Transaction[],
  existing: readonly Subcategory[] = [],
): { rules: RecurringRule[]; subcategories: Subcategory[]; transactions: Transaction[] } {
  const subcategories = [...existing];
  const find = (categoryId: Id, name: string) =>
    subcategories.find((s) => s.categoryId === categoryId && s.name === name && s.deletedAt === null);

  const ruleToSub = new Map<Id, Id>();
  const ruleNames = new Map<Id, string>();
  const migratedRules = rules.map((r) => {
    const { name: rawName, ...rest } = r;
    const name = rawName.trim() || '（名前なし）';
    let sub = find(r.categoryId, name);
    if (!sub) {
      const order = subcategories.filter((s) => s.categoryId === r.categoryId).length;
      sub = { ...newMeta(), categoryId: r.categoryId, name, order, archived: false };
      subcategories.push(sub);
    }
    ruleToSub.set(r.id, sub.id);
    ruleNames.set(r.id, rawName);
    return { ...rest, subcategoryId: sub.id };
  });

  const migratedTransactions = transactions.map((t) => {
    const subId = t.recurringId ? ruleToSub.get(t.recurringId) : undefined;
    if (!subId) return t;
    const memo = t.memo === ruleNames.get(t.recurringId!) ? '' : t.memo;
    return { ...t, subcategoryId: subId, memo };
  });

  return { rules: migratedRules, subcategories, transactions: migratedTransactions };
}
