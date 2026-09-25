import { describe, expect, it } from 'vitest';
import { selectableCategories } from './categories';
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
