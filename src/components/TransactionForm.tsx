import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { selectableCategories } from '../domain/categories';
import { parseAmount } from '../domain/money';
import DateField from './DateField';
import SubcategoryInput from './SubcategoryInput';
import { resolveSubcategory } from '../db/repository';
import { useSubcategories } from '../hooks/useData';
import { isValidISODate, today } from '../domain/period';
import type { Category, EntryType, TransactionInput } from '../domain/types';

interface Props {
  /** 全カテゴリ（アーカイブ済みを含む） */
  categories: readonly Category[];
  /** 編集時の初期値。未指定なら新規入力 */
  initial?: TransactionInput;
  /** 新規入力時の日付の初期値（既定は今日） */
  defaultDate?: string;
  submitLabel?: string;
  onSubmit: (input: TransactionInput) => Promise<void>;
  onCancel?: () => void;
}

const TYPE_LABELS: Record<EntryType, string> = { expense: '支出', income: '収入' };

const inputClass =
  'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none';

export default function TransactionForm({
  categories,
  initial,
  defaultDate,
  submitLabel = '追加',
  onSubmit,
  onCancel,
}: Props) {
  const isEdit = initial !== undefined;
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? today());
  const [type, setType] = useState<EntryType>(initial?.type ?? 'expense');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [memo, setMemo] = useState(initial?.memo ?? '');
  const subcategories = useSubcategories({ includeArchived: true });
  const initialSubName = subcategories?.find((sc) => sc.id === initial?.subcategoryId)?.name ?? '';
  const [subName, setSubName] = useState<string | null>(null);
  // 編集時は、小分類の読み込み後に初期値を入れる（null = まだ触っていない）
  const subValue = subName ?? initialSubName;
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  const options = useMemo(
    () => selectableCategories(categories, type, initial?.categoryId),
    [categories, type, initial?.categoryId],
  );

  // 種別の切り替えやカテゴリ読み込み後に、選択中のカテゴリが候補になければ先頭を選ぶ
  useEffect(() => {
    if (!options.some((c) => c.id === categoryId)) setCategoryId(options[0]?.id ?? '');
  }, [options, categoryId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = parseAmount(amount);
    if (parsed === null || parsed <= 0) return setError('金額は1円以上の整数で入力してください');
    if (!isValidISODate(date)) return setError('日付を正しく入力してください');
    if (!categoryId) return setError('カテゴリを選択してください');

    setSaving(true);
    try {
      const subcategoryId = await resolveSubcategory(categoryId, subValue);
      await onSubmit({ date, type, amount: parsed, categoryId, subcategoryId, memo });
      setError(null);
      if (!isEdit) {
        // 連続入力しやすいよう、日付・種別・カテゴリは残す
        setAmount('');
        setSubName('');
        setMemo('');
        amountRef.current?.focus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && onCancel) onCancel();
      }}
      aria-label={isEdit ? '取引の編集' : '取引の追加'}
    >
      <div className="grid grid-cols-2 gap-3 md:flex md:flex-wrap md:items-end">
        <div className="col-span-2 flex flex-col gap-1">
          <span className="text-xs text-slate-500">種別</span>
          <div className="flex overflow-hidden rounded-md border border-slate-300" role="group" aria-label="種別">
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={type === t}
                onClick={() => {
                  setType(t);
                  if (t !== type) setSubName('');
                }}
                className={`flex-1 px-4 py-2 text-sm md:flex-none ${
                  type === t
                    ? t === 'expense'
                      ? 'bg-rose-600 text-white'
                      : 'bg-emerald-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <span className="text-xs text-slate-500">日付</span>
          <DateField label="日付" value={date} onChange={setDate} />
        </div>
        <label className="col-span-2 flex flex-col gap-1">
          <span className="text-xs text-slate-500">金額（円）</span>
          <input
            ref={amountRef}
            type="text"
            inputMode="numeric"
            autoFocus={!isEdit}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className={`${inputClass} w-full text-right tabular-nums md:w-32`}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-xs text-slate-500">カテゴリ</span>
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setSubName('');
            }}
            className={`${inputClass} w-full md:w-36`}
          >
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.archived ? '（アーカイブ済）' : ''}
              </option>
            ))}
          </select>
        </label>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-xs text-slate-500">小分類（任意）</span>
          <SubcategoryInput
            label="小分類"
            categoryId={categoryId}
            subcategories={subcategories ?? []}
            value={subValue}
            onChange={setSubName}
            className={`${inputClass} w-full md:w-36`}
          />
        </div>
        <label className="col-span-2 flex min-w-40 flex-1 flex-col gap-1">
          <span className="text-xs text-slate-500">メモ</span>
          <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} className={inputClass} />
        </label>
        <div className="col-span-2 flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-md bg-slate-800 px-5 py-2.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50 md:flex-none md:py-2"
          >
            {submitLabel}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-md border border-slate-300 px-4 py-2.5 text-sm hover:bg-slate-100 md:flex-none md:py-2"
            >
              キャンセル
            </button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}
