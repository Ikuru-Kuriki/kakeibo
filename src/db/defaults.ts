import type { EntryType } from '../domain/types';

/**
 * カテゴリの色。グラフで隣り合っても見分けられる（色覚多様性を含む）ことを検証済みの 8 色。
 * 支出カテゴリにはこの順で割り当てる。9 色目以降は色を増やさず「その他」の灰色にまとめる。
 */
export const CATEGORY_PALETTE = [
  '#2a78d6', // 青
  '#eb6834', // 橙
  '#1baf7a', // 青緑
  '#eda100', // 黄
  '#e87ba4', // 桃
  '#008300', // 緑
  '#4a3aa7', // 紫
  '#e34948', // 赤
] as const;

/** 「その他」やグラフでまとめた区分に使う中立色 */
export const NEUTRAL_COLOR = '#898781';

const p = CATEGORY_PALETTE;

/** 初回起動時に作成するカテゴリ */
export const DEFAULT_CATEGORIES: ReadonlyArray<{ name: string; type: EntryType; color: string }> = [
  { name: '食費', type: 'expense', color: p[0] },
  { name: '日用品', type: 'expense', color: p[1] },
  { name: '住居', type: 'expense', color: p[2] },
  { name: '水道光熱', type: 'expense', color: p[3] },
  { name: '通信', type: 'expense', color: p[4] },
  { name: '交通', type: 'expense', color: p[5] },
  { name: '医療', type: 'expense', color: p[6] },
  { name: '娯楽・交際', type: 'expense', color: p[7] },
  { name: 'その他', type: 'expense', color: NEUTRAL_COLOR },
  { name: '給与', type: 'income', color: p[0] },
  { name: 'その他収入', type: 'income', color: p[1] },
];

/**
 * v1 の既定カテゴリの色 → 新しい色。DB v2 のマイグレーションで、
 * 名前と色が初期状態のままのカテゴリだけを塗り替えるのに使う。
 */
export const V1_DEFAULT_COLOR_MIGRATION: ReadonlyArray<{ name: string; from: string; to: string }> = [
  { name: '食費', from: '#ef4444', to: p[0] },
  { name: '日用品', from: '#f97316', to: p[1] },
  { name: '住居', from: '#eab308', to: p[2] },
  { name: '水道光熱', from: '#84cc16', to: p[3] },
  { name: '通信', from: '#14b8a6', to: p[4] },
  { name: '交通', from: '#06b6d4', to: p[5] },
  { name: '医療', from: '#3b82f6', to: p[6] },
  { name: '娯楽', from: '#8b5cf6', to: p[7] },
  { name: 'その他', from: '#78716c', to: NEUTRAL_COLOR },
  { name: '給与', from: '#16a34a', to: p[0] },
  { name: 'その他収入', from: '#0d9488', to: p[1] },
];
