// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/db';
import { listCategories } from '../db/repository';
import CategoryManager from './CategoryManager';

beforeEach(async () => {
  await db.delete();
  await db.open();
});
afterEach(cleanup);

const expenseNames = async () =>
  (await listCategories()).filter((c) => c.type === 'expense').map((c) => c.name);

describe('カテゴリ管理', () => {
  it('名前の変更・追加・重複エラー', async () => {
    const user = userEvent.setup();
    render(<CategoryManager />);
    const name = await screen.findByLabelText('食費の名前');
    await user.clear(name);
    await user.type(name, '食料品{Enter}');
    await waitFor(async () => expect((await expenseNames())[0]).toBe('食料品'));

    const form = screen.getByRole('form', { name: '支出カテゴリの追加' });
    await user.type(within(form).getByLabelText('新しいカテゴリ名'), 'サブスク');
    await user.click(within(form).getByRole('button', { name: '追加' }));
    await waitFor(async () => expect(await expenseNames()).toContain('サブスク'));

    await user.type(within(form).getByLabelText('新しいカテゴリ名'), '住居');
    await user.click(within(form).getByRole('button', { name: '追加' }));
    expect((await within(form).findByRole('alert')).textContent).toContain('既にあります');
  });

  it('色の変更とアーカイブ・戻す', async () => {
    const user = userEvent.setup();
    render(<CategoryManager />);
    await user.click(await screen.findByRole('button', { name: '食費の色を変更' }));
    await user.click(within(screen.getByRole('radiogroup', { name: '食費の色' })).getByRole('radio', { name: '#e34948' }));
    await waitFor(async () => expect((await listCategories())[0]!.color).toBe('#e34948'));

    const row = screen.getByLabelText('日用品の名前').closest('li')!;
    await user.click(within(row).getByRole('button', { name: 'アーカイブ' }));
    await waitFor(async () => expect(await expenseNames()).not.toContain('日用品'));
    await user.click(await screen.findByText('アーカイブ済み（1件）'));
    await user.click(screen.getByRole('button', { name: '戻す' }));
    await waitFor(async () => expect(await expenseNames()).toContain('日用品'));
  });
});
