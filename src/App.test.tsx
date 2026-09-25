// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { db } from './db/db';

beforeEach(async () => {
  await db.delete();
  await db.open();
});
afterEach(cleanup);

describe('スマホ用メニュー', () => {
  it('メニューを開いて画面を移動すると閉じる', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/record']}>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByText('／ 今月の記録')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'メニュー' }));
    const menu = document.getElementById('mobile-menu')!;
    await user.click(within(menu).getByRole('link', { name: '予算設定' }));
    expect(document.getElementById('mobile-menu')).toBeNull();
    expect(await screen.findByText('／ 予算設定')).toBeTruthy();
  });
});
