---
marp: true
theme: gaia
class: invert
paginate: true
style: |
  section {
    font-size: 24px;      /* 全体を 80% に */
  }
  pre > code {
    font-size: 0.8em;      /* コードだけさらに小さめ */
  }
---

# Subpath Importsを正しく使いこなす

Conditional Exportsで環境を制御する  
Laeno / 2025/12/19

---

## 今日のゴール

- **Conditional Exports** の仕組みを理解する
- 環境ごとに実装を **自動切り替え** する方法を掴む
- **Storybook / Vitest / 本番環境** で異なる実装を提供する

---

## Subpath Importsとは？

Node.js v12.20.0+ で導入された、`package.json` の `imports` フィールドで  
パッケージ内のモジュール解決をカスタマイズする仕組み。

```json
{
  "imports": {
    "#utils": "./src/utils/index.js",
    "#components/*": "./src/components/*.js"
  }
}
```

---

## 基本的な使い方

- **`#` で始まることが必須** → `@` や `~` は使えない
- **複数の Subpath Imports を設定可能** → JSON の上から順に評価される

```json
{
  "imports": {
    "#utils": "./src/utils/index.ts",
    "#components/*": "./src/components/*.ts",
    "#api": "./src/api/client.ts"
  }
}
```

小さい方から順にマッチしていくイメージ。

---

## Conditional Exports

環境やツールに応じて、異なるファイルを自動解決。

```json
{
  "imports": {
    "#logger": {
      "storybook": "./src/logger/mock.js",
      "test": "./src/logger/test.js",
      "node": "./src/logger/file.js",
      "browser": "./src/logger/console.js",
      "default": "./src/logger/index.js"
    }
  }
}
```

同じ import 文でも、実行環境によって実装が自動切り替わる ✨

---

## Vite環境で resolve.conditions を設定

`vite.config.ts` で独自条件を有効化し、`package.json` と組み合わせて動作させる。

```ts
// vite.config.ts
export default defineConfig({
  resolve: {
    conditions: ['storybook', 'browser', 'import'],
  },
});
```

```json
// package.json
{
  "imports": {
    "#logger": {
      "storybook": "./src/logger/mock.ts",
      "default": "./src/logger/index.ts"
    }
  }
}
```

---

## TypeScript pathsとの比較

| 項目       | TypeScript paths                | Subpath Imports                     |
| ---------- | ------------------------------- | ----------------------------------- |
| 動作環境   | `tsc` のみ                      | **すべてのツール**                  |
| ランタイム | 追加設定が必要（`vite-tsconfig-paths` 等） | **そのまま動作**                    |
| 条件分岐   | ❌ 不可能                        | **✅ 可能**                         |
| 標準仕様   | TypeScript 独自                 | **Node.js 標準**                    |

---

## よく使われる条件

| 条件        | 用途                                   | 自動定義                 |
| ----------- | -------------------------------------- | ------------------------ |
| `storybook` | Storybook 環境 → モック使用            | ❌ 明示的に設定          |
| `test`      | テスト実行 → モック / テスト用実装     | ❌ 明示的に設定          |
| `node`      | Node.js 環境 → サーバー側実装          | ✅ Node.js デフォルト    |
| `browser`   | ブラウザ環境 → クライアント側実装      | ✅ Vite デフォルト       |
| `default`   | フォールバック → 本番環境など          | ✅ 常に有効              |

---

## 実装例：Google Places APIのモック化

**Before：問題点**

- Storybook 実行時も実 API 呼び出し → **通信が遅い**
- 開発者全員の毎日の操作で API 呼び出し増加 → **課金される** 💸

---

## 実装例：Google Places APIのモック化

**After：解決方法**

```json
{
  "imports": {
    "#src/components/containers/hooks/api/useLocationPredictions/_usePlacesApi": {
      "storybook": "./src/components/containers/hooks/api/useLocationPredictions/_usePlacesApi.mock.ts",
      "default": "./src/components/containers/hooks/api/useLocationPredictions/_usePlacesApi.ts"
    }
  }
}
```

→ Storybook 実行時は自動で `mock.ts` に切り替わり、  
API キー不要・オフラインで動作。

---

## Storybookで独自条件を有効にする

```ts
// .storybook/main.ts
export default {
  viteFinal: async (config) => {
    config.resolve = {
      ...config.resolve,
      conditions: ['storybook', 'browser', 'import'],
    };
    return config;
  },
};
```

→ `storybook` 条件を優先リストに追加して解決させる。

---

## ハマったポイント

Subpath Imports 導入時、`vite-tsconfig-paths` の `resolve.alias` に上書きされた。

```ts
// vite.config.ts - 既存設定
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()], // ← これが alias を生成
  // TypeScript paths が resolve.alias に展開される
  // Subpath Imports が効かなくなる ⚠️
});
```

→ `package.json` の `imports` より alias が優先される。既存ツール設定の確認が重要。

---

## 推奨される使い方

- **`package.json` の `imports` を基準に** → 1 箇所管理
- **TypeScript paths は型用のみ** → IDE 補完に使う
- **各ツール（Storybook / Vitest）の conditions を活用** → 条件分岐を有効に

---

## まとめ

- **Conditional Exports** で環境を制御できる
- Storybook / テスト環境など用のモックを簡単に切り替え可能
- 既存ツール設定（`vite-tsconfig-paths` 等）の確認が重要

---

## Q&A 1

**Q. TypeScript paths じゃダメなの？**

**A.** TypeScript paths はコンパイラ・IDE 向けで、ランタイムは別設定が必要。

- Subpath Imports は Node.js 標準で、対応ツールがそのまま解決
- **最大の違い：条件付き解決** ができるのは Subpath Imports だけ
- 環境ごとに実装を自動切り替えは TypeScript paths ではできない

---

## Q&A 2

**Q. 既存コードベースへの段階的導入は？**

**A.** いきなり全部書き換えは避けて、スモールスタートがベスト。

- まずは **Storybook でモックしたい箇所** だけ `imports` に追加
- コンポーネント側の import を **ピンポイントで書き換え**
- 問題ないことを確認してから、他の箇所に広げる

---

## モノレポでの注意点

- **各パッケージで `package.json` の `imports` は独立** → 共有されない
- **ワークスペース全体で同一ルール** を適用するなら：
  - テンプレート化か、スクリプトで `imports` 定義を生成する
  - linter ルール（`eslint-plugin-import` 等）で検証
- **パッケージ間の import は別設定** → `package.json` の `exports` フィールドで public API を定義

---

# ご清聴ありがとうございました
