import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import BudgetComparison from '../components/BudgetComparison';
import ExpenseDonut from '../components/ExpenseDonut';
import MonthSwitcher from '../components/MonthSwitcher';
import MonthTotals from '../components/MonthTotals';
import PageHeader from '../components/PageHeader';
import { compareBudget, summarize } from '../domain/aggregate';
import { formatYen } from '../domain/money';
import { currentPeriod } from '../domain/period';
import { useBudgets, useCategories, useSettings, useTransactions } from '../hooks/useData';

export default function SummaryPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { monthStartDay } = useSettings();
  const current = currentPeriod(monthStartDay);
  const ym = params.ym && /^\d{4}-\d{2}$/.test(params.ym) ? params.ym : current;

  const categories = useCategories({ includeArchived: true });
  const transactions = useTransactions(ym);
  const budgets = useBudgets(ym);

  const categoryById = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c])), [categories]);
  const summary = useMemo(() => summarize(transactions ?? []), [transactions]);
  const rows = useMemo(
    () => compareBudget(categories ?? [], budgets ?? [], transactions ?? []),
    [categories, budgets, transactions],
  );
  const plannedTotal = (budgets ?? []).reduce((sum, b) => sum + b.amount, 0);
  const loaded = categories && transactions && budgets;

  return (
    <>
      <PageHeader title="月次サマリー">
        <MonthSwitcher value={ym} max={current} onChange={(next) => navigate(`/summary/${next}`)} />
      </PageHeader>
      <div className="space-y-6">
        <MonthTotals summary={summary} />
        {loaded && (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <h3 className="mb-4 font-bold">支出の内訳</h3>
              <ExpenseDonut totals={summary.expenseByCategory} categoryById={categoryById} />
            </section>
            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-bold">カテゴリ別の支出と予算</h3>
                {plannedTotal > 0 && (
                  <span className="text-sm tabular-nums text-slate-500">
                    予算合計 {formatYen(plannedTotal)}
                  </span>
                )}
              </div>
              <BudgetComparison rows={rows} categoryById={categoryById} />
            </section>
          </div>
        )}
      </div>
    </>
  );
}
