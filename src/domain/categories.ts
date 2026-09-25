import type { Category, EntryType, Id } from './types';

/**
 * 入力フォームで選べるカテゴリ。種別が一致し、アーカイブされていないもの。
 * 編集中の取引が既にアーカイブ済みカテゴリを使っている場合は、それも含める。
 */
export function selectableCategories(
  categories: readonly Category[],
  type: EntryType,
  currentId?: Id,
): Category[] {
  return categories
    .filter((c) => c.type === type && (!c.archived || c.id === currentId))
    .sort((a, b) => a.order - b.order);
}
