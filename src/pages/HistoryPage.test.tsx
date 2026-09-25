// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db/db';
import { addTransaction, listCategories } from '../db/repository';
import HistoryPage from './HistoryPage';

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

function renderPage(path = '/history') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/history/:ym" element={<HistoryPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('履歴画面', () => {
  it('既定は前月。日付の初期値は前月末で、そのまま前月の取引を追加できる', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByLabelText('年月を選ぶ')).toHaveProperty('value', '2026-08');
    const form = await screen.findByRole('form', { name: '取引の追加' });
    expect(within(form).getByLabelText('日付')).toHaveProperty('value', '2026-08-31');

    await user.type(within(form).getByLabelText('金額（円）'), '3000');
    await user.type(within(form).getByLabelText('メモ'), '書き忘れ');
    await user.click(within(form).getByRole('button', { name: '追加' }));
    expect(await within(await screen.findByRole('table')).findByText('書き忘れ')).toBeTruthy();
    expect(screen.queryByText(/の取引として保存しました/)).toBeNull();
  });

  it('月を切り替えるとその月の取引を表示する', async () => {
    const cats = await listCategories();
    await addTransaction({ type: 'expense', categoryId: cats[0]!.id, amount: 500, memo: '7月の買い物', date: '2026-07-03' });
    const user = userEvent.setup();
    renderPage('/history/2026-08');
    expect(await screen.findByText('取引はまだありません')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '前の月' }));
    expect(await screen.findByText('7月の買い物')).toBeTruthy();
    expect(screen.getByRole('form', { name: '取引の追加' }).querySelector('input[type=date]')).toHaveProperty(
      'value',
      '2026-07-31',
    );
  });

  it('今月より先の月は今月に丸める', async () => {
    renderPage('/history/2027-01');
    expect(await screen.findByLabelText('年月を選ぶ')).toHaveProperty('value', '2026-09');
  });
});
