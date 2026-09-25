import type { BudgetComparisonRow } from '../domain/aggregate';
import { formatYen } from '../domain/money';
import type { Category, Id } from '../domain/types';
import { NEUTRAL_COLOR } from '../db/defaults';

interface Props {
  rows: readonly BudgetComparisonRow[];
  categoryById: ReadonlyMap<Id, Category>;
}

/** 状態を表す色（カテゴリの色とは別枠。必ずアイコン・文言と一緒に使う） */
const CRITICAL = '#d03b3b';

/**
 * カテゴリ別の支出実績（棒）と予算（縦線）を同じ目盛りで並べる。
 * 棒グラフと予算比較を兼ねる。
 */
export default function BudgetComparison({ rows, categoryById }: Props) {
  const visible = rows.filter((r) => r.planned !== null || r.actual > 0);
  if (visible.length === 0) {
    return <p className="py-16 text-center text-sm text-slate-500">この月の支出と予算はありません</p>;
  }
  const max = Math.max(...visible.map((r) => Math.max(r.planned ?? 0, r.actual)), 1);
  const pct = (v: number) => `${(v / max) * 100}%`;

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-slate-500" aria-hidden>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-r-sm bg-slate-400" />
          実績
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3.5 w-0.5 bg-slate-800" />
          予算
        </span>
      </div>
      <ul className="space-y-4 md:space-y-3">
        {visible.map((r) => {
          const category = categoryById.get(r.categoryId);
          const over = r.remaining !== null && r.remaining < 0;
          return (
            <li
              key={r.categoryId}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 text-sm md:grid-cols-[7rem_minmax(0,1fr)_13rem]"
            >
              <span className="inline-flex items-center gap-2 truncate text-slate-700">
                <span
                  className="inline-block size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: category?.color ?? NEUTRAL_COLOR }}
                  aria-hidden
                />
                {category?.name ?? '（不明）'}
              </span>
              <div className="relative col-span-2 row-start-2 h-5 md:col-span-1 md:col-start-2 md:row-start-1" aria-hidden>
                <div className="absolute inset-x-0 top-1/2 h-px bg-slate-200" />
                <div
                  className="absolute top-1/2 h-3 -translate-y-1/2 rounded-r"
                  style={{ width: pct(r.actual), backgroundColor: category?.color ?? NEUTRAL_COLOR }}
                />
                {r.planned !== null && (
                  <div
                    className="absolute top-0 h-5 w-0.5 -translate-x-1/2 bg-slate-800"
                    style={{ left: pct(r.planned) }}
                  />
                )}
              </div>
              <div className="col-start-2 row-start-1 text-right tabular-nums md:col-start-3">
                <div className="text-slate-800">
                  {formatYen(r.actual)}
                  {r.planned !== null && <span className="text-slate-500"> / {formatYen(r.planned)}</span>}
                </div>
                <div className="text-xs">
                  {r.planned === null ? (
                    <span className="text-slate-400">予算未設定</span>
                  ) : over ? (
                    <span className="font-medium" style={{ color: CRITICAL }}>
                      ▲ {formatYen(-r.remaining!)} 超過
                    </span>
                  ) : (
                    <span className="text-slate-500">残り {formatYen(r.remaining!)}</span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
