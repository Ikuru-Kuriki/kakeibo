import { useMemo, useState } from 'react';
import MonthTotals from '../components/MonthTotals';
import PageHeader from '../components/PageHeader';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList';
import { summarize } from '../domain/aggregate';
import { currentPeriod, formatYearMonthJa, periodOf } from '../domain/period';
import type { TransactionInput } from '../domain/types';
import { addTransaction } from '../db/repository';
import { useCategories, useSettings, useTransactions } from '../hooks/useData';

export default function RecordPage() {
  const { monthStartDay } = useSettings();
  const ym = currentPeriod(monthStartDay);
  const categories = useCategories({ includeArchived: true });
  const transactions = useTransactions(ym);
  const summary = useMemo(() => summarize(transactions ?? []), [transactions]);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleAdd(input: TransactionInput) {
    await addTransaction(input);
    const saved = periodOf(input.date, monthStartDay);
    setNotice(saved === ym ? null : `${formatYearMonthJa(saved)}の取引として保存しました（履歴画面で確認できます）`);
  }

  return (
    <>
      <PageHeader title={`今月の記録（${formatYearMonthJa(ym)}）`} />
      <div className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          {categories && <TransactionForm categories={categories} onSubmit={handleAdd} />}
          {notice && <p className="mt-2 text-sm text-amber-700">{notice}</p>}
        </section>
        <MonthTotals summary={summary} />
        {transactions && categories && <TransactionList transactions={transactions} categories={categories} />}
      </div>
    </>
  );
}
