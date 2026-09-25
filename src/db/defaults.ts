import type { EntryType } from '../domain/types';

/** 初回起動時に作成するカテゴリ */
export const DEFAULT_CATEGORIES: ReadonlyArray<{ name: string; type: EntryType; color: string }> = [
  { name: '食費', type: 'expense', color: '#ef4444' },
  { name: '日用品', type: 'expense', color: '#f97316' },
  { name: '住居', type: 'expense', color: '#eab308' },
  { name: '水道光熱', type: 'expense', color: '#84cc16' },
  { name: '通信', type: 'expense', color: '#14b8a6' },
  { name: '交通', type: 'expense', color: '#06b6d4' },
  { name: '医療', type: 'expense', color: '#3b82f6' },
  { name: '娯楽', type: 'expense', color: '#8b5cf6' },
  { name: '交際', type: 'expense', color: '#d946ef' },
  { name: 'その他', type: 'expense', color: '#78716c' },
  { name: '給与', type: 'income', color: '#16a34a' },
  { name: 'その他収入', type: 'income', color: '#0d9488' },
];
