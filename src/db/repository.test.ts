import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import {
  addTransaction,
  copyBudgets,
  deleteTransaction,
  listBudgets,
  listCategories,
  addCategory,
  archiveCategory,
  listTransactionsInPeriod,
  moveCategory,
  setBudget,
  updateCategory,
  updateSettings,
} from './repository';
import { exportBackup, importBackup, parseBackup } from './backup';
import { DEFAULT_CATEGORIES } from './defaults';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

async function firstExpenseCategoryId() {
  const cats = await listCategories();
  return cats.find((c) => c.type === 'expense')!.id;
}

describe('初期データ', () => {
  it('既定カテゴリが作成される', async () => {
    expect(await listCategories()).toHaveLength(DEFAULT_CATEGORIES.length);
  });
});

describe('取引', () => {
  it('期間内の取引だけを新しい順に返し、削除済みは除外する', async () => {
    const categoryId = await firstExpenseCategoryId();
    const base = { type: 'expense' as const, categoryId, memo: '' };
    await addTransaction({ ...base, date: '2026-08-31', amount: 1 });
    const a = await addTransaction({ ...base, date: '2026-09-01', amount: 2 });
    await addTransaction({ ...base, date: '2026-09-30', amount: 3 });
    await addTransaction({ ...base, date: '2026-10-01', amount: 4 });

    expect((await listTransactionsInPeriod('2026-09')).map((t) => t.amount)).toEqual([3, 2]);
    await deleteTransaction(a.id);
    expect((await listTransactionsInPeriod('2026-09')).map((t) => t.amount)).toEqual([3]);
  });

  it('月の開始日の設定に従う', async () => {
    const categoryId = await firstExpenseCategoryId();
    await addTransaction({ type: 'expense', categoryId, memo: '', date: '2026-09-24', amount: 1 });
    await updateSettings({ monthStartDay: 25 });
    expect(await listTransactionsInPeriod('2026-08')).toHaveLength(1);
    expect(await listTransactionsInPeriod('2026-09')).toHaveLength(0);
  });

  it('不正な入力を拒否する', async () => {
    const categoryId = await firstExpenseCategoryId();
    await expect(
      addTransaction({ type: 'expense', categoryId, memo: '', date: '2026-09-01', amount: 1.5 }),
    ).rejects.toThrow();
    await expect(
      addTransaction({ type: 'expense', categoryId, memo: '', date: '2026-02-30', amount: 1 }),
    ).rejects.toThrow();
  });
});

describe('予算', () => {
  it('upsert・未設定化・再設定ができる', async () => {
    const categoryId = await firstExpenseCategoryId();
    await setBudget('2026-10', categoryId, 1000);
    await setBudget('2026-10', categoryId, 2000);
    expect((await listBudgets('2026-10')).map((b) => b.amount)).toEqual([2000]);
    await setBudget('2026-10', categoryId, null);
    expect(await listBudgets('2026-10')).toHaveLength(0);
    await setBudget('2026-10', categoryId, 3000);
    expect((await listBudgets('2026-10')).map((b) => b.amount)).toEqual([3000]);
  });

  it('前月予算をコピーし、既存の値は上書きしない', async () => {
    const [c1, c2] = (await listCategories()).filter((c) => c.type === 'expense');
    await setBudget('2026-09', c1!.id, 100);
    await setBudget('2026-09', c2!.id, 200);
    await setBudget('2026-10', c2!.id, 999);
    expect(await copyBudgets('2026-09', '2026-10')).toBe(1);
    const amounts = Object.fromEntries((await listBudgets('2026-10')).map((b) => [b.categoryId, b.amount]));
    expect(amounts).toEqual({ [c1!.id]: 100, [c2!.id]: 999 });
  });
});

describe('バックアップ', () => {
  it('エクスポートした内容でそのまま復元できる', async () => {
    const categoryId = await firstExpenseCategoryId();
    await addTransaction({ type: 'expense', categoryId, memo: 'ランチ', date: '2026-09-10', amount: 900 });
    await setBudget('2026-09', categoryId, 30000);
    const json = JSON.stringify(await exportBackup());

    await db.delete();
    await db.open();
    await importBackup(parseBackup(json));

    const txs = await listTransactionsInPeriod('2026-09');
    expect(txs.map((t) => t.memo)).toEqual(['ランチ']);
    expect((await listBudgets('2026-09'))[0]!.amount).toBe(30000);
  });

  it('不正なファイルを拒否する', () => {
    expect(() => parseBackup('not json')).toThrow();
    expect(() => parseBackup('{"format":"other"}')).toThrow();
    expect(() => parseBackup(JSON.stringify({ format: 'kakeibo-backup', schemaVersion: 99, data: { transactions: [], categories: [], budgets: [] } }))).toThrow();
  });
});

