// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db/db';
import { listTransactionsInPeriod } from '../db/repository';
import RecordPage from './RecordPage';
import RecurringPage from './RecurringPage';

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

describe('固定費', () => {
  it('登録すると確認待ちに並び、今月の記録画面で金額を直して確定できる', async () => {
    const user = userEvent.setup();
    const view = render(
      <MemoryRouter>
        <RecurringPage />
      </MemoryRouter>,
    );
    const form = await screen.findByRole('form', { name: '固定費の追加' });
    await user.type(within(form).getByLabelText('名前'), '電気代');
    await user.selectOptions(within(form).getByLabelText('カテゴリ'), '水道光熱');
    await user.type(within(form).getByLabelText('金額の目安（円）'), '8000');
    const day = within(form).getByLabelText('毎月の日');
    await user.clear(day);
    await user.type(day, '10');
    await user.click(within(form).getByRole('button', { name: '追加' }));

    // 一覧に出る
    expect(await screen.findByRole('cell', { name: '電気代' })).toBeTruthy();
    view.unmount();

    // 今月の記録画面に確認待ちとして出る
    render(
      <MemoryRouter>
        <RecordPage />
      </MemoryRouter>,
    );
    const pending = await screen.findByRole('region', { name: '確認待ちの固定費' });
    const amount = within(pending).getByLabelText('電気代（2026年9月分）の金額');
    await user.clear(amount);
    await user.type(amount, '9120');
    await user.click(within(pending).getByRole('button', { name: '電気代（2026年9月分）を確定' }));

    await waitFor(async () => {
      const txs = await listTransactionsInPeriod('2026-09');
      expect(txs.map((t) => [t.date, t.amount, t.memo])).toEqual([['2026-09-10', 9120, '電気代']]);
    });
    await waitFor(() => expect(screen.queryByRole('region', { name: '確認待ちの固定費' })).toBeNull());
    expect(await screen.findByText('固定')).toBeTruthy();
  });
});
