import { describe, expect, it } from 'vitest';
import { backupState } from './backupReminder';

describe('backupState', () => {
  const now = new Date('2026-09-25T12:00:00Z');
  it('未実施・最近・30日超を区別する', () => {
    expect(backupState(null, now)).toEqual({ kind: 'never' });
    expect(backupState('2026-09-20T12:00:00Z', now)).toEqual({ kind: 'ok', days: 5 });
    expect(backupState('2026-08-20T12:00:00Z', now)).toEqual({ kind: 'stale', days: 36 });
  });
});
