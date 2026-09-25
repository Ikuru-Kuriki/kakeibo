import { describe, expect, it } from 'vitest';
import { averageOverRecordedMonths, referenceMonths } from './budgetPlan';
import type { Transaction } from './types';

describe('referenceMonths', () => {
  it('来月の予算: 今月は途中なので、平均は先月までの3か月', () => {
    expect(referenceMonths('2026-10', '2026-09')).toEqual({
      prev: '2026-09',
      prevInProgress: true,
      before: '2026-08',
      averageMonths: ['2026-06', '2026-07', '2026-08'],
    });
  });
  it('今月の予算: 前月は締まっているので、平均は前月までの3か月', () => {
    expect(referenceMonths('2026-09', '2026-09')).toEqual({
      prev: '2026-08',
      prevInProgress: false,
      before: '2026-07',
      averageMonths: ['2026-06', '2026-07', '2026-08'],
    });
  });
  it('過去の月: 対象月の直前3か月', () => {
    expect(referenceMonths('2026-03', '2026-09').averageMonths).toEqual(['2025-12', '2026-01', '2026-02']);
  });
});

describe('averageOverRecordedMonths', () => {
  const tx = (categoryId: string, amount: number): Transaction => ({
    id: Math.random().toString(),
    createdAt: '',
    updatedAt: '',
    deletedAt: null,
    date: '2026-09-01',
    type: 'expense',
    categoryId,
    amount,
    memo: '',
  });
  it('記録のない月は平均に含めない', () => {
    const { average, months } = averageOverRecordedMonths([[], [tx('food', 3000)], [tx('food', 1000), tx('rent', 500)]]);
    expect(months).toBe(2);
    expect(average.get('food')).toBe(2000);
    expect(average.get('rent')).toBe(250);
  });
});
