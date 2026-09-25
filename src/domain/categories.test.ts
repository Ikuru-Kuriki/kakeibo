import { describe, expect, it } from 'vitest';
import { selectableCategories, suggestColor } from './categories';
import type { Category, EntryType } from './types';

const cat = (id: string, type: EntryType, order: number, archived = false): Category => ({
  id,
  name: id,
  type,
  color: '#000000',
  order,
  archived,
  createdAt: '',
  updatedAt: '',
  deletedAt: null,
});

describe('selectableCategories', () => {
  const categories = [cat('b', 'expense', 1), cat('a', 'expense', 0), cat('old', 'expense', 2, true), cat('salary', 'income', 3)];

  it('種別が一致し、アーカイブされていないものを表示順で返す', () => {
    expect(selectableCategories(categories, 'expense').map((c) => c.id)).toEqual(['a', 'b']);
    expect(selectableCategories(categories, 'income').map((c) => c.id)).toEqual(['salary']);
  });

  it('編集中の取引が使っているアーカイブ済みカテゴリは含める', () => {
    expect(selectableCategories(categories, 'expense', 'old').map((c) => c.id)).toEqual(['a', 'b', 'old']);
  });
});

describe('suggestColor', () => {
  const palette = ['#111111', '#222222', '#333333'];
  const withColor = (id: string, color: string, archived = false) => ({ ...cat(id, 'expense', 0, archived), color });
  it('未使用の色をパレット順に選ぶ（アーカイブ済み・別種別は数えない）', () => {
    expect(suggestColor([withColor('a', '#111111'), withColor('b', '#222222', true)], 'expense', palette)).toBe('#222222');
  });
  it('全部使われていれば最も使用数の少ない色', () => {
    const cats = [withColor('a', '#111111'), withColor('b', '#111111'), withColor('c', '#222222'), withColor('d', '#333333'), withColor('e', '#222222')];
    expect(suggestColor(cats, 'expense', palette)).toBe('#333333');
  });
});
