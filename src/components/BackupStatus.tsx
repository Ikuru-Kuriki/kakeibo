import { Link } from 'react-router';
import { backupState } from '../domain/backupReminder';
import { useSettings } from '../hooks/useData';

/** サイドバー下部に出すバックアップの状況 */
export default function BackupStatus() {
  const { lastBackupAt } = useSettings();
  const state = backupState(lastBackupAt);
  const warn = state.kind !== 'ok';
  const text =
    state.kind === 'never'
      ? 'バックアップ未実施'
      : state.kind === 'stale'
        ? `${state.days}日間バックアップしていません`
        : `最終バックアップ: ${state.days === 0 ? '今日' : `${state.days}日前`}`;
  return (
    <Link
      to="/settings"
      className={`block rounded-md px-3 py-2 text-xs ${
        warn ? 'bg-amber-50 text-amber-800 hover:bg-amber-100' : 'text-slate-500 hover:bg-slate-100'
      }`}
    >
      {warn && <span aria-hidden>⚠ </span>}
      {text}
    </Link>
  );
}
