// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db/db';
import { addMonths, today } from '../domain/period';
import RecordPage from './RecordPage';

beforeEach(async () => {
  await db.delete();
  await db.open();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function setup() {
  const user = userEvent.setup();
  render(<RecordPage />);
  const form = await screen.findByRole('form', { name: '取引の追加' });
  // カテゴリの読み込みを待つ
  await waitFor(() => expect(within(form).getByRole('combobox')).toHaveProperty('value', expect.stringMatching(/.+/)));
  return { user, form };
}

describe('今月の記録画面', () => {
  it('支出を追加すると一覧と合計に反映され、金額とメモがクリアされる', async () => {
    const { user, form } = await setup();
    await user.type(within(form).getByLabelText('金額（円）'), '1,200');
    await user.type(within(form).getByLabelText('メモ'), 'ランチ');
    await user.click(within(form).getByRole('button', { name: '追加' }));

    const table = await screen.findByRole('table');
    expect(within(table).getByText('ランチ')).toBeTruthy();
    expect(within(table).getByText(/1,200/)).toBeTruthy();
    expect(within(form).getByLabelText('金額（円）')).toHaveProperty('value', '');
    expect(within(form).getByLabelText('メモ')).toHaveProperty('value', '');
    expect(within(form).getByLabelText('日付')).toHaveProperty('value', today());
  });

  it('種別を収入にするとカテゴリが収入用に切り替わる', async () => {
    const { user, form } = await setup();
    await user.click(within(form).getByRole('button', { name: '収入' }));
    const options = within(form).getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['給与', 'その他収入']);
  });

  it('不正な金額はエラーを表示して保存しない', async () => {
    const { user, form } = await setup();
    await user.type(within(form).getByLabelText('金額（円）'), '12.5');
    await user.click(within(form).getByRole('button', { name: '追加' }));
    expect((await within(form).findByRole('alert')).textContent).toContain('金額');
    expect(await db.transactions.count()).toBe(0);
  });

  it('編集・削除できる', async () => {
    const { user, form } = await setup();
    await user.type(within(form).getByLabelText('金額（円）'), '500');
    await user.click(within(form).getByRole('button', { name: '追加' }));
    const table = await screen.findByRole('table');

    await user.click(within(table).getByRole('button', { name: '編集' }));
    const editForm = within(table).getByRole('form', { name: '取引の編集' });
    const amount = within(editForm).getByLabelText('金額（円）');
    await user.clear(amount);
    await user.type(amount, '800');
    await user.click(within(editForm).getByRole('button', { name: '保存' }));
    await waitFor(() => expect(within(table).getByText(/800/)).toBeTruthy());

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(within(table).getByRole('button', { name: '削除' }));
    expect(await screen.findByText('取引はまだありません')).toBeTruthy();
  });

  it('今月以外の日付で保存すると案内を表示する', async () => {
    const { user, form } = await setup();
    const date = within(form).getByLabelText('日付');
    await user.clear(date);
    await user.type(date, `${addMonths(today().slice(0, 7), -1)}-15`);
    await user.type(within(form).getByLabelText('金額（円）'), '100');
    await user.click(within(form).getByRole('button', { name: '追加' }));
    expect(await screen.findByText(/の取引として保存しました/)).toBeTruthy();
    expect(screen.getByText('取引はまだありません')).toBeTruthy();
  });
});
