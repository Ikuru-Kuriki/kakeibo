import { describe, expect, it } from 'vitest';
import { occurrenceDate, occurrenceKey, pendingOccurrences } from './recurring';
import type { RecurringRule } from './types';

const rule = (patch: Partial<RecurringRule> = {}): RecurringRule => ({
  id: 'r1',
  createdAt: '',
  updatedAt: '',
  deletedAt: null,
  name: '家賃',
  type: 'expense',
  categoryId: 'rent',
  amount: 85000,
  dayOfMonth: 27,
  startMonth: '2026-07',
  endMonth: null,
  skippedMonths: [],
  ...patch,
});

describe('occurrenceDate', () => {
  it('その月にない日は月末にする', () => {
    expect(occurrenceDate('2026-02', 31)).toBe('2026-02-28');
    expect(occurrenceDate('2026-09', 5)).toBe('2026-09-05');
  });
});

describe('pendingOccurrences', () => {
  it('開始月から今月まで、確定・スキップ済みを除いて返す', () => {
    const handled = new Set([occurrenceKey('r1', '2026-07')]);
    const result = pendingOccurrences([rule({ skippedMonths: ['2026-08'] })], handled, '2026-09');
    expect(result.map((p) => [p.month, p.date])).toEqual([['2026-09', '2026-09-27']]);
  });

  it('終了月・開始前・削除済みのルールを考慮する', () => {
    expect(pendingOccurrences([rule({ endMonth: '2026-07' })], new Set(), '2026-09').map((p) => p.month)).toEqual([
      '2026-07',
    ]);
    expect(pendingOccurrences([rule({ startMonth: '2026-10' })], new Set(), '2026-09')).toEqual([]);
    expect(pendingOccurrences([rule({ deletedAt: 'x' })], new Set(), '2026-09')).toEqual([]);
  });

  it('複数ルールを日付順に並べる', () => {
    const rules = [rule(), rule({ id: 'r2', name: '通信', dayOfMonth: 10, startMonth: '2026-09' })];
    const result = pendingOccurrences(rules, new Set([occurrenceKey('r1', '2026-07'), occurrenceKey('r1', '2026-08')]), '2026-09');
    expect(result.map((p) => p.rule.name)).toEqual(['通信', '家賃']);
  });
});
