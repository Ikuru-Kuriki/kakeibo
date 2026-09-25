import { useState, type FormEvent } from 'react';
import { suggestColor } from '../domain/categories';
import type { Category, EntryType, Subcategory } from '../domain/types';
import { CATEGORY_PALETTE, NEUTRAL_COLOR } from '../db/defaults';
import {
  addCategory,
  archiveCategory,
  archiveSubcategory,
  moveCategory,
  renameSubcategory,
  resolveSubcategory,
  updateCategory,
} from '../db/repository';
import { useCategories, useSubcategories } from '../hooks/useData';

const SWATCHES = [...CATEGORY_PALETTE, NEUTRAL_COLOR];
const TYPE_LABELS: Record<EntryType, string> = { expense: '支出', income: '収入' };

const smallButton =
  'rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-30';

function ColorPicker({ value, onChange, label }: { value: string; onChange: (c: string) => void; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={label}>
      {SWATCHES.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value.toLowerCase() === c}
          aria-label={c}
          onClick={() => onChange(c)}
          className={`size-6 rounded-full ring-offset-2 ${value.toLowerCase() === c ? 'ring-2 ring-slate-800' : ''}`}
          style={{ backgroundColor: c }}
        />
      ))}
      <label className="ml-1 inline-flex items-center gap-1 text-xs text-slate-500">
        その他の色
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-8 cursor-pointer rounded border border-slate-300"
        />
      </label>
    </div>
  );
}


function SubcategoryName({ sub, onError }: { sub: Subcategory; onError: (m: string | null) => void }) {
  const [name, setName] = useState(sub.name);
  async function save() {
    if (name.trim() === sub.name) return setName(sub.name);
    try {
      await renameSubcategory(sub.id, name);
      onError(null);
    } catch (e) {
      onError(e instanceof Error ? e.message : '保存に失敗しました');
      setName(sub.name);
    }
  }
  return (
    <input
      type="text"
      aria-label={`小分類「${sub.name}」の名前`}
      value={name}
      onChange={(e) => setName(e.target.value)}
      onBlur={() => void save()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') setName(sub.name);
      }}
      className="w-40 rounded-md border border-transparent px-2 py-0.5 text-sm hover:border-slate-300 focus:border-slate-500 focus:outline-none"
    />
  );
}

