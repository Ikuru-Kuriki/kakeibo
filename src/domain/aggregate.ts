import type { Budget, Category, Id, Transaction } from './types';

/**
 * 集計ロジック（純粋関数）。DB に触れないので単体テストしやすい。
 * 呼び出し側で論理削除済みデータを除外して渡すこと。
 */

export interface CategoryTotal {
  categoryId: Id;
  amount: number;
}

export interface MonthSummary {
  income: number;
  expense: number;
  /** income - expense */
  balance: number;
  /** カテゴリ別合計（金額の降順） */
  incomeByCategory: CategoryTotal[];
  expenseByCategory: CategoryTotal[];
}

function sortedTotals(map: Map<Id, number>): CategoryTotal[] {
  return [...map.entries()]
    .map(([categoryId, amount]) => ({ categoryId, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function summarize(transactions: readonly Transaction[]): MonthSummary {
  const incomeMap = new Map<Id, number>();
  const expenseMap = new Map<Id, number>();
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    const map = t.type === 'income' ? incomeMap : expenseMap;
    map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  return {
    income,
    expense,
    balance: income - expense,
    incomeByCategory: sortedTotals(incomeMap),
    expenseByCategory: sortedTotals(expenseMap),
  };
}

export interface BudgetComparisonRow {
  categoryId: Id;
  /** 予算未設定なら null */
  planned: number | null;
  actual: number;
  /** planned - actual（予算未設定なら null） */
  remaining: number | null;
  /** actual / planned（予算未設定または 0 なら null） */
  ratio: number | null;
}

/**
 * 支出カテゴリごとの予算と実績の比較。
 * 予算があるカテゴリと、予算はないが実績があるカテゴリの両方を返す。
 * 並び順は categories の order に従う。
 */
export function compareBudget(
  categories: readonly Category[],
  budgets: readonly Budget[],
  transactions: readonly Transaction[],
): BudgetComparisonRow[] {
  const planned = new Map(budgets.map((b) => [b.categoryId, b.amount]));
  const actual = new Map(
    summarize(transactions).expenseByCategory.map((c) => [c.categoryId, c.amount]),
  );
  return categories
    .filter((c) => c.type === 'expense')
    .filter((c) => !c.archived || planned.has(c.id) || actual.has(c.id))
    .sort((a, b) => a.order - b.order)
    .map((c) => {
      const p = planned.get(c.id) ?? null;
      const a = actual.get(c.id) ?? 0;
      return {
        categoryId: c.id,
        planned: p,
        actual: a,
        remaining: p === null ? null : p - a,
        ratio: p ? a / p : null,
      };
    });
}

/** 複数月の実績からカテゴリ別の月平均支出を求める（予算設定の参考値） */
export function averageExpenseByCategory(
  monthlyTransactions: readonly (readonly Transaction[])[],
): Map<Id, number> {
  const months = monthlyTransactions.length;
  const totals = new Map<Id, number>();
  if (months === 0) return totals;
  for (const txs of monthlyTransactions) {
    for (const c of summarize(txs).expenseByCategory) {
      totals.set(c.categoryId, (totals.get(c.categoryId) ?? 0) + c.amount);
    }
  }
  return new Map([...totals].map(([id, sum]) => [id, Math.round(sum / months)]));
}
