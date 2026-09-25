import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import BudgetInput from '../components/BudgetInput';
import MonthSwitcher from '../components/MonthSwitcher';
import PageHeader from '../components/PageHeader';
import { summarize } from '../domain/aggregate';
import { averageOverRecordedMonths, referenceMonths } from '../domain/budgetPlan';
import { formatYen } from '../domain/money';
import { addMonths, currentPeriod, parseYearMonth } from '../domain/period';
import type { Id, YearMonth } from '../domain/types';
import { copyBudgets, setBudget } from '../db/repository';
import { NEUTRAL_COLOR } from '../db/defaults';
import { useBudgets, useCategories, useSettings, useTransactionsForMonths } from '../hooks/useData';

const monthLabel = (ym: YearMonth) => `${parseYearMonth(ym).month}月`;

function expenseMap(txs: Parameters<typeof summarize>[0] | undefined): Map<Id, number> {
  return new Map(summarize(txs ?? []).expenseByCategory.map((c) => [c.categoryId, c.amount]));
}

/** 参考値。クリックするとその金額を予算に入れる */
function RefValue({ amount, onUse, title }: { amount: number | undefined; onUse: (n: number) => void; title: string }) {
  if (amount === undefined) return <span className="text-slate-300">—</span>;
  return (
    <button
      type="button"
      // Tab で入力欄から入力欄へ移れるよう、参考値はタブ移動の対象にしない
      tabIndex={-1}
      title={`${title}（クリックで予算に入れる）`}
      onClick={() => onUse(amount)}
      className="rounded px-1.5 py-0.5 tabular-nums text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    >
      {formatYen(amount)}
    </button>
  );
}

