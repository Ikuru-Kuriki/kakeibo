// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/db';
import { addTransaction, listCategories, setBudget } from '../db/repository';
import SummaryPage from './SummaryPage';

beforeEach(async () => {
  await db.delete();
  await db.open();
});
afterEach(cleanup);

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/summary/:ym" element={<SummaryPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('月次サマリー画面', () => {
  it('内訳と予算比較（超過・残り・未設定）を表示する', async () => {
    const cats = await listCategories();
    const id = (name: string) => cats.find((c) => c.name === name)!.id;
    const base = { type: 'expense' as const, memo: '', date: '2026-08-10' };
    await addTransaction({ ...base, categoryId: id('食費'), amount: 45000 });
    await addTransaction({ ...base, categoryId: id('住居'), amount: 80000 });
    await addTransaction({ ...base, categoryId: id('交通'), amount: 3000 });
    await addTransaction({ ...base, type: 'income', categoryId: id('給与'), amount: 300000 });
    await setBudget('2026-08', id('食費'), 40000);
    await setBudget('2026-08', id('住居'), 85000);

    renderAt('/summary/2026-08');

    expect(await screen.findByText('2026年8月')).toBeTruthy();
    const breakdown = await screen.findByRole('table', { name: 'カテゴリ別の支出' });
    expect(within(breakdown).getAllByRole('row')).toHaveLength(3);
    expect(screen.getByText(/5,000 超過/)).toBeTruthy();
    expect(screen.getByText(/残り ￥5,000/)).toBeTruthy();
    expect(screen.getByText('予算未設定')).toBeTruthy();
    expect(screen.getByText(/予算合計 ￥125,000/)).toBeTruthy();
  });

  it('支出がない月はその旨を表示し、前月へ移動できる', async () => {
    renderAt('/summary/2026-08');
    expect(await screen.findByText('この月の支出はありません')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: '前の月' }));
    expect(await screen.findByText('2026年7月')).toBeTruthy();
  });
});
