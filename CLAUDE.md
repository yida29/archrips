# archrips

CLIツール: コードベースからインタラクティブなアーキテクチャ図を自動生成（OSS）。

## 開発コマンド

```bash
npm install          # 依存関係インストール
npm run build        # CLI ビルド (TypeScript → dist/)
npm run build:viewer # ビューワー ビルド確認
npm run dev:viewer   # ビューワー 開発サーバー
npm run typecheck    # CLI 型チェックのみ
```

## ローカルテスト

```bash
npm run build
cd /tmp && mkdir test-project && cd test-project
node ~/work/archrips/packages/cli/dist/index.js init .
cp ~/work/archrips/examples/laravel-kiyaku/architecture.json .archrips/
node ~/work/archrips/packages/cli/dist/index.js build
node ~/work/archrips/packages/cli/dist/index.js serve
```

## npm publish

```bash
cd packages/cli && npm run build && npm publish --access public
```

## 設計判断

- `layer`（整数）のみLLMが出力 → dagreが座標を自動計算（LLMに座標計算させない）
- `sourceUrl`テンプレート: `{filePath}` プレースホルダーでGitHub/GitLab/Backlog等対応
- カスタムカテゴリ: 標準8種以外も使用可能（フォールバック色 stone が適用）
- スラッシュコマンド: `init`時に`.claude/commands/`等にインストール。`$ARGUMENTS`プレースホルダー対応

## Git Author

- Yuto Ida / 伊田 悠人
