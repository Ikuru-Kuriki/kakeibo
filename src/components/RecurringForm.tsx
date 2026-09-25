import { useMemo, useState, type FormEvent } from 'react';
import { selectableCategories } from '../domain/categories';
import { parseAmount } from '../domain/money';
import type { Category, EntryType, RecurringRuleInput, YearMonth } from '../domain/types';
import { resolveSubcategory } from '../db/repository';
import { useSubcategories } from '../hooks/useData';
import SubcategoryInput from './SubcategoryInput';

interface Props {
  categories: readonly Category[];
  initial?: RecurringRuleInput;
  defaultStartMonth: YearMonth;
  submitLabel: string;
  onSubmit: (input: RecurringRuleInput) => Promise<void>;
  onCancel?: () => void;
}

const inputClass =
  'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none';

export default function RecurringForm({ categories, initial, defaultStartMonth, submitLabel, onSubmit, onCancel }: Props) {
  const [type, setType] = useState<EntryType>(initial?.type ?? 'expense');
  const subcategories = useSubcategories({ includeArchived: true });
  const initialName = subcategories?.find((sc) => sc.id === initial?.subcategoryId)?.name ?? '';
  const [nameInput, setName] = useState<string | null>(null);
  const name = nameInput ?? initialName;
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [day, setDay] = useState(String(initial?.dayOfMonth ?? 27));
  const [startMonth, setStartMonth] = useState(initial?.startMonth ?? defaultStartMonth);
  const [endMonth, setEndMonth] = useState(initial?.endMonth ?? '');
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(
    () => selectableCategories(categories, type, initial?.categoryId),
    [categories, type, initial?.categoryId],
  );
  const selectedCategory = options.some((c) => c.id === categoryId) ? categoryId : (options[0]?.id ?? '');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = parseAmount(amount);
    if (parsed === null || parsed <= 0) return setError('金額は1円以上の整数で入力してください');
    if (!name.trim()) return setError('小分類（名前）を入力してください');
    try {
      const subcategoryId = await resolveSubcategory(selectedCategory, name);
      await onSubmit({
        type,
        subcategoryId: subcategoryId!,
        categoryId: selectedCategory,
        amount: parsed,
        dayOfMonth: Number(day),
        startMonth,
        endMonth: endMonth || null,
      });
      setError(null);
      if (!initial) {
        setName('');
        setAmount('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label={initial ? '固定費の編集' : '固定費の追加'}>
      <div className="grid grid-cols-2 gap-3 md:flex md:flex-wrap md:items-end">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">種別</span>
          <div className="flex overflow-hidden rounded-md border border-slate-300" role="group" aria-label="種別">
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={type === t}
                onClick={() => setType(t)}
                className={`px-3 py-2 text-sm ${
                  type === t
                    ? t === 'expense'
                      ? 'bg-rose-600 text-white'
                      : 'bg-emerald-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t === 'expense' ? '支出' : '収入'}
              </button>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">カテゴリ</span>
          <select
            value={selectedCategory}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setName('');
            }}
            className={`${inputClass} w-full md:w-36`}
          >
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">小分類（名前）</span>
          <SubcategoryInput
            label="小分類（名前）"
            categoryId={selectedCategory}
            subcategories={subcategories ?? []}
            value={name}
            onChange={setName}
            placeholder="家賃"
            className={`${inputClass} w-full md:w-40`}
          />
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">金額の目安（円）</span>
          <input
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`${inputClass} w-full text-right tabular-nums md:w-32`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">毎月の日</span>
          <span className="inline-flex items-center gap-1 text-sm">
            <input
              type="number"
              aria-label="毎月の日"
              min={1}
              max={31}
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className={`${inputClass} w-20 text-right`}
            />
            日
          </span>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">開始月</span>
          <input
            type="month"
            required
            value={startMonth}
            onChange={(e) => setStartMonth(e.target.value)}
            className={`${inputClass} w-full md:w-auto`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">終了月（任意）</span>
          <input
            type="month"
            value={endMonth}
            onChange={(e) => setEndMonth(e.target.value)}
            className={`${inputClass} w-full md:w-auto`}
          />
        </label>
        <div className="col-span-2 flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-md bg-slate-800 px-5 py-2.5 text-sm text-white hover:bg-slate-700 md:flex-none md:py-2"
          >
            {submitLabel}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
            >
              キャンセル
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">31日などその月にない日は、月末として扱います。</p>
      {error && (
        <p role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}
