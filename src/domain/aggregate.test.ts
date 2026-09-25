import { describe, expect, it } from 'vitest';
import { OTHER_ID, averageExpenseByCategory, compareBudget, foldTopN, summarize } from './aggregate';
import type { Budget, Category, EntryType, Transaction } from './types';

const meta = { createdAt: '', updatedAt: '', deletedAt: null };
let seq = 0;
const tx = (type: EntryType, categoryId: string, amount: number): Transaction => ({
  ...meta,
  id: `t${seq++}`,
  date: '2026-09-01',
  type,
  categoryId,
  amount,
  memo: '',
});
const cat = (id: string, type: EntryType, order: number, archived = false): Category => ({
  ...meta,
  id,
  name: id,
  type,
  color: '#000000',
  order,
  archived,
});
const budget = (categoryId: string, amount: number): Budget => ({
  ...meta,
  id: `b-${categoryId}`,
  yearMonth: '2026-09',
  categoryId,
  amount,
});

describe('summarize', () => {
  it('収入・支出・カテゴリ別合計を出す', () => {
    const s = summarize([
      tx('income', 'salary', 300000),
      tx('expense', 'food', 1000),
      tx('expense', 'food', 2000),
      tx('expense', 'rent', 80000),
    ]);
    expect(s.income).toBe(300000);
    expect(s.expense).toBe(83000);
    expect(s.balance).toBe(217000);
    expect(s.expenseByCategory).toEqual([
      { categoryId: 'rent', amount: 80000 },
      { categoryId: 'food', amount: 3000 },
    ]);
  });
});

describe('compareBudget', () => {
  const categories = [
    cat('rent', 'expense', 1),
    cat('food', 'expense', 0),
    cat('salary', 'income', 2),
    cat('old', 'expense', 3, true),
    cat('unused-old', 'expense', 4, true),
  ];
  it('支出カテゴリの予算と実績を並び順どおりに返す', () => {
    const rows = compareBudget(
      categories,
      [budget('food', 40000)],
      [tx('expense', 'food', 10000), tx('expense', 'old', 500), tx('income', 'salary', 1)],
    );
    expect(rows.map((r) => r.categoryId)).toEqual(['food', 'rent', 'old']);
    expect(rows[0]).toEqual({ categoryId: 'food', planned: 40000, actual: 10000, remaining: 30000, ratio: 0.25 });
    expect(rows[1]).toEqual({ categoryId: 'rent', planned: null, actual: 0, remaining: null, ratio: null });
  });
});

describe('averageExpenseByCategory', () => {
  it('月数で割った平均（実績のない月も分母に含む）', () => {
    const avg = averageExpenseByCategory([[tx('expense', 'food', 3000)], [tx('expense', 'food', 1000)], []]);
    expect(avg.get('food')).toBe(1333);
  });
});

describe('foldTopN', () => {
  const t = (categoryId: string, amount: number) => ({ categoryId, amount });
  it('上位 n 件を残して残りを「その他」にまとめる', () => {
    expect(foldTopN([t('a', 1), t('b', 5), t('c', 3), t('d', 2)], 2)).toEqual([t('b', 5), t('c', 3), t(OTHER_ID, 3)]);
  });
  it('1 件だけ余る場合はまとめない。0 円は除外する', () => {
    expect(foldTopN([t('a', 1), t('b', 5), t('c', 3), t('z', 0)], 2)).toEqual([t('b', 5), t('c', 3), t('a', 1)]);
  });
});
