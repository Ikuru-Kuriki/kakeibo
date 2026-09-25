import { useState } from 'react';
import { formatYen } from '../domain/money';
import { formatMonthDayJa } from '../domain/period';
import type { Category, Id, Transaction, TransactionInput } from '../domain/types';
import { deleteTransaction, updateTransaction } from '../db/repository';
import TransactionForm from './TransactionForm';

interface Props {
  transactions: readonly Transaction[];
  /** 全カテゴリ（アーカイブ済みを含む） */
  categories: readonly Category[];
}

const formatDate = formatMonthDayJa;

export default function TransactionList({ transactions, categories }: Props) {
  const [editingId, setEditingId] = useState<Id | null>(null);
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  if (transactions.length === 0) {
    return (
      <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        取引はまだありません
      </p>
    );
  }

  async function handleDelete(t: Transaction) {
    const name = categoryById.get(t.categoryId)?.name ?? '';
    if (!window.confirm(`${formatDate(t.date)} ${name} ${formatYen(t.amount)} を削除しますか？`)) return;
    await deleteTransaction(t.id);
  }

  async function handleUpdate(id: Id, input: TransactionInput) {
    await updateTransaction(id, input);
    setEditingId(null);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs text-slate-500">
          <tr>
            <th className="w-28 px-4 py-2 font-medium">日付</th>
            <th className="w-40 px-4 py-2 font-medium">カテゴリ</th>
            <th className="px-4 py-2 font-medium">メモ</th>
            <th className="w-36 px-4 py-2 text-right font-medium">金額</th>
            <th className="w-32 px-4 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {transactions.map((t) => {
            if (t.id === editingId) {
              return (
                <tr key={t.id} className="bg-slate-50">
                  <td colSpan={5} className="px-4 py-3">
                    <TransactionForm
                      categories={categories}
                      initial={t}
                      submitLabel="保存"
                      onSubmit={(input) => handleUpdate(t.id, input)}
                      onCancel={() => setEditingId(null)}
                    />
                  </td>
                </tr>
              );
            }
            const category = categoryById.get(t.categoryId);
            return (
              <tr key={t.id} className="group hover:bg-slate-50">
                <td className="px-4 py-2 tabular-nums text-slate-600">{formatDate(t.date)}</td>
                <td className="px-4 py-2">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="inline-block size-2.5 rounded-full"
                      style={{ backgroundColor: category?.color ?? '#94a3b8' }}
                      aria-hidden
                    />
                    {category?.name ?? '（不明）'}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {t.recurringId && (
                    <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">固定</span>
                  )}
                  {t.memo}
                </td>
                <td
                  className={`px-4 py-2 text-right font-medium tabular-nums ${
                    t.type === 'income' ? 'text-emerald-700' : 'text-slate-800'
                  }`}
                >
                  {t.type === 'income' ? '+' : '−'}
                  {formatYen(t.amount)}
                </td>
                <td className="px-4 py-2 text-right">
                  <span className="invisible space-x-1 group-focus-within:visible group-hover:visible">
                    <button
                      type="button"
                      onClick={() => setEditingId(t.id)}
                      className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-200"
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(t)}
                      className="rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                    >
                      削除
                    </button>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
