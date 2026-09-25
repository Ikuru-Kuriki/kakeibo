import { useState } from 'react';
import { formatYen } from '../domain/money';
import { formatMonthDayJa } from '../domain/period';
import type { Category, Id, Transaction, TransactionInput } from '../domain/types';
import { deleteTransaction, updateTransaction } from '../db/repository';
import TransactionForm from './TransactionForm';
import { useSubcategories } from '../hooks/useData';

interface Props {
  transactions: readonly Transaction[];
  /** 全カテゴリ（アーカイブ済みを含む） */
  categories: readonly Category[];
}

const formatDate = formatMonthDayJa;

export default function TransactionList({ transactions, categories }: Props) {
  const [editingId, setEditingId] = useState<Id | null>(null);
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const subcategories = useSubcategories({ includeArchived: true });
  const subName = (id: Id | null | undefined) => (id ? subcategories?.find((sc) => sc.id === id)?.name : undefined);

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
      <table className="block w-full text-sm md:table">
        <thead className="hidden bg-slate-50 text-left text-xs text-slate-500 md:table-header-group">
          <tr>
            <th className="w-28 px-4 py-2 font-medium">日付</th>
            <th className="w-56 px-4 py-2 font-medium">カテゴリ › 小分類</th>
            <th className="px-4 py-2 font-medium">メモ</th>
            <th className="w-36 px-4 py-2 text-right font-medium">金額</th>
            <th className="w-32 px-4 py-2" />
          </tr>
        </thead>
        <tbody className="block divide-y divide-slate-100 md:table-row-group">
          {transactions.map((t) => {
            if (t.id === editingId) {
              return (
                <tr key={t.id} className="block bg-slate-50 md:table-row">
                  <td colSpan={5} className="block px-4 py-3 md:table-cell">
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
              <tr
                key={t.id}
                className="group grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-x-2 px-3 py-2 hover:bg-slate-50 md:table-row md:p-0"
              >
                <td className="text-xs tabular-nums text-slate-600 md:table-cell md:px-4 md:py-2 md:text-sm">
                  {formatDate(t.date)}
                </td>
                <td className="min-w-0 md:table-cell md:px-4 md:py-2">
                  <span className="inline-flex max-w-full flex-wrap items-center gap-x-2">
                    <span
                      className="inline-block size-2.5 rounded-full"
                      style={{ backgroundColor: category?.color ?? '#94a3b8' }}
                      aria-hidden
                    />
                    {category?.name ?? '（不明）'}
                    {subName(t.subcategoryId) && (
                      <span className="text-slate-500">› {subName(t.subcategoryId)}</span>
                    )}
                  </span>
                </td>
                <td
                  className={`col-span-2 col-start-1 row-start-2 text-xs text-slate-500 md:table-cell md:px-4 md:py-2 md:text-sm md:text-slate-600 ${
                    !t.memo && !t.recurringId ? 'hidden' : ''
                  }`}
                >
                  {t.recurringId && (
                    <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">固定</span>
                  )}
                  {t.memo}
                </td>
                <td
                  className={`col-start-3 row-start-1 text-right font-medium tabular-nums md:table-cell md:px-4 md:py-2 ${
                    t.type === 'income' ? 'text-emerald-700' : 'text-slate-800'
                  }`}
                >
                  {t.type === 'income' ? '+' : '−'}
                  {formatYen(t.amount)}
                </td>
                <td className="col-start-3 row-start-2 text-right md:table-cell md:px-4 md:py-2">
                  {/* スマホではマウスを乗せられないので常に表示 */}
                  <span className="space-x-1 md:invisible md:group-focus-within:visible md:group-hover:visible">
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
