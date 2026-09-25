import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import PendingRecurring from '../components/PendingRecurring';
import RecurringForm from '../components/RecurringForm';
import { formatYen } from '../domain/money';
import { currentPeriod, formatYearMonthJa } from '../domain/period';
import type { Id, RecurringRule } from '../domain/types';
import { addRecurring, deleteRecurring, unskipRecurring, updateRecurring } from '../db/repository';
import { NEUTRAL_COLOR } from '../db/defaults';
import { useCategories, useRecurring, useSettings } from '../hooks/useData';

function period(rule: RecurringRule): string {
  return `${formatYearMonthJa(rule.startMonth)}〜${rule.endMonth ? formatYearMonthJa(rule.endMonth) : ''}`;
}

export default function RecurringPage() {
  const { monthStartDay } = useSettings();
  const current = currentPeriod(monthStartDay);
  const categories = useCategories({ includeArchived: true });
  const rules = useRecurring();
  const [editingId, setEditingId] = useState<Id | null>(null);

  if (!categories || !rules) return null;
  const byId = new Map(categories.map((c) => [c.id, c]));

  async function handleDelete(rule: RecurringRule) {
    if (!window.confirm(`固定費「${rule.name}」を削除しますか？（これまでに確定した取引は残ります）`)) return;
    await deleteRecurring(rule.id);
  }

  return (
    <>
      <PageHeader title="固定費" />
      <div className="space-y-6">
        <p className="text-sm text-slate-500">
          家賃やサブスクなど毎月決まった取引を登録すると、毎月「確認待ち」に並びます。
          「今月の記録」画面で金額を確かめて「確定」すると取引として記録されます。
          「この月はなし」にした月は、下の一覧の「戻す」で確認待ちに戻せます。
        </p>

        <PendingRecurring showSettingsLink={false} />

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="mb-3 font-bold">固定費を追加</h3>
          <RecurringForm
            categories={categories}
            defaultStartMonth={current}
            submitLabel="追加"
            onSubmit={async (input) => {
              await addRecurring(input);
            }}
          />
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {rules.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">固定費はまだ登録されていません</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">名前</th>
                  <th className="px-4 py-2 font-medium">カテゴリ</th>
                  <th className="px-4 py-2 text-right font-medium">金額の目安</th>
                  <th className="px-4 py-2 font-medium">毎月</th>
                  <th className="px-4 py-2 font-medium">期間</th>
                  <th className="w-32 px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rules.map((r) => {
                  if (r.id === editingId) {
                    return (
                      <tr key={r.id} className="bg-slate-50">
                        <td colSpan={6} className="px-4 py-3">
                          <RecurringForm
                            categories={categories}
                            initial={r}
                            defaultStartMonth={current}
                            submitLabel="保存"
                            onSubmit={async (input) => {
                              await updateRecurring(r.id, input);
                              setEditingId(null);
                            }}
                            onCancel={() => setEditingId(null)}
                          />
                        </td>
                      </tr>
                    );
                  }
                  const c = byId.get(r.categoryId);
                  return (
                    <tr key={r.id}>
                      <td className="px-4 py-2 font-medium">{r.name}</td>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-block size-2.5 rounded-full"
                            style={{ backgroundColor: c?.color ?? NEUTRAL_COLOR }}
                            aria-hidden
                          />
                          {c?.name ?? '（不明）'}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-2 text-right tabular-nums ${r.type === 'income' ? 'text-emerald-700' : ''}`}
                      >
                        {r.type === 'income' ? '+' : '−'}
                        {formatYen(r.amount)}
                      </td>
                      <td className="px-4 py-2 tabular-nums">{r.dayOfMonth}日</td>
                      <td className="px-4 py-2 text-slate-600">
                        {period(r)}
                        {r.skippedMonths.length > 0 && (
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="text-slate-400">なしにした月:</span>
                            {[...r.skippedMonths].sort().map((m) => (
                              <span
                                key={m}
                                className="inline-flex items-center gap-1 rounded bg-slate-100 py-0.5 pr-0.5 pl-2"
                              >
                                {formatYearMonthJa(m)}
                                <button
                                  type="button"
                                  onClick={() => void unskipRecurring(r.id, m)}
                                  aria-label={`${r.name}の${formatYearMonthJa(m)}分を確認待ちに戻す`}
                                  className="rounded px-1.5 text-slate-700 underline hover:bg-slate-200"
                                >
                                  戻す
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="space-x-1 px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setEditingId(r.id)}
                          className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-200"
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(r)}
                          className="rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
