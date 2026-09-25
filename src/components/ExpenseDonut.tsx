import { useState } from 'react';
import { Cell, Pie, PieChart } from 'recharts';
import { OTHER_ID, foldTopN, type CategoryTotal } from '../domain/aggregate';
import { formatYen } from '../domain/money';
import type { Category, Id } from '../domain/types';
import { NEUTRAL_COLOR } from '../db/defaults';

interface Props {
  totals: readonly CategoryTotal[];
  categoryById: ReadonlyMap<Id, Category>;
}

/** 円グラフに出す最大区分数（これを超える分は「その他」にまとめる） */
const MAX_SLICES = 5;
const SIZE = 220;

interface Slice {
  categoryId: Id;
  name: string;
  color: string;
  amount: number;
  share: number;
}

const formatShare = (share: number) => `${(share * 100).toFixed(1)}%`;

export default function ExpenseDonut({ totals, categoryById }: Props) {
  const [activeId, setActiveId] = useState<Id | null>(null);
  const total = totals.reduce((sum, t) => sum + t.amount, 0);
  if (total === 0) {
    return <p className="py-16 text-center text-sm text-slate-500">この月の支出はありません</p>;
  }

  const slices: Slice[] = foldTopN(totals, MAX_SLICES).map((t) => {
    const category = categoryById.get(t.categoryId);
    const isOther = t.categoryId === OTHER_ID;
    return {
      categoryId: t.categoryId,
      name: isOther ? 'その他（まとめ）' : (category?.name ?? '（不明）'),
      color: isOther ? NEUTRAL_COLOR : (category?.color ?? NEUTRAL_COLOR),
      amount: t.amount,
      share: t.amount / total,
    };
  });

  const active = slices.find((s) => s.categoryId === activeId);

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <PieChart width={SIZE} height={SIZE}>
          <Pie
            data={slices}
            dataKey="amount"
            nameKey="name"
            innerRadius={68}
            outerRadius={100}
            startAngle={90}
            endAngle={-270}
            stroke="#ffffff"
            strokeWidth={2}
            isAnimationActive={false}
            onMouseEnter={(_, index) => setActiveId(slices[index]?.categoryId ?? null)}
            onMouseLeave={() => setActiveId(null)}
          >
            {slices.map((s) => (
              <Cell
                key={s.categoryId}
                fill={s.color}
                fillOpacity={activeId === null || activeId === s.categoryId ? 1 : 0.35}
              />
            ))}
          </Pie>
        </PieChart>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="max-w-32 truncate text-xs text-slate-500">{active ? active.name : '支出合計'}</span>
          <span className="text-lg font-bold text-slate-800">{formatYen(active ? active.amount : total)}</span>
          {active && <span className="text-xs tabular-nums text-slate-500">{formatShare(active.share)}</span>}
        </div>
      </div>
      <table className="min-w-52 flex-1 text-sm">
        <caption className="sr-only">カテゴリ別の支出</caption>
        <tbody className="divide-y divide-slate-100">
          {slices.map((s) => (
            <tr
              key={s.categoryId}
              onMouseEnter={() => setActiveId(s.categoryId)}
              onMouseLeave={() => setActiveId(null)}
              className={activeId === s.categoryId ? 'bg-slate-50' : undefined}
            >
              <td className="py-1.5 pr-3">
                <span className="inline-flex items-center gap-2 text-slate-700">
                  <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
                  {s.name}
                </span>
              </td>
              <td className="py-1.5 text-right tabular-nums text-slate-800">{formatYen(s.amount)}</td>
              <td className="w-16 py-1.5 text-right tabular-nums text-slate-500">{formatShare(s.share)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
