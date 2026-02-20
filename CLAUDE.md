# archrip

CLIツール: コードベースからインタラクティブなアーキテクチャ図を自動生成（OSS）。

## 開発コマンド

```bash
npm install          # 依存関係インストール
npm run build        # CLI ビルド (TypeScript → dist/)
npm run build:viewer # ビューワー ビルド確認
npm run dev:viewer   # ビューワー 開発サーバー
npm run typecheck    # CLI 型チェックのみ
npm run test         # CLI ユニットテスト (Vitest)
npm run knip         # 未使用コード検出
```

## テスト

```bash
# ユニットテスト実行
npm run test -w packages/cli

# watchモード
npm run test:watch -w packages/cli
```

78テスト: `validate.spec.ts`(56) + `layout.spec.ts`(22)

## ローカルテスト

```bash
npm run build
cd /tmp && mkdir test-project && cd test-project
mkdir -p .archrip
cp ~/work/archrip/examples/laravel-kiyaku/architecture.json .archrip/
node ~/work/archrip/packages/cli/dist/index.js build   # viewer自動セットアップ
node ~/work/archrip/packages/cli/dist/index.js serve
```

## リリース

```bash
./scripts/release.sh          # patch bump → tag push → CI が npm publish
./scripts/release.sh minor    # minor bump
./scripts/release.sh major    # major bump
```

tag push (`v*`) で GitHub Actions が自動で build → test → npm publish を実行。

## モノレポ構成

```
packages/
├── cli/          # npm公開パッケージ (archrip)
│   ├── src/commands/    # init, build, serve
│   ├── src/utils/       # validate, layout, detect-agents, paths, project-info, gitignore
│   ├── src/install/     # viewer, slash-commands
│   ├── src/schema/      # architecture.schema.json
│   └── src/templates/   # skeleton.json, slash-commands/shared/ + {claude,gemini,codex}/
└── viewer/       # React Flow ビューワー（build時に自動コピー）
    ├── src/components/  # ArchNode, UseCaseFilter, DetailPanel, Legend, CommandPalette, ThemeToggle
    ├── src/hooks/       # useArchitecture, useUseCaseFilter, useCategoryFilter, useCommandPalette, useKeyboardShortcuts, useFlowAnimation, useTheme
    └── src/data/        # loader.ts
```

## 設計判断

- `layer`（整数）のみLLMが出力 → dagreが座標を自動計算（LLMに座標計算させない）
- `sourceUrl`テンプレート: `{filePath}` プレースホルダーでGitHub/GitLab/Backlog等対応。http/httpsのみ許可
- 標準カテゴリ10種: controller, service, port, adapter, entity, database, infrastructure, external, job, dto。カスタムカテゴリも使用可能（フォールバック色 stone が適用）
- Concentric layout の ring priority（内側→外側）: entity(0) → service(1) → port/dto(2) → controller/adapter(3) → database(4) → infrastructure/job(5) → external(6)。カテゴリ意味論が layer 数値より優先される（LLMのlayer割り当てミスを補正）
- スラッシュコマンド: `init`時に`.claude/commands/`等にインストール。`shared/` + エージェント固有テンプレート。`$ARGUMENTS`プレースホルダー対応
- ビューワーはスタンドアロン: ユーザーPJにコピーされるため、workspaceパッケージに依存不可

## セキュリティ

- `sourceUrl`: http/httpsプロトコルのみ許可（javascript:/data:/ftp: 拒否）
- `filePath`: パストラバーサル（`..`）・絶対パス拒否
- ビューワー検証: シンボリックリンク拒否、マーカーファイル検証、package.json名検証、パス境界チェック
- 循環依存検出: DAG検証でエッジの循環を検出（`relation`タイプは除外）

## Git Author

- Yuto Ida / 伊田 悠人
