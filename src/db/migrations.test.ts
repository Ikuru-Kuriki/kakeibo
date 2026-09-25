import { describe, expect, it } from 'vitest';
import { migrateRecurringNamesToSubcategories, type RecurringRuleV3 } from './migrations';
import type { Transaction } from '../domain/types';

const meta = { createdAt: '', updatedAt: '', deletedAt: null };
const rule = (id: string, name: string, categoryId: string): RecurringRuleV3 => ({
  ...meta,
  id,
  name,
  type: 'expense',
  categoryId,
  amount: 1000,
  dayOfMonth: 1,
  startMonth: '2026-09',
  endMonth: null,
  skippedMonths: [],
});
const tx = (id: string, recurringId: string | null, memo: string): Transaction => ({
  ...meta,
  id,
  date: '2026-09-01',
  amount: 1000,
  type: 'expense',
  categoryId: 'rent',
  memo,
  recurringId,
  recurringMonth: recurringId ? '2026-09' : null,
});

describe('migrateRecurringNamesToSubcategories', () => {
  it('固定費の名前を小分類にし、確定済みの取引にも付ける', () => {
    const result = migrateRecurringNamesToSubcategories(
      [rule('r1', '家賃', 'rent'), rule('r2', '家賃', 'rent'), rule('r3', '電気代', 'utility')],
      [tx('t1', 'r1', '家賃'), tx('t2', 'r3', '8月分は多め'), tx('t3', null, '家賃')],
    );
    expect(result.subcategories.map((s) => [s.categoryId, s.name])).toEqual([
      ['rent', '家賃'],
      ['utility', '電気代'],
    ]);
    const [rent, utility] = result.subcategories;
    expect(result.rules.map((r) => r.subcategoryId)).toEqual([rent!.id, rent!.id, utility!.id]);
    expect(result.rules[0]).not.toHaveProperty('name');
    expect(result.transactions.map((t) => [t.subcategoryId ?? null, t.memo])).toEqual([
      [rent!.id, ''],
      [utility!.id, '8月分は多め'],
      [null, '家賃'],
    ]);
  });
});
