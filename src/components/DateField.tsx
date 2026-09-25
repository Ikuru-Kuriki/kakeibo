import { useRef } from 'react';
import { addDays, formatDateJa, isValidISODate } from '../domain/period';

interface Props {
  value: string;
  onChange: (date: string) => void;
  /** 入力欄の名前（読み上げ・テスト用） */
  label: string;
}

const stepButton = 'px-3 text-slate-500 hover:bg-slate-100 hover:text-slate-800 md:px-2';

/**
 * 日付の入力。ブラウザ標準の日付欄は、Chrome の日本語表示で曜日の欄が「()」と空になるため、
 * 表示は自前で「2026/9/25（金）」とし、カレンダーはブラウザ標準のものを開く。
 */
export default function DateField({ value, onChange, label }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    const input = inputRef.current;
    if (!input) return;
    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  }

  const valid = isValidISODate(value);

  return (
    <div className="relative flex h-[42px] w-full items-stretch overflow-hidden rounded-md border border-slate-300 bg-white text-sm focus-within:border-slate-500 md:inline-flex md:h-[38px] md:w-auto">
      <button
        type="button"
        className={stepButton}
        aria-label="前の日"
        disabled={!valid}
        onClick={() => onChange(addDays(value, -1))}
      >
        ‹
      </button>
      <button
        type="button"
        onClick={openPicker}
        onKeyDown={(e) => {
          if (!valid) return;
          if (e.key === 'ArrowLeft') onChange(addDays(value, -1));
          if (e.key === 'ArrowRight') onChange(addDays(value, 1));
        }}
        aria-label={`${label}: ${valid ? formatDateJa(value) : '未入力'}（クリックでカレンダー、←→で1日ずつ）`}
        className="min-w-36 flex-1 px-2 text-center tabular-nums hover:bg-slate-50 focus:outline-none md:flex-none md:text-left"
      >
        {valid ? formatDateJa(value) : '日付を選ぶ'}
      </button>
      <button
        type="button"
        className={stepButton}
        aria-label="次の日"
        disabled={!valid}
        onClick={() => onChange(addDays(value, 1))}
      >
        ›
      </button>
      {/* カレンダーを開くためのブラウザ標準の日付欄（見た目には出さない） */}
      <input
        ref={inputRef}
        type="date"
        aria-label={label}
        tabIndex={-1}
        value={value}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="pointer-events-none absolute bottom-0 left-8 h-px w-px opacity-0"
      />
    </div>
  );
}
