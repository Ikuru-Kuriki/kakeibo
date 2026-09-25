// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db/db';
import { addTransaction, listBudgets, listCategories, setBudget } from '../db/repository';
import BudgetPage from './BudgetPage';

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 25, 12)); // 2026-09-25
  await db.delete();
  await db.open();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function seed() {
  const cats = await listCategories();
  const id = (name: string) => cats.find((c) => c.name === name)!.id;
  const add = (date: string, name: string, amount: number) =>
    addTransaction({ type: 'expense', categoryId: id(name), amount, memo: '', date });
  await add('2026-09-05', '食費', 30000); // 今月（途中）
  await add('2026-08-05', '食費', 42000); // 先月
  await add('2026-07-05', '食費', 38000);
  await setBudget('2026-09', id('食費'), 40000);
  await setBudget('2026-09', id('住居'), 85000);
  return id;
}

function renderPage(path = '/budget') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/budget" element={<BudgetPage />} />
        <Route path="/budget/:ym" element={<BudgetPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const row = (name: string) => screen.getByText(name).closest('tr')!;

describe('予算設定画面', () => {
  it('既定は来月。参考値（今月の予算・途中実績・先月実績・平均）を表示する', async () => {
    await seed();
    renderPage();
    expect(await screen.findByRole('heading', { name: '10月の予算（来月）' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: '9月の実績（途中）' })).toBeTruthy();
    // 平均は記録のある 7・8 月だけで計算: (38000 + 42000) / 2
    expect(screen.getByRole('columnheader', { name: '6月〜8月平均' })).toBeTruthy();
    const food = within(row('食費'));
    expect(food.getByTitle('9月の予算（クリックで予算に入れる）').textContent).toBe('￥40,000');
    expect(food.getByTitle('9月の実績（クリックで予算に入れる）').textContent).toBe('￥30,000');
    expect(food.getByTitle('8月の実績（クリックで予算に入れる）').textContent).toBe('￥42,000');
    expect(food.getByTitle('6月〜8月平均（クリックで予算に入れる）').textContent).toBe('￥40,000');
  });

  it('入力して Enter で保存し、空欄で未設定に戻す', async () => {
    const id = await seed();
    const user = userEvent.setup();
    renderPage();
    const input = await screen.findByLabelText('食費の10月の予算');
    await user.type(input, '45,000{Enter}');
    await waitFor(async () => expect((await listBudgets('2026-10')).map((b) => b.amount)).toEqual([45000]));
    expect(input).toHaveProperty('value', '45,000');

    await user.clear(input);
    await user.tab();
    await waitFor(async () => expect(await listBudgets('2026-10')).toHaveLength(0));
    expect(id('食費')).toBeTruthy();
  });

  it('不正な値は保存しない', async () => {
    await seed();
    const user = userEvent.setup();
    renderPage();
    const input = await screen.findByLabelText('食費の10月の予算');
    await user.type(input, 'abc{Enter}');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(await listBudgets('2026-10')).toHaveLength(0);
  });

  it('参考値クリックとコピーで予算を入れられる', async () => {
    const id = await seed();
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('食費');
    await user.click(within(row('食費')).getByRole('button', { name: '￥42,000' }));
    await waitFor(async () => expect((await listBudgets('2026-10'))[0]?.amount).toBe(42000));

    await user.click(screen.getByRole('button', { name: '未入力のカテゴリに9月の予算をコピー' }));
    await waitFor(async () => {
      const amounts = Object.fromEntries((await listBudgets('2026-10')).map((b) => [b.categoryId, b.amount]));
      // 入力済みの食費は上書きしない
      expect(amounts).toEqual({ [id('食費')]: 42000, [id('住居')]: 85000 });
    });
    expect(await screen.findByText('1件のカテゴリに9月の予算をコピーしました')).toBeTruthy();
  });
});

describe('予算設定画面のキーボード操作', () => {
  it('Enter で保存して次のカテゴリの入力欄へ移る', async () => {
    await seed();
    const user = userEvent.setup();
    renderPage();
    const first = await screen.findByLabelText('食費の10月の予算');
    await user.type(first, '100{Enter}');
    expect(document.activeElement).toBe(screen.getByLabelText('日用品の10月の予算'));
    await waitFor(async () => expect((await listBudgets('2026-10')).map((b) => b.amount)).toEqual([100]));
  });
});
