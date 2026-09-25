import { useEffect, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Placeholder from '../components/Placeholder';
import { backupFileName, exportBackup, importBackup, parseBackup } from '../db/backup';
import { getStorageStatus, requestPersistentStorage, type StorageStatus } from '../db/db';
import { updateSettings } from '../db/repository';
import { useSettings } from '../hooks/useData';

const STORAGE_TEXT: Record<StorageStatus, string> = {
  persisted: '保護されています。ブラウザが自動でデータを消すことはありません。',
  'best-effort':
    '通常の保存です。パソコンの空き容量が極端に少なくなったときなどに、ブラウザが自動で消す可能性があります。',
  unsupported: 'このブラウザでは保存状態を確認できません。',
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function SettingsPage() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [storage, setStorage] = useState<StorageStatus | null>(null);
  const { lastBackupAt } = useSettings();

  useEffect(() => {
    void getStorageStatus().then(setStorage);
  }, []);

  async function handleProtect() {
    await requestPersistentStorage();
    setStorage(await getStorageStatus());
  }

  async function handleExport() {
    const backup = await exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName();
    a.click();
    URL.revokeObjectURL(url);
    await updateSettings({ lastBackupAt: new Date().toISOString() });
    setMessage({ kind: 'ok', text: 'バックアップを保存しました' });
  }

  async function handleImport(file: File) {
    try {
      const backup = parseBackup(await file.text());
      if (!window.confirm('現在のデータをすべて置き換えて復元します。よろしいですか？')) return;
      await importBackup(backup);
      setMessage({ kind: 'ok', text: '復元しました' });
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : '復元に失敗しました' });
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  return (
    <>
      <PageHeader title="設定" />
      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="mb-2 font-bold">バックアップ</h3>
        <p className="mb-4 text-sm text-slate-500">
          データはこのブラウザ内にのみ保存されます。ブラウザのデータ削除などで消えることがあるため、定期的に保存してください。
        </p>
        <p className="mb-4 text-sm">
          最終バックアップ:{' '}
          <span className="font-medium">{lastBackupAt ? formatDateTime(lastBackupAt) : 'まだありません'}</span>
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleExport}
            className="rounded-md bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
          >
            エクスポート（JSON）
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
          >
            インポート
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImport(file);
            }}
          />
        </div>
        {message && (
          <p className={`mt-3 text-sm ${message.kind === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
            {message.text}
          </p>
        )}
      </section>
      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="mb-2 font-bold">データの保存状態</h3>
        <p className="text-sm text-slate-600">{storage ? STORAGE_TEXT[storage] : '確認中…'}</p>
        {storage === 'best-effort' && (
          <button
            type="button"
            onClick={() => void handleProtect()}
            className="mt-3 rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
          >
            保護をリクエストする
          </button>
        )}
        <p className="mt-3 text-xs text-slate-500">
          どの状態でも、ブラウザの「閲覧履歴データの削除」で Cookie とサイトデータを消すとデータは消えます。
        </p>
      </section>
      <Placeholder items={['カテゴリ管理（追加・名前/色の変更・並べ替え・アーカイブ）']} />
    </>
  );
}
