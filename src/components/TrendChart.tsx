import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatYen } from '../domain/money';
import { parseYearMonth } from '../domain/period';
import type { MonthStatus } from '../domain/trends';
import type { YearMonth } from '../domain/types';

interface Props {
  months: readonly YearMonth[];
  statuses: readonly MonthStatus[];
  values: readonly (number | null)[];
  budgets: readonly (number | null)[];
  average: number | null;
  color: string;
}

const INK_MUTED = '#64748b';
const GRID = '#e2e8f0';
const BUDGET = '#64748b';
const AVERAGE = '#cbd5e1';

/** 軸の目盛り: 10,000円以上は「◯万」 */
function compactYen(v: number): string {
  if (v >= 10000) return `${Number((v / 10000).toFixed(1))}万`;
  return v.toLocaleString('ja-JP');
}

export default function TrendChart({ months, statuses, values, budgets, average, color }: Props) {
  const data = months.map((m, i) => ({
    label: `${parseYearMonth(m).month}月`,
    month: m,
    value: values[i],
    budget: budgets[i],
    inProgress: statuses[i] === 'inProgress',
  }));
  const hasBudget = budgets.some((b) => b !== null);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-slate-500" aria-hidden>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4" style={{ backgroundColor: color }} />
          実績
        </span>
        {hasBudget && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4" style={{ backgroundColor: BUDGET }} />
            予算
          </span>
        )}
        {average !== null && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4" style={{ backgroundColor: AVERAGE }} />
            平均 {formatYen(average)}
          </span>
        )}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: INK_MUTED, fontSize: 12 }} tickLine={false} axisLine={{ stroke: GRID }} />
            <YAxis
              tickFormatter={compactYen}
              tick={{ fill: INK_MUTED, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            {average !== null && <ReferenceLine y={average} stroke={AVERAGE} strokeWidth={2} />}
            {hasBudget && (
              <Line
                type="stepAfter"
                dataKey="budget"
                stroke={BUDGET}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
            <Line
              type="linear"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 4, fill: color, stroke: '#ffffff', strokeWidth: 2 }}
              activeDot={{ r: 5, fill: color, stroke: '#ffffff', strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Tooltip
              cursor={{ stroke: GRID }}
              content={({ active, payload }) => {
                const d = payload?.[0]?.payload as (typeof data)[number] | undefined;
                if (!active || !d) return null;
                const { year, month } = parseYearMonth(d.month);
                return (
                  <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
                    <div className="mb-1 font-medium text-slate-800">
                      {year}年{month}月{d.inProgress && '（途中）'}
                    </div>
                    <div className="tabular-nums text-slate-700">実績 {d.value == null ? '記録なし' : formatYen(d.value)}</div>
                    {d.budget !== null && d.budget !== undefined && (
                      <div className="tabular-nums text-slate-500">予算 {formatYen(d.budget)}</div>
                    )}
                  </div>
                );
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
