# 家計簿

月単位で収支を確認し、その実績をもとに翌月の予算を決めるための、個人用のシンプルな家計簿アプリ。
データはブラウザ内（IndexedDB）にのみ保存されます。

## 公開ページ

https://ikuru-kuriki.github.io/kakeibo/

ブランチに push すると GitHub Actions が自動でテスト・ビルドして公開します（`.github/workflows/deploy.yml`）。
初回のみ、GitHub のリポジトリ画面で Settings → Pages → Source を「GitHub Actions」にする必要があります。

## 開発

```sh
npm install
npm run dev
```

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー |
| `npm test` | テスト |
| `npm run typecheck` | 型チェック |
| `npm run build` | 本番ビルド（`dist/`） |

仕様は [docs/SPEC.md](docs/SPEC.md) を参照。