describe('DB v2 マイグレーション', () => {
  it('初期状態のままの既定カテゴリだけ色を塗り替える', async () => {
    const { default: Dexie } = await import('dexie');
    const { KakeiboDB } = await import('./db');
    const name = 'migration-test';
    await Dexie.delete(name);
    const v1 = new Dexie(name);
    v1.version(1).stores({ categories: 'id, order, updatedAt' });
    const base = { createdAt: '', updatedAt: '', deletedAt: null, type: 'expense', archived: false };
    await v1.table('categories').bulkAdd([
      { ...base, id: '1', name: '食費', color: '#ef4444', order: 0 },
      { ...base, id: '2', name: '日用品', color: '#123456', order: 1 },
    ]);
    v1.close();

    const v2 = new KakeiboDB(name);
    const rows = await v2.categories.orderBy('order').toArray();
    expect(rows.map((c) => c.color)).toEqual(['#2a78d6', '#123456']);
    v2.close();
    await Dexie.delete(name);
  });

  it('v1 のバックアップも同じ変換をして読み込む', () => {
    const meta = { createdAt: '', updatedAt: '', deletedAt: null };
    const json = JSON.stringify({
      format: 'kakeibo-backup',
      schemaVersion: 1,
      exportedAt: '',
      data: {
        transactions: [],
        budgets: [],
        categories: [{ ...meta, id: '1', name: '食費', type: 'expense', color: '#ef4444', order: 0, archived: false }],
      },
    });
    const backup = parseBackup(json);
    expect(backup.schemaVersion).toBe(4);
    expect(backup.data.recurring).toEqual([]);
    expect(backup.data.categories[0]!.color).toBe('#2a78d6');
  });
});

describe('カテゴリ', () => {
  it('同じ種別で名前の重複を拒否する（別種別なら可）', async () => {
    await expect(addCategory({ name: '食費', type: 'expense', color: '#000000' })).rejects.toThrow('既にあります');
    await expect(addCategory({ name: ' 食費 ', type: 'income', color: '#000000' })).resolves.toBeTruthy();
    const other = (await listCategories()).find((c) => c.name === '日用品')!;
    await expect(updateCategory(other.id, { name: '食費' })).rejects.toThrow('既にあります');
  });

  it('同じ種別の中で並べ替えられる', async () => {
    const names = async () => (await listCategories()).filter((c) => c.type === 'expense').map((c) => c.name).slice(0, 3);
    const nichiyo = (await listCategories()).find((c) => c.name === '日用品')!;
    await moveCategory(nichiyo.id, -1);
    expect(await names()).toEqual(['日用品', '食費', '住居']);
    await moveCategory(nichiyo.id, -1); // 先頭ではそれ以上動かない
    expect(await names()).toEqual(['日用品', '食費', '住居']);
  });

  it('アーカイブすると一覧（既定）から消え、戻すと復活する', async () => {
    const food = (await listCategories()).find((c) => c.name === '食費')!;
    await archiveCategory(food.id);
    expect((await listCategories()).some((c) => c.id === food.id)).toBe(false);
    expect((await listCategories({ includeArchived: true })).some((c) => c.id === food.id)).toBe(true);
    await archiveCategory(food.id, false);
    expect((await listCategories()).some((c) => c.id === food.id)).toBe(true);
  });
});

describe('固定費', () => {
  async function rentRule(startMonth = '2026-08') {
    const { addRecurring, resolveSubcategory } = await import('./repository');
    const rent = (await listCategories()).find((c) => c.name === '住居')!;
    return addRecurring({
      subcategoryId: (await resolveSubcategory(rent.id, '家賃'))!,
      type: 'expense',
      categoryId: rent.id,
      amount: 85000,
      dayOfMonth: 31,
      startMonth,
      endMonth: null,
    });
  }

  it('確認待ちを確定・スキップでき、確定した取引を削除しても再び確認待ちにならない', async () => {
    const { listPendingRecurring, confirmRecurring, skipRecurring } = await import('./repository');
    const rule = await rentRule();
    expect((await listPendingRecurring('2026-09')).map((p) => [p.month, p.date])).toEqual([
      ['2026-08', '2026-08-31'],
      ['2026-09', '2026-09-30'],
    ]);

    const tx = await confirmRecurring(rule.id, '2026-08', { amount: 86000 });
    expect(tx).toMatchObject({ amount: 86000, memo: '', subcategoryId: rule.subcategoryId, date: '2026-08-31', recurringMonth: '2026-08' });
    await expect(confirmRecurring(rule.id, '2026-08')).rejects.toThrow('対応済み');

    await skipRecurring(rule.id, '2026-09');
    expect(await listPendingRecurring('2026-09')).toEqual([]);
    const { unskipRecurring } = await import('./repository');
    await unskipRecurring(rule.id, '2026-09');
    expect((await listPendingRecurring('2026-09')).map((p) => p.month)).toEqual(['2026-09']);
    await skipRecurring(rule.id, '2026-09');

    await deleteTransaction(tx.id);
    expect(await listPendingRecurring('2026-09')).toEqual([]);
    expect(await listPendingRecurring('2026-10')).toHaveLength(1);
  });

  it('不正な入力を拒否し、削除すると確認待ちから消える', async () => {
    const { addRecurring, deleteRecurring, listPendingRecurring } = await import('./repository');
    const rule = await rentRule();
    await expect(addRecurring({ ...rule, dayOfMonth: 32 })).rejects.toThrow();
    await expect(addRecurring({ ...rule, endMonth: '2026-01' })).rejects.toThrow('終了月');
    await deleteRecurring(rule.id);
    expect(await listPendingRecurring('2026-09')).toEqual([]);
  });

  it('バックアップに含まれ、復元できる', async () => {
    const { listRecurring, listSubcategories } = await import('./repository');
    await rentRule();
    const json = JSON.stringify(await exportBackup());
    await db.delete();
    await db.open();
    await importBackup(parseBackup(json));
    const subs = await listSubcategories();
    expect((await listRecurring()).map((r) => subs.find((sc) => sc.id === r.subcategoryId)?.name)).toEqual(['家賃']);
  });
});

