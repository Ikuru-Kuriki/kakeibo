import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import {
  addTransaction,
  copyBudgets,
  deleteTransaction,
  listBudgets,
  listCategories,
  listTransactionsInPeriod,
  setBudget,
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
