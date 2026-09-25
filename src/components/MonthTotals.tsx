import { formatYen } from '../domain/money';
import type { MonthSummary } from '../domain/aggregate';

export default function MonthTotals({ summary }: { summary: MonthSummary }) {
  const items = [
    { label: '収入', value: summary.income, className: 'text-emerald-700' },
    { label: '支出', value: summary.expense, className: 'text-rose-700' },
    {
      label: '収支',
      value: summary.balance,
      className: summary.balance < 0 ? 'text-rose-700' : 'text-slate-800',
    },
  ];
  return (
    <dl className="grid grid-cols-3 gap-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-slate-200 bg-white px-5 py-4">
          <dt className="text-xs text-slate-500">{item.label}</dt>
          <dd className={`mt-1 text-2xl font-bold tabular-nums ${item.className}`}>{formatYen(item.value)}</dd>
        </div>
      ))}
    </dl>
  );
}
