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

/**
 * 新しいカテゴリに提案する色。同じ種別の使用中カテゴリでまだ使われていない色を palette の順に選ぶ。
 * すべて使われていれば、使っている数が最も少ない色（色を増やすと見分けにくくなるため）。
 */
export function suggestColor(categories: readonly Category[], type: EntryType, palette: readonly string[]): string {
  const counts = new Map(palette.map((c) => [c.toLowerCase(), 0]));
  for (const c of categories) {
    if (c.type !== type || c.archived) continue;
    const key = c.color.toLowerCase();
    if (counts.has(key)) counts.set(key, counts.get(key)! + 1);
  }
  let best = palette[0]!;
  for (const color of palette) {
    if (counts.get(color.toLowerCase())! < counts.get(best.toLowerCase())!) best = color;
  }
  return best;
}
