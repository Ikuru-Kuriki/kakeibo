import { useState } from 'react';
import { Link } from 'react-router';
import { formatYen, parseAmount } from '../domain/money';
import { formatMonthDayJa, formatYearMonthJa, today } from '../domain/period';
import { occurrenceKey, type PendingOccurrence } from '../domain/recurring';
import { confirmRecurring, skipRecurring, unskipRecurring } from '../db/repository';
import { NEUTRAL_COLOR } from '../db/defaults';
import { useCategories, usePendingRecurring } from '../hooks/useData';

function PendingRow({
  item,
  categoryName,
  color,
  onSkipped,
}: {
  item: PendingOccurrence;
  categoryName: string;
  color: string;
  onSkipped: (item: PendingOccurrence) => void;
}) {
  const [amount, setAmount] = useState(item.rule.amount.toLocaleString('ja-JP'));
  const [error, setError] = useState<string | null>(null);
  const upcoming = item.date > today();

  async function run(action: () => Promise<unknown>) {
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました');
    }
  }

  function confirm() {
    const parsed = parseAmount(amount);
    if (parsed === null || parsed <= 0) return setError('金額は1円以上の整数で入力してください');
    void run(() => confirmRecurring(item.rule.id, item.month, { amount: parsed }));
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-sm">
      <span className="w-32 whitespace-nowrap tabular-nums text-slate-600">
        {formatMonthDayJa(item.date)}
        {upcoming && <span className="ml-1 text-xs text-slate-400">予定</span>}
      </span>
      <span className="inline-flex w-40 items-center gap-2">
        <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
        <span className="font-medium">{item.rule.name}</span>
      </span>
      <span className="w-24 text-slate-500">{categoryName}</span>
      <span className="inline-flex items-center gap-1">
        <span className="text-slate-500">{item.rule.type === 'income' ? '+' : '−'}</span>
        <input
          type="text"
          inputMode="numeric"
          aria-label={`${item.rule.name}（${formatYearMonthJa(item.month)}分）の金額`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && confirm()}
          className="w-28 rounded-md border border-slate-300 px-2 py-1 text-right tabular-nums focus:border-slate-500 focus:outline-none"
        />
        <span className="text-slate-500">円</span>
      </span>
      <span className="ml-auto flex gap-2">
        <button
          type="button"
          onClick={confirm}
          className="rounded-md bg-slate-800 px-3 py-1 text-white hover:bg-slate-700"
          aria-label={`${item.rule.name}（${formatYearMonthJa(item.month)}分）を確定`}
        >
          確定
        </button>
        <button
          type="button"
          onClick={() =>
            void run(async () => {
              // 先に「元に戻す」を出しておき、最後の1件でもカードが一瞬消えないようにする
              onSkipped(item);
              await skipRecurring(item.rule.id, item.month);
            })
          }
          className="rounded-md border border-slate-300 px-3 py-1 text-slate-600 hover:bg-slate-100"
          aria-label={`${item.rule.name}（${formatYearMonthJa(item.month)}分）はなし`}
        >
          この月はなし
        </button>
      </span>
      {error && (
        <p role="alert" className="w-full text-red-600">
          {error}
        </p>
      )}
    </li>
  );
}

/** 確認待ちの固定費。1件もなければ何も表示しない */
export default function PendingRecurring({ showSettingsLink = true }: { showSettingsLink?: boolean }) {
  const pending = usePendingRecurring();
  const categories = useCategories({ includeArchived: true });
  const [lastSkipped, setLastSkipped] = useState<PendingOccurrence | null>(null);
  // 最後の1件を「なし」にしても、元に戻せるようカードは残す
  if (!pending || !categories || (pending.length === 0 && !lastSkipped)) return null;
  const byId = new Map(categories.map((c) => [c.id, c]));

  async function confirmAll() {
    for (const p of pending!) await confirmRecurring(p.rule.id, p.month);
  }

  const total = pending.reduce((sum, p) => sum + (p.rule.type === 'expense' ? p.rule.amount : 0), 0);

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50/60 p-5" aria-label="確認待ちの固定費">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold">
          確認待ちの固定費（{pending.length}件{total > 0 && `・支出 ${formatYen(total)}`}）
        </h3>
        <div className="flex items-center gap-3 text-sm">
          {showSettingsLink && (
            <Link to="/recurring" className="text-slate-600 underline hover:text-slate-900">
              固定費の設定
            </Link>
          )}
          {pending.length > 0 && (
          <button
            type="button"
            onClick={() => void confirmAll()}
            className="rounded-md border border-slate-300 bg-white px-3 py-1 hover:bg-slate-100"
          >
            すべて目安の金額で確定
          </button>
          )}
        </div>
      </div>
      <p className="mb-2 text-xs text-slate-500">
        金額が違うときは直してから「確定」してください。確定すると取引として記録されます。
      </p>
      {lastSkipped && (
        <p className="mb-2 flex items-center gap-3 rounded-md bg-white px-3 py-2 text-sm text-slate-600">
          {lastSkipped.rule.name}（{formatYearMonthJa(lastSkipped.month)}分）を「なし」にしました。
          <button
            type="button"
            onClick={() =>
              void unskipRecurring(lastSkipped.rule.id, lastSkipped.month).then(() => setLastSkipped(null))
            }
            className="font-medium text-slate-800 underline hover:text-slate-950"
          >
            元に戻す
          </button>
          <button
            type="button"
            aria-label="閉じる"
            onClick={() => setLastSkipped(null)}
            className="ml-auto text-slate-400 hover:text-slate-700"
          >
            ×
          </button>
        </p>
      )}
      <ul className="divide-y divide-amber-100">
        {pending.map((p) => {
          const c = byId.get(p.rule.categoryId);
          return (
            <PendingRow
              key={occurrenceKey(p.rule.id, p.month)}
              item={p}
              categoryName={c?.name ?? '（不明）'}
              color={c?.color ?? NEUTRAL_COLOR}
              onSkipped={setLastSkipped}
            />
          );
        })}
      </ul>
    </section>
  );
}
