# kakeibo

個人用の家計簿アプリ（React + TypeScript + Dexie/IndexedDB + Tailwind + Recharts、静的ホスティング）。
仕様は `docs/SPEC.md`。仕様を変えたらそちらも更新し、変更履歴に追記する。

## コマンド

- `npm run dev` 開発サーバー
- `npm test` テスト（Vitest）
- `npm run typecheck` 型チェック
- `npm run build` ビルド

変更後は `npm run typecheck && npm test` を通すこと。

## 規約

- UI は Dexie（`db`）を直接触らず、`src/db/repository.ts` と `src/hooks/useData.ts` を経由する
- 月の範囲・所属月の計算は必ず `src/domain/period.ts` を使う（`new Date()` で月を直接計算しない）
- 集計は `src/domain/aggregate.ts` の純粋関数に置き、テストを書く
- ID は UUID、金額は円単位の正の整数、日付は "YYYY-MM-DD"、年月は "YYYY-MM"
- 削除は論理削除（`deletedAt`）。更新時は `updatedAt` を更新する
- カテゴリは削除せずアーカイブする。カテゴリの type は作成後に変更しない
- DB スキーマを変えるときは `db.version(n+1)` を追加し（既存の version は書き換えない）、
  `src/db/backup.ts` の `SCHEMA_VERSION` と `migrateBackup` も更新する
- UI の文言は日本語