function SubcategoryPanel({ category, subcategories }: { category: Category; subcategories: readonly Subcategory[] }) {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const active = subcategories.filter((sc) => !sc.archived);
  const archived = subcategories.filter((sc) => sc.archived);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await resolveSubcategory(category.id, newName);
    setNewName('');
  }

  return (
    <div className="mt-2 ml-8 rounded-md bg-slate-50 p-3 text-sm">
      {active.length === 0 && <p className="mb-2 text-xs text-slate-500">小分類はまだありません</p>}
      <ul className="space-y-1">
        {active.map((sc) => (
          <li key={`${sc.id}-${sc.name}`} className="flex items-center gap-2">
            <SubcategoryName sub={sc} onError={setError} />
            <button type="button" className={smallButton} onClick={() => void archiveSubcategory(sc.id)}>
              アーカイブ
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-1 text-red-600">
          {error}
        </p>
      )}
      <form onSubmit={add} className="mt-2 flex items-center gap-2" aria-label={`${category.name}の小分類の追加`}>
        <input
          type="text"
          aria-label="新しい小分類"
          placeholder="新しい小分類"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="w-40 rounded-md border border-slate-300 bg-white px-2 py-0.5 focus:border-slate-500 focus:outline-none"
        />
        <button type="submit" className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-white hover:bg-slate-700">
          追加
        </button>
      </form>
      {archived.length > 0 && (
        <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          アーカイブ済み:
          {archived.map((sc) => (
            <span key={sc.id} className="inline-flex items-center gap-1 rounded bg-white py-0.5 pr-0.5 pl-2">
              {sc.name}
              <button type="button" className={smallButton} onClick={() => void archiveSubcategory(sc.id, false)}>
                戻す
              </button>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

function CategoryRow({
  category,
  subcategories,
  isFirst,
  isLast,
  onError,
}: {
  category: Category;
  subcategories: readonly Subcategory[];
  isFirst: boolean;
  isLast: boolean;
  onError: (message: string | null) => void;
}) {
  const [name, setName] = useState(category.name);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const activeSubCount = subcategories.filter((sc) => !sc.archived).length;

  async function run(action: () => Promise<void>) {
    try {
      await action();
      onError(null);
    } catch (e) {
      onError(e instanceof Error ? e.message : '保存に失敗しました');
    }
  }

  async function saveName() {
    if (name.trim() === category.name) return setName(category.name);
    await run(() => updateCategory(category.id, { name }));
  }

  return (
    <li className="py-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`${category.name}の色を変更`}
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((v) => !v)}
          className="size-5 shrink-0 rounded-full ring-slate-300 hover:ring-2"
          style={{ backgroundColor: category.color }}
        />
        <input
          type="text"
          aria-label={`${category.name}の名前`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => void saveName()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') setName(category.name);
          }}
          className="w-48 rounded-md border border-transparent px-2 py-1 text-sm hover:border-slate-300 focus:border-slate-500 focus:outline-none"
        />
        <button
          type="button"
          aria-expanded={subOpen}
          onClick={() => setSubOpen((v) => !v)}
          className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
        >
          小分類 {activeSubCount}件 {subOpen ? '▴' : '▾'}
        </button>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className={smallButton}
            disabled={isFirst}
            aria-label={`${category.name}を上へ`}
            onClick={() => void run(() => moveCategory(category.id, -1))}
          >
            ↑
          </button>
          <button
            type="button"
            className={smallButton}
            disabled={isLast}
            aria-label={`${category.name}を下へ`}
            onClick={() => void run(() => moveCategory(category.id, 1))}
          >
            ↓
          </button>
          <button
            type="button"
            className={smallButton}
            onClick={() => void run(() => archiveCategory(category.id))}
          >
            アーカイブ
          </button>
        </div>
      </div>
      {subOpen && <SubcategoryPanel category={category} subcategories={subcategories} />}
      {pickerOpen && (
        <div className="mt-2 pl-8">
          <ColorPicker
            label={`${category.name}の色`}
            value={category.color}
            onChange={(color) => void run(() => updateCategory(category.id, { color }))}
          />
        </div>
      )}
    </li>
  );
}

function AddCategoryForm({ type, categories }: { type: EntryType; categories: readonly Category[] }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const effectiveColor = color ?? suggestColor(categories, type, CATEGORY_PALETTE);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await addCategory({ name, type, color: effectiveColor });
      setName('');
      setColor(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '追加に失敗しました');
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label={`${TYPE_LABELS[type]}カテゴリの追加`} className="mt-3 space-y-2">
      <div className="flex items-center gap-3">
        <span className="size-5 shrink-0 rounded-full" style={{ backgroundColor: effectiveColor }} aria-hidden />
        <input
          type="text"
          aria-label="新しいカテゴリ名"
          placeholder="新しいカテゴリ名"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-48 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
        />
        <button type="submit" className="rounded-md bg-slate-800 px-3 py-1 text-sm text-white hover:bg-slate-700">
          追加
        </button>
      </div>
      <div className="pl-8">
        <ColorPicker label="新しいカテゴリの色" value={effectiveColor} onChange={setColor} />
      </div>
      {error && (
        <p role="alert" className="pl-8 text-sm text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}

function CategorySection({
  type,
  categories,
  subcategories,
}: {
  type: EntryType;
  categories: readonly Category[];
  subcategories: readonly Subcategory[];
}) {
  const [error, setError] = useState<string | null>(null);
  const active = categories.filter((c) => c.type === type && !c.archived);
  const archived = categories.filter((c) => c.type === type && c.archived);

  return (
    <div>
      <h4 className="mb-1 text-sm font-bold text-slate-700">{TYPE_LABELS[type]}</h4>
      {error && (
        <p role="alert" className="mb-1 text-sm text-red-600">
          {error}
        </p>
      )}
      <ul className="divide-y divide-slate-100">
        {active.map((c, i) => (
          <CategoryRow
            // 名前が外部で変わったら入力欄を作り直す
            key={`${c.id}-${c.name}`}
            category={c}
            subcategories={subcategories.filter((sc) => sc.categoryId === c.id)}
            isFirst={i === 0}
            isLast={i === active.length - 1}
            onError={setError}
          />
        ))}
      </ul>
      <AddCategoryForm type={type} categories={categories} />
      {archived.length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-slate-500">アーカイブ済み（{archived.length}件）</summary>
          <ul className="mt-2 space-y-1 pl-2">
            {archived.map((c) => (
              <li key={c.id} className="flex items-center gap-3">
                <span className="size-3 rounded-full" style={{ backgroundColor: c.color }} aria-hidden />
                <span className="w-48 text-slate-500">{c.name}</span>
                <button type="button" className={smallButton} onClick={() => void archiveCategory(c.id, false)}>
                  戻す
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export default function CategoryManager() {
  const categories = useCategories({ includeArchived: true });
  const subcategories = useSubcategories({ includeArchived: true });
  if (!categories || !subcategories) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-500">
        名前はクリックして直接変更できます（Enter で保存）。丸をクリックすると色を変えられます。
        アーカイブしたカテゴリは入力の選択肢に出なくなりますが、過去の取引や集計にはそのまま残ります。
        「小分類」で、カテゴリの下の分類（例: 住居 › 家賃）の名前の変更・追加・アーカイブができます。
      </p>
      <div className="grid gap-8 lg:grid-cols-2">
        <CategorySection type="expense" categories={categories} subcategories={subcategories} />
        <CategorySection type="income" categories={categories} subcategories={subcategories} />
      </div>
    </div>
  );
}
