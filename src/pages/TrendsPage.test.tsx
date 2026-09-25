// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db/db';
import { addTransaction, listCategories } from '../db/repository';
import TrendsPage from './TrendsPage';

beforeAll(() => {
  // Recharts の ResponsiveContainer が使う
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});
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

describe('推移画面', () => {
  it('直近12か月の表と平均を表示し、年ごとに切り替え・行選択できる', async () => {
    const cats = await listCategories();
    const food = cats.find((c) => c.name === '食費')!.id;
    for (const [m, a] of [['06', 30000], ['07', 30000], ['08', 60000]] as const) {
      await addTransaction({ type: 'expense', categoryId: food, amount: a, memo: '', date: `2026-${m}-10` });
    }
    await addTransaction({ type: 'expense', categoryId: food, amount: 1000, memo: '', date: '2025-03-10' });

    const user = userEvent.setup();
    render(<TrendsPage />);
    const table = await screen.findByRole('table', { name: 'カテゴリ別・月別の支出（円）' });
    const foodRow = within(table).getByRole('button', { name: '食費' }).closest('tr')!;
    // 平均 (30000 + 30000 + 60000) / 3 = 40000、8月は平均より50%多い
    expect(within(foodRow).getByText('40,000')).toBeTruthy();
    expect(within(foodRow).getByTitle('平均より50%多い').textContent).toBe('60,000');

    await user.click(within(table).getByRole('button', { name: '食費' }));
    expect(screen.getByRole('heading', { name: '食費の推移' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '年ごと' }));
    const year = screen.getByLabelText('年');
    expect([...year.querySelectorAll('option')].map((o) => o.textContent)).toEqual(['2026年', '2025年']);
    await user.selectOptions(year, '2025');
    expect((await screen.findAllByText('1,000')).length).toBeGreaterThan(0);
    expect(screen.getAllByTitle('平均と同じくらい').length).toBeGreaterThan(0);
  });
});
