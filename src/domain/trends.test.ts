import { describe, expect, it } from 'vitest';
import { TOTAL_ROW_ID, buildTrendRows, deviationLevel, monthStatuses, trendMonths } from './trends';
import type { Category, Transaction } from './types';

const meta = { createdAt: '', updatedAt: '', deletedAt: null };
const cat = (id: string, order: number, archived = false): Category => ({
  ...meta,
  id,
  name: id,
  type: 'expense',
  color: '#000',
  order,
  archived,
});
let n = 0;
const tx = (categoryId: string, amount: number): Transaction => ({
  ...meta,
  id: `t${n++}`,
  date: '2026-01-01',
  type: 'expense',
  categoryId,
  amount,
  memo: '',
});

describe('trendMonths', () => {
  it('直近12か月は今月まで、年ごとは1〜12月', () => {
    const recent = trendMonths({ kind: 'recent' }, '2026-09');
    expect([recent[0], recent[11]]).toEqual(['2025-10', '2026-09']);
    const year = trendMonths({ kind: 'year', year: 2025 }, '2026-09');
    expect([year[0], year[11]]).toEqual(['2025-01', '2025-12']);
  });
});

describe('monthStatuses / buildTrendRows', () => {
  const months = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
  const monthly = [
    [], // 4月: 記録なし
    [tx('food', 30000), tx('rent', 80000)],
    [tx('food', 30000), tx('rent', 80000)],
    [tx('food', 40000), tx('rent', 80000)],
    [tx('food', 50000), tx('rent', 80000), tx('old', 100)],
    [tx('food', 10000)], // 9月: 今月（途中）
    [], // 10月: 未来
  ];
  const statuses = monthStatuses(months, monthly, '2026-09');

  it('月の状態を判定する', () => {
    expect(statuses).toEqual(['noRecord', 'closed', 'closed', 'closed', 'closed', 'inProgress', 'future']);
  });

  it('平均・平均との差・最近の傾向を求める（今月と記録のない月は平均に含めない）', () => {
    const rows = buildTrendRows([cat('rent', 1), cat('food', 0), cat('old', 2, true), cat('unused-old', 3, true)], monthly, statuses);
    expect(rows.map((r) => r.id)).toEqual([TOTAL_ROW_ID, 'food', 'rent', 'old']);
    const food = rows[1]!;
    expect(food.values).toEqual([null, 30000, 30000, 40000, 50000, 10000, null]);
    expect(food.average).toBe(37500);
    expect(food.deviations[4]).toBeCloseTo(1 / 3);
    expect(food.deviations[5]).toBeNull(); // 途中の月は比べない
    // 最近3か月 (30000+40000+50000)/3 = 40000 → 平均 37500 より 6.7% 多い
    expect(food.recentChange).toBeCloseTo(40000 / 37500 - 1);
    expect(rows[0]!.values[1]).toBe(110000);
  });

  it('締まった月が4か月未満なら最近の傾向は出さない', () => {
    const rows = buildTrendRows([cat('food', 0)], monthly.slice(0, 4), statuses.slice(0, 4));
    expect(rows[1]!.recentChange).toBeNull();
  });
});

describe('deviationLevel', () => {
  it('±10%以内は0、30%以上は±2', () => {
    expect([-0.5, -0.2, 0.05, 0.1, 0.3].map(deviationLevel)).toEqual([-2, -1, 0, 1, 2]);
    expect(deviationLevel(null)).toBeNull();
  });
});
