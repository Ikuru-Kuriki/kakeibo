import { useMemo, useState } from 'react';
import { summarize } from '../domain/aggregate';
import { defaultEntryDate, formatYearMonthJa, periodOf } from '../domain/period';
import type { TransactionInput, YearMonth } from '../domain/types';
import { addTransaction } from '../db/repository';
import { useCategories, useSettings, useTransactions } from '../hooks/useData';
import MonthTotals from './MonthTotals';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';

/** 1か月分の入力フォーム・合計・取引一覧。今月の記録画面と履歴画面で使う */
export default function MonthRecord({ ym }: { ym: YearMonth }) {
  const { monthStartDay } = useSettings();
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
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        {categories && (
          <TransactionForm
            // 月を切り替えたら日付の初期値も切り替える
            key={ym}
            categories={categories}
            defaultDate={defaultEntryDate(ym, monthStartDay)}
            onSubmit={handleAdd}
          />
        )}
        {notice && <p className="mt-2 text-sm text-amber-700">{notice}</p>}
      </section>
      <MonthTotals summary={summary} />
      {transactions && categories && <TransactionList transactions={transactions} categories={categories} />}
    </div>
  );
}
