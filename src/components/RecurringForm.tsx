import { useMemo, useState, type FormEvent } from 'react';
import { selectableCategories } from '../domain/categories';
import { parseAmount } from '../domain/money';
import type { Category, EntryType, RecurringRuleInput, YearMonth } from '../domain/types';

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
  const [name, setName] = useState(initial?.name ?? '');
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
    try {
      await onSubmit({
        type,
        name,
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
      <div className="flex flex-wrap items-end gap-3">
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
          <span className="text-xs text-slate-500">名前</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="家賃"
            className={`${inputClass} w-40`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">カテゴリ</span>
          <select value={selectedCategory} onChange={(e) => setCategoryId(e.target.value)} className={`${inputClass} w-36`}>
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">金額の目安（円）</span>
          <input
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`${inputClass} w-32 text-right tabular-nums`}
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
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">終了月（任意）</span>
          <input type="month" value={endMonth} onChange={(e) => setEndMonth(e.target.value)} className={inputClass} />
        </label>
        <div className="flex gap-2">
          <button type="submit" className="rounded-md bg-slate-800 px-5 py-2 text-sm text-white hover:bg-slate-700">
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
