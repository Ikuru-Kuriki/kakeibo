import { summarize } from './aggregate';
import { addMonths, formatYearMonth } from './period';
import type { Category, Id, Transaction, YearMonth } from './types';

/**
 * 推移画面の集計（純粋関数）。
 * 増減は「その期間の平均」と比べる。平均には、締まった（今月より前の）記録のある月だけを使う。
 */

export type TrendPeriod = { kind: 'recent' } | { kind: 'year'; year: number };

/** 表示する12か月（古い順） */
export function trendMonths(period: TrendPeriod, current: YearMonth): YearMonth[] {
  const first = period.kind === 'recent' ? addMonths(current, -11) : formatYearMonth(period.year, 1);
  return Array.from({ length: 12 }, (_, i) => addMonths(first, i));
}

export type MonthStatus = 'closed' | 'inProgress' | 'noRecord' | 'future';

export function monthStatuses(
  months: readonly YearMonth[],
  monthly: readonly (readonly Transaction[])[],
  current: YearMonth,
): MonthStatus[] {
  return months.map((m, i) => {
    if (m > current) return 'future';
    if (m === current) return 'inProgress';
    return (monthly[i]?.length ?? 0) > 0 ? 'closed' : 'noRecord';
  });
}

export const TOTAL_ROW_ID = '__total__';

export interface TrendRow {
  /** カテゴリ ID。支出合計の行は TOTAL_ROW_ID */
  id: Id;
  /** 各月の支出（記録のない月・未来の月は null） */
  values: (number | null)[];
  /** 締まった記録のある月の平均（なければ null） */
  average: number | null;
  /** 平均との差の割合（例 0.25 = 平均より25%多い）。比べられない月は null */
  deviations: (number | null)[];
  /** 最近3か月の平均が、期間の平均より何割多いか（締まった月が4か月未満なら null） */
  recentChange: number | null;
}

const RECENT_MONTHS = 3;

function buildRow(id: Id, values: (number | null)[], statuses: readonly MonthStatus[]): TrendRow {
  const closed = values.filter((v, i): v is number => statuses[i] === 'closed' && v !== null);
  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const average = closed.length > 0 ? mean(closed) : null;
  const deviations = values.map((v, i) =>
    statuses[i] === 'closed' && v !== null && average ? (v - average) / average : null,
  );
  const recentChange =
    closed.length > RECENT_MONTHS && average ? (mean(closed.slice(-RECENT_MONTHS)) - average) / average : null;
  return { id, values, average: average === null ? null : Math.round(average), deviations, recentChange };
}

/**
 * 支出合計の行と、カテゴリごとの行を作る。
 * カテゴリは支出の使用中カテゴリと、期間内に支出のあるアーカイブ済みカテゴリ（表示順）。
 */
export function buildTrendRows(
  categories: readonly Category[],
  monthly: readonly (readonly Transaction[])[],
  statuses: readonly MonthStatus[],
): TrendRow[] {
  const hasValue = (s: MonthStatus) => s === 'closed' || s === 'inProgress';
  const byMonth = monthly.map((txs) => summarize(txs));
  const perCategory = byMonth.map((s) => new Map(s.expenseByCategory.map((c) => [c.categoryId, c.amount])));
  const used = new Set(perCategory.flatMap((m) => [...m.keys()]));

  const total = buildRow(
    TOTAL_ROW_ID,
    byMonth.map((s, i) => (hasValue(statuses[i]!) ? s.expense : null)),
    statuses,
  );
  const rows = categories
    .filter((c) => c.type === 'expense' && (!c.archived || used.has(c.id)))
    .sort((a, b) => a.order - b.order)
    .map((c) =>
      buildRow(
        c.id,
        perCategory.map((m, i) => (hasValue(statuses[i]!) ? (m.get(c.id) ?? 0) : null)),
        statuses,
      ),
    );
  return [total, ...rows];
}

/** 色分けの段階（-2: 30%以上少ない 〜 +2: 30%以上多い、0: ±10%以内） */
export function deviationLevel(deviation: number | null): -2 | -1 | 0 | 1 | 2 | null {
  if (deviation === null) return null;
  if (deviation <= -0.3) return -2;
  if (deviation <= -0.1) return -1;
  if (deviation < 0.1) return 0;
  if (deviation < 0.3) return 1;
  return 2;
}
