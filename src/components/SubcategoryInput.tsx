import { useId } from 'react';
import type { Id, Subcategory } from '../domain/types';

interface Props {
  categoryId: Id;
  /** 全小分類（アーカイブ済みを含んでもよい。候補には使用中のものだけ出す） */
  subcategories: readonly Subcategory[];
  value: string;
  onChange: (name: string) => void;
  label: string;
  placeholder?: string;
  className?: string;
}

/**
 * 小分類の入力。選択中のカテゴリの小分類を候補（プルダウン）に出し、
 * 候補にない名前を入力すると保存時に新しい小分類として登録される。
 */
export default function SubcategoryInput({ categoryId, subcategories, value, onChange, label, placeholder, className }: Props) {
  const listId = useId();
  const options = subcategories.filter((sc) => sc.categoryId === categoryId && !sc.archived);
  return (
    <>
      <input
        type="text"
        list={listId}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? (options.length > 0 ? '選択または入力' : '入力すると登録')}
        autoComplete="off"
        className={className}
      />
      <datalist id={listId}>
        {options.map((sc) => (
          <option key={sc.id} value={sc.name} />
        ))}
      </datalist>
    </>
  );
}
