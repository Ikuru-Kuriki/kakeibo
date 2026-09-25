import { useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Placeholder from '../components/Placeholder';
import { backupFileName, exportBackup, importBackup, parseBackup } from '../db/backup';

export default function SettingsPage() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  async function handleExport() {
    const backup = await exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName();
    a.click();
    URL.revokeObjectURL(url);
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
      <Placeholder items={['カテゴリ管理（追加・名前/色の変更・並べ替え・アーカイブ）']} />
    </>
  );
}
