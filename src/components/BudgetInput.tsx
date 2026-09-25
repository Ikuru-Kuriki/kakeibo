import { useEffect, useRef, useState } from 'react';
import { parseAmount } from '../domain/money';

interface Props {
  /** 保存済みの値（未設定は null） */
  value: number | null;
  /** 未入力のときに薄く見せる値（前月の予算など） */
  placeholder?: number | null;
  label: string;
  onSave: (amount: number | null) => Promise<void>;
}

const format = (n: number | null) => (n === null ? '' : n.toLocaleString('ja-JP'));

/** 予算額の入力欄。フォーカスを外すか Enter で自動保存する。空欄で「未設定」に戻る */
export default function BudgetInput({ value, placeholder, label, onSave }: Props) {
  const [text, setText] = useState(format(value));
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  // 他の操作（コピーや参考値クリック）で値が変わったら、入力中でなければ反映する
  useEffect(() => {
    if (document.activeElement !== inputRef.current) setText(format(value));
  }, [value]);

  async function commit() {
    const trimmed = text.trim();
    const amount = trimmed === '' ? null : parseAmount(trimmed);
    if (trimmed !== '' && amount === null) {
      setStatus('error');
      return;
    }
    setText(format(amount));
    if (amount === value) {
      setStatus('idle');
      return;
    }
    try {
      await onSave(amount);
      setStatus('saved');
      window.setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 1500);
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <span className="w-4 text-center text-xs" aria-live="polite">
        {status === 'saved' && <span className="text-emerald-600">✓</span>}
      </span>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        aria-label={label}
        data-budget-input
        aria-invalid={status === 'error'}
        value={text}
        placeholder={placeholder != null ? placeholder.toLocaleString('ja-JP') : '未設定'}
        onChange={(e) => {
          setText(e.target.value);
          if (status === 'error') setStatus('idle');
        }}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            // 保存して次のカテゴリの入力欄へ（フォーカスが外れると blur で保存される）
            const inputs = [...document.querySelectorAll<HTMLInputElement>('input[data-budget-input]')];
            const next = inputs[inputs.indexOf(e.currentTarget) + 1];
            if (next) next.focus();
            else void commit();
          }
          if (e.key === 'Escape') {
            setText(format(value));
            setStatus('idle');
          }
        }}
        className={`w-32 rounded-md border px-3 py-1.5 text-right text-sm tabular-nums focus:outline-none ${
          status === 'error'
            ? 'border-red-400 focus:border-red-500'
            : 'border-slate-300 focus:border-slate-500'
        } placeholder:text-slate-300`}
      />
      {status === 'error' && <span className="sr-only">0以上の整数で入力してください</span>}
    </div>
  );
}