describe('小分類', () => {
  it('名前から探し、なければ作る（空欄は null、アーカイブ済みは戻す）', async () => {
    const { resolveSubcategory, listSubcategories, archiveSubcategory } = await import('./repository');
    const food = (await listCategories()).find((c) => c.name === '食費')!;
    expect(await resolveSubcategory(food.id, '  ')).toBeNull();
    const a = await resolveSubcategory(food.id, '外食');
    expect(await resolveSubcategory(food.id, ' 外食 ')).toBe(a);
    await archiveSubcategory(a!);
    expect(await listSubcategories()).toHaveLength(0);
    expect(await resolveSubcategory(food.id, '外食')).toBe(a);
    expect((await listSubcategories()).map((sc) => sc.name)).toEqual(['外食']);
  });

  it('取引の小分類はカテゴリと合っていなければ拒否する', async () => {
    const { resolveSubcategory } = await import('./repository');
    const cats = await listCategories();
    const food = cats.find((c) => c.name === '食費')!;
    const daily = cats.find((c) => c.name === '日用品')!;
    const sub = await resolveSubcategory(food.id, '外食');
    const base = { type: 'expense' as const, memo: '', date: '2026-09-01', amount: 100, subcategoryId: sub };
    await expect(addTransaction({ ...base, categoryId: food.id })).resolves.toBeTruthy();
    await expect(addTransaction({ ...base, categoryId: daily.id })).rejects.toThrow('小分類');
  });

  it('同じカテゴリで同じ名前への変更は拒否する', async () => {
    const { resolveSubcategory, renameSubcategory } = await import('./repository');
    const food = (await listCategories()).find((c) => c.name === '食費')!;
    await resolveSubcategory(food.id, '外食');
    const b = await resolveSubcategory(food.id, 'コンビニ');
    await expect(renameSubcategory(b!, '外食')).rejects.toThrow('既にあります');
  });
});

describe('DB v4 マイグレーション', () => {
  it('v3 の固定費の名前が小分類になり、確定済みの取引にも付く', async () => {
    const { default: Dexie } = await import('dexie');
    const { KakeiboDB } = await import('./db');
    const name = 'migration-v4-test';
    await Dexie.delete(name);
    const v3 = new Dexie(name);
    v3.version(3).stores({
      transactions: 'id, date, categoryId, updatedAt, recurringId',
      categories: 'id, order, updatedAt',
      budgets: 'id, &[yearMonth+categoryId], yearMonth, updatedAt',
      settings: 'key',
      recurring: 'id, updatedAt',
    });
    const meta = { createdAt: '', updatedAt: '', deletedAt: null };
    await v3.table('recurring').add({
      ...meta, id: 'r1', name: '家賃', type: 'expense', categoryId: 'c-rent', amount: 85000,
      dayOfMonth: 27, startMonth: '2026-08', endMonth: null, skippedMonths: [],
    });
    await v3.table('transactions').add({
      ...meta, id: 't1', date: '2026-08-27', amount: 85000, type: 'expense', categoryId: 'c-rent',
      memo: '家賃', recurringId: 'r1', recurringMonth: '2026-08',
    });
    v3.close();

    const v4 = new KakeiboDB(name);
    const [sub] = await v4.subcategories.toArray();
    expect(sub).toMatchObject({ categoryId: 'c-rent', name: '家賃' });
    expect(await v4.recurring.get('r1')).toMatchObject({ subcategoryId: sub!.id });
    expect(await v4.transactions.get('t1')).toMatchObject({ subcategoryId: sub!.id, memo: '' });
    v4.close();
    await Dexie.delete(name);
  });
});