export default function BudgetPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { monthStartDay, carryOverBudget } = useSettings();
  const current = currentPeriod(monthStartDay);
  const next = addMonths(current, 1);
  const target = params.ym && /^\d{4}-\d{2}$/.test(params.ym) ? params.ym : next;
  const ref = referenceMonths(target, current);

  const categories = useCategories({ includeArchived: true });
  const targetBudgets = useBudgets(target);
  const prevBudgets = useBudgets(ref.prev);
  const monthly = useTransactionsForMonths([ref.prev, ref.before, ...ref.averageMonths]);
  const [message, setMessage] = useState<string | null>(null);

  const data = useMemo(() => {
    if (!monthly) return null;
    const [prevTxs, beforeTxs, ...avgTxs] = monthly;
    return {
      prevActual: expenseMap(prevTxs),
      beforeActual: expenseMap(beforeTxs),
      prevIncome: summarize(prevTxs ?? []).income,
      ...averageOverRecordedMonths(avgTxs),
    };
  }, [monthly]);

  if (!categories || !targetBudgets || !prevBudgets || !data) return null;

  const targetMap = new Map(targetBudgets.map((b) => [b.categoryId, b.amount]));
  const prevMap = new Map(prevBudgets.map((b) => [b.categoryId, b.amount]));
  const rows = categories.filter((c) => c.type === 'expense' && (!c.archived || targetMap.has(c.id)));
  const sum = (values: Iterable<number | undefined>) => [...values].reduce<number>((s, v) => s + (v ?? 0), 0);
  const targetTotal = sum(targetMap.values());
  const missingCount = rows.filter((c) => prevMap.has(c.id) && !targetMap.has(c.id)).length;

  const save = (categoryId: Id) => (amount: number | null) => setBudget(target, categoryId, amount);

  async function handleCopy() {
    const n = await copyBudgets(ref.prev, target);
    setMessage(`${n}件のカテゴリに${monthLabel(ref.prev)}の予算をコピーしました`);
  }

  const avgLabel =
    data.months > 0
      ? `${monthLabel(ref.averageMonths[0]!)}〜${monthLabel(ref.averageMonths[2]!)}平均`
      : '3か月平均';

  return (
    <>
      <PageHeader title={`${monthLabel(target)}の予算${target === next ? '（来月）' : target === current ? '（今月）' : ''}`}>
        <MonthSwitcher value={target} max={next} onChange={(ym) => navigate(`/budget/${ym}`)} />
      </PageHeader>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            金額を入力すると自動で保存されます（Enter で次のカテゴリへ）。空欄にすると「未設定」に戻ります。
            参考値をクリックすると、その金額が予算に入ります。
            {carryOverBudget && `入力欄の薄い数字は${monthLabel(ref.prev)}の予算で、まだ保存されていません。`}
          </p>
          {missingCount > 0 && (
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-100"
            >
              未入力のカテゴリに{monthLabel(ref.prev)}の予算をコピー
            </button>
          )}
        </div>
        {message && <p className="text-sm text-emerald-700">{message}</p>}

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-right text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left font-medium">カテゴリ</th>
                <th className="px-4 py-2 font-medium">{monthLabel(ref.prev)}の予算</th>
                <th className="px-4 py-2 font-medium">
                  {monthLabel(ref.prev)}の実績{ref.prevInProgress && '（途中）'}
                </th>
                <th className="px-4 py-2 font-medium">{monthLabel(ref.before)}の実績</th>
                <th className="px-4 py-2 font-medium" title="記録のある月だけで平均しています">
                  {avgLabel}
                </th>
                <th className="bg-slate-100 px-4 py-2 font-bold text-slate-700">{monthLabel(target)}の予算</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-right">
              {rows.map((c) => {
                const use = (n: number) => void setBudget(target, c.id, n);
                const prevActual = data.prevActual.get(c.id);
                const prevBudget = prevMap.get(c.id);
                const over = prevBudget !== undefined && (prevActual ?? 0) > prevBudget;
                return (
                  <tr key={c.id}>
                    <td className="px-4 py-2 text-left">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-block size-2.5 rounded-full"
                          style={{ backgroundColor: c.color || NEUTRAL_COLOR }}
                          aria-hidden
                        />
                        {c.name}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <RefValue amount={prevBudget} onUse={use} title={`${monthLabel(ref.prev)}の予算`} />
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1">
                        {over && (
                          <span className="text-xs text-[#d03b3b]" title="予算超過">
                            ▲
                          </span>
                        )}
                        <RefValue amount={prevActual} onUse={use} title={`${monthLabel(ref.prev)}の実績`} />
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <RefValue
                        amount={data.beforeActual.get(c.id)}
                        onUse={use}
                        title={`${monthLabel(ref.before)}の実績`}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <RefValue amount={data.average.get(c.id)} onUse={use} title={avgLabel} />
                    </td>
                    <td className="bg-slate-50 px-4 py-1.5">
                      <BudgetInput
                        label={`${c.name}の${monthLabel(target)}の予算`}
                        value={targetMap.get(c.id) ?? null}
                        placeholder={carryOverBudget ? prevBudget : null}
                        onSave={save(c.id)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-slate-200 text-right font-medium tabular-nums">
              <tr>
                <td className="px-4 py-2 text-left">合計</td>
                <td className="px-4 py-2">{formatYen(sum(prevMap.values()))}</td>
                <td className="px-4 py-2">{formatYen(sum(data.prevActual.values()))}</td>
                <td className="px-4 py-2">{formatYen(sum(data.beforeActual.values()))}</td>
                <td className="px-4 py-2">{data.months > 0 ? formatYen(sum(data.average.values())) : '—'}</td>
                <td className="bg-slate-50 px-4 py-2 text-slate-900">{formatYen(targetTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {data.prevIncome > 0 && targetTotal > 0 && (
          <p className="text-sm text-slate-600">
            参考: {monthLabel(ref.prev)}の収入 {formatYen(data.prevIncome)} − 予算合計 {formatYen(targetTotal)} ={' '}
            <span className={`font-medium ${data.prevIncome - targetTotal < 0 ? 'text-[#d03b3b]' : 'text-slate-900'}`}>
              {formatYen(data.prevIncome - targetTotal)}
            </span>
          </p>
        )}
      </div>
    </>
  );
}
