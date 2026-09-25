import { useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import TrendChart from '../components/TrendChart';
import { currentPeriod, parseYearMonth } from '../domain/period';
import {
  TOTAL_ROW_ID,
  buildTrendRows,
  deviationLevel,
  monthStatuses,
  trendMonths,
  type TrendPeriod,
} from '../domain/trends';
import type { Id } from '../domain/types';
import { NEUTRAL_COLOR } from '../db/defaults';
import {
  useBudgetsForMonths,
  useCategories,
  useEarliestTransactionDate,
  useSettings,
  useTransactionsForMonths,
} from '../hooks/useData';

/** 平均との差の色（青 = 平均より少ない、赤 = 平均より多い、±10%以内は色なし） */
const LEVEL_FILL: Record<-2 | -1 | 0 | 1 | 2, string | undefined> = {
  [-2]: '#9ec5f4',
  [-1]: '#dbe9fb',
  0: undefined,
  1: '#fbdcdb',
  2: '#f4a9a8',
};
const LEVEL_LEGEND: Array<[-2 | -1 | 1 | 2, string]> = [
  [-2, '30%以上少ない'],
  [-1, '10〜30%少ない'],
  [1, '10〜30%多い'],
  [2, '30%以上多い'],
];
const CRITICAL = '#d03b3b';
const GOOD_TEXT = '#1c5cab';

function formatChange(change: number | null) {
  if (change === null) return <span className="text-slate-300">—</span>;
  const pct = Math.round(change * 100);
  if (Math.abs(pct) < 10) return <span className="text-slate-500">→ 横ばい</span>;
  return pct > 0 ? (
    <span style={{ color: CRITICAL }}>▲ {pct}%増</span>
  ) : (
    <span style={{ color: GOOD_TEXT }}>▼ {-pct}%減</span>
  );
}

function deviationTitle(deviation: number | null): string | undefined {
  if (deviation === null) return undefined;
  const pct = Math.round(deviation * 100);
  if (pct === 0) return '平均と同じくらい';
  return `平均より${Math.abs(pct)}%${pct > 0 ? '多い' : '少ない'}`;
}

const segment = (active: boolean) =>
  `px-3 py-1.5 text-sm ${active ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`;

export default function TrendsPage() {
  const { monthStartDay } = useSettings();
  const current = currentPeriod(monthStartDay);
  const currentYear = parseYearMonth(current).year;
  const earliest = useEarliestTransactionDate();
  const [period, setPeriod] = useState<TrendPeriod>({ kind: 'recent' });
  const [selected, setSelected] = useState<Id>(TOTAL_ROW_ID);

  const months = useMemo(() => trendMonths(period, current), [period, current]);
  const monthly = useTransactionsForMonths(months);
  const budgets = useBudgetsForMonths(months);
  const categories = useCategories({ includeArchived: true });

  const firstYear = earliest ? Number(earliest.slice(0, 4)) : currentYear;
  const years = Array.from({ length: Math.max(currentYear - firstYear + 1, 1) }, (_, i) => currentYear - i);

  const statuses = useMemo(() => (monthly ? monthStatuses(months, monthly, current) : null), [months, monthly, current]);
  const rows = useMemo(
    () => (categories && monthly && statuses ? buildTrendRows(categories, monthly, statuses) : null),
    [categories, monthly, statuses],
  );
  if (!rows || !statuses || !categories || !budgets) return null;

  const byId = new Map(categories.map((c) => [c.id, c]));
  const selectedRow = rows.find((r) => r.id === selected) ?? rows[0]!;
  const selectedName = selectedRow.id === TOTAL_ROW_ID ? '支出合計' : (byId.get(selectedRow.id)?.name ?? '（不明）');
  const selectedColor = selectedRow.id === TOTAL_ROW_ID ? '#334155' : (byId.get(selectedRow.id)?.color ?? NEUTRAL_COLOR);
  const selectedBudgets = budgets.map((list) => {
    const relevant = selectedRow.id === TOTAL_ROW_ID ? list : list.filter((b) => b.categoryId === selectedRow.id);
    return relevant.length > 0 ? relevant.reduce((s, b) => s + b.amount, 0) : null;
  });
  const closedCount = statuses.filter((s) => s === 'closed').length;

  return (
    <>
      <PageHeader title="推移">
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-md border border-slate-300" role="group" aria-label="期間">
            <button
              type="button"
              aria-pressed={period.kind === 'recent'}
              className={segment(period.kind === 'recent')}
              onClick={() => setPeriod({ kind: 'recent' })}
            >
              直近12か月
            </button>
            <button
              type="button"
              aria-pressed={period.kind === 'year'}
              className={segment(period.kind === 'year')}
              onClick={() => setPeriod({ kind: 'year', year: currentYear })}
            >
              年ごと
            </button>
          </div>
          {period.kind === 'year' && (
            <select
              aria-label="年"
              value={period.year}
              onChange={(e) => setPeriod({ kind: 'year', year: Number(e.target.value) })}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}年
                </option>
              ))}
            </select>
          )}
        </div>
      </PageHeader>

      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
          <p>
            色は各カテゴリの<strong className="font-medium text-slate-700">期間の平均</strong>
            と比べた多さ・少なさです（平均は記録のある月だけで計算し、今月は含めません）。行をクリックすると下にグラフを表示します。
          </p>
          <ul className="flex flex-wrap items-center gap-3 text-xs" aria-label="色の意味">
            {LEVEL_LEGEND.map(([level, label]) => (
              <li key={level} className="inline-flex items-center gap-1.5">
                <span className="inline-block size-3 rounded-sm" style={{ backgroundColor: LEVEL_FILL[level] }} />
                平均より{label}
              </li>
            ))}
          </ul>
        </div>

        {closedCount === 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            この期間には、比べられる締まった月の記録がまだありません。記録が1か月以上たまると、平均との比較が表示されます。
          </p>
        )}

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <caption className="sr-only">カテゴリ別・月別の支出（円）</caption>
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left font-medium">カテゴリ</th>
                {months.map((m, i) => {
                  const { year, month } = parseYearMonth(m);
                  const showYear = i === 0 || month === 1;
                  return (
                    <th key={m} className="px-2 py-2 text-right font-medium whitespace-nowrap">
                      {showYear && <span className="block text-[10px] text-slate-400">{year}年</span>}
                      {month}月{statuses[i] === 'inProgress' && <span className="block text-[10px]">（途中）</span>}
                    </th>
                  );
                })}
                <th className="border-l border-slate-200 px-3 py-2 text-right font-medium">平均</th>
                <th className="px-3 py-2 text-right font-medium whitespace-nowrap" title="最近3か月の平均と期間の平均の比較">
                  最近の傾向
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const isTotal = r.id === TOTAL_ROW_ID;
                const category = byId.get(r.id);
                const isSelected = r.id === selectedRow.id;
                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelected(r.id)}
                    className={`group cursor-pointer ${isTotal ? 'font-bold' : 'font-normal'} ${
                      isSelected ? 'bg-slate-100' : 'hover:bg-slate-50'
                    }`}
                  >
                    <th
                      scope="row"
                      className={`sticky left-0 px-3 py-2 text-left whitespace-nowrap ${isTotal ? 'font-bold' : 'font-normal'} ${
                        isSelected ? 'bg-slate-100 shadow-[inset_3px_0_0_#1e293b]' : 'bg-white group-hover:bg-slate-50'
                      }`}
                    >
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelected(r.id)}
                        className="inline-flex items-center gap-2"
                      >
                        {!isTotal && (
                          <span
                            className="inline-block size-2.5 rounded-full"
                            style={{ backgroundColor: category?.color ?? NEUTRAL_COLOR }}
                            aria-hidden
                          />
                        )}
                        {isTotal ? '支出合計' : (category?.name ?? '（不明）')}
                      </button>
                    </th>
                    {r.values.map((v, i) => {
                      const level = deviationLevel(r.deviations[i] ?? null);
                      const fill = level === null ? undefined : LEVEL_FILL[level];
                      return (
                        <td
                          key={months[i]}
                          className={`px-2 py-2 text-right tabular-nums ${
                            statuses[i] === 'inProgress' ? 'text-slate-400' : 'text-slate-800'
                          }`}
                          style={fill ? { backgroundColor: fill } : undefined}
                          title={deviationTitle(r.deviations[i] ?? null)}
                        >
                          {v === null ? <span className="text-slate-300">—</span> : v.toLocaleString('ja-JP')}
                        </td>
                      );
                    })}
                    <td className="border-l border-slate-200 px-3 py-2 text-right tabular-nums">
                      {r.average === null ? <span className="text-slate-300">—</span> : r.average.toLocaleString('ja-JP')}
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-normal whitespace-nowrap">
                      {formatChange(r.recentChange)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="mb-3 font-bold">{selectedName}の推移</h3>
          <TrendChart
            months={months}
            statuses={statuses}
            values={selectedRow.values}
            budgets={selectedBudgets}
            average={selectedRow.average}
            color={selectedColor}
          />
        </section>
      </div>
    </>
  );
}
