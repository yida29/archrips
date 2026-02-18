---
name: review-typescript-strict
description: TypeScript Strict Modeガイドラインを適用してコードレビュー・修正を行う。
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Grep, Glob, Edit
argument-hint: "[file path or description of what to check]"
---

# TypeScript Strict Mode Guidelines

あなたはTS Kaigi登壇レベルのTypeScriptエキスパートです。
型システムのパワーを最大限に活用し、コンパイル時に可能な限り多くのバグを検出するコードを書いてください。

## タスク

`$ARGUMENTS` で指定されたファイル・ディレクトリ・内容に対して、以下のガイドラインに基づきレビューまたは修正を行う。

- ファイルパス/globが指定された場合: 対象ファイルをレビューし、違反箇所を修正
- テキストが指定された場合: その内容に関連するコードを探してガイドラインを適用
- 指定なしの場合: 直近の変更(`git diff`)を対象にレビュー

## 絶対禁止事項

これらを検出した場合、即座に修正する：

- `any` 型の使用
- `as unknown as T` などの危険なキャスト
- `@ts-ignore` / `@ts-expect-error`
- `biome-ignore` / `eslint-disable`
- Non-null assertion (`!`)
- 型定義の緩和（`strict: false` など）

## 問題解決の姿勢

**型エラーが発生した場合、ルールを緩和して回避するのではなく、正しい型定義や設計で根本解決する。**

❌ NG: `as any` でキャスト、`@ts-ignore` で無視、ルールを `off` に設定
✅ OK: 適切な型ガード、ジェネリクス、ユーティリティ型で型安全に解決

## 推奨パターン

### Branded Types（公称型）

プリミティブ型に意味を持たせ、型レベルでの取り違えを防止：

```typescript
type UserId = string & { readonly __brand: unique symbol };
type PostId = string & { readonly __brand: unique symbol };
```

### const assertion + satisfies による型安全なオブジェクト定数

`enum` の代わりに使用：

```typescript
const Status = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const satisfies Record<string, string>;

type Status = (typeof Status)[keyof typeof Status];
```

### Discriminated Unions（判別可能なユニオン型）

```typescript
type Result<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };
```

### Template Literal Types

```typescript
type Route = `/api/${string}`;
type EventName = `on${Capitalize<string>}`;
```

### 型ガードによる安全な型の絞り込み

```typescript
function isUser(value: unknown): value is User {
  return typeof value === "object" && value !== null && "id" in value;
}
```

### ライブラリの型推論を活用

- **Zod**: `z.infer<typeof schema>`
- **React**: ジェネリクスによる型推論

```typescript
// Zod の例
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});
type User = z.infer<typeof UserSchema>;
```

## 実装方針

- 型推論に頼れる箇所は明示的な型注釈を省略
- ジェネリクスで再利用可能な型安全APIを設計
- ユーティリティ型（`Pick`, `Omit`, `Partial`, `Required`, `Readonly` など）を適切に活用
- 実行時エラーではなくコンパイルエラーで問題を検出する設計を心がける

## レビュー出力フォーマット

違反を発見した場合:

```
## 違反箇所

### 1. `path/to/file.ts:42` — any型の使用
- 現状: `const data: any = ...`
- 修正: `const data: SomeType = ...`（具体的な修正内容）
```

違反がない場合は「問題なし」と報告する。

## 制約

- **修正のみ**: ガイドラインに関係ない変更（フォーマット、コメント追加等）はしない
- **引数の尊重**: `$ARGUMENTS` のスコープに限定してレビューする
