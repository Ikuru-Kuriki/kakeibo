import type { Timestamp } from './types';

/** この日数を超えてバックアップしていなければ注意を出す */
export const BACKUP_REMIND_DAYS = 30;

export type BackupState = { kind: 'never' } | { kind: 'ok' | 'stale'; days: number };

export function backupState(lastBackupAt: Timestamp | null, now = new Date()): BackupState {
  if (!lastBackupAt) return { kind: 'never' };
  const days = Math.floor((now.getTime() - new Date(lastBackupAt).getTime()) / 86_400_000);
  return { kind: days > BACKUP_REMIND_DAYS ? 'stale' : 'ok', days };
}
