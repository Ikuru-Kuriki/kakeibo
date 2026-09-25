import { addMonths, formatYearMonthJa } from '../domain/period';
import type { YearMonth } from '../domain/types';

interface Props {
  value: YearMonth;
  onChange: (ym: YearMonth) => void;
  /** これより後の月には進めない */
  max?: YearMonth;
  /** 年月を直接選べる入力欄を出す */
  picker?: boolean;
}

const buttonClass =
  'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40';

export default function MonthSwitcher({ value, onChange, max, picker = false }: Props) {
  const next = addMonths(value, 1);
  const canNext = !max || next <= max;
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={buttonClass} onClick={() => onChange(addMonths(value, -1))} aria-label="前の月">
        ‹ 前月
      </button>
      {picker ? (
        <input
          type="month"
          aria-label="年月を選ぶ"
          value={value}
          max={max}
          onChange={(e) => {
            if (/^\d{4}-\d{2}$/.test(e.target.value) && (!max || e.target.value <= max)) onChange(e.target.value);
          }}
          className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm tabular-nums"
        />
      ) : (
        <span className="min-w-28 text-center font-medium tabular-nums" aria-live="polite">
          {formatYearMonthJa(value)}
        </span>
      )}
      <button type="button" className={buttonClass} onClick={() => onChange(next)} disabled={!canNext} aria-label="次の月">
        翌月 ›
      </button>
      {max && value !== max && (
        <button type="button" className={buttonClass} onClick={() => onChange(max)}>
          今月
        </button>
      )}
    </div>
  );
}
