# Flyer Dungeon (チラシの裏ダンジョン)

5つのサイコロを使ったソロプレイ用ローグライクダイスゲーム。印刷版とブラウザ版の両方を提供。

## プロジェクト構造

```
flyer/
├── flyerdungeon.yaml   # SoT: ゲームルールの正本
├── src/                # TypeScriptソースコード
│   ├── main.ts         # エントリーポイント
│   ├── rules.ts        # ゲームロジック (init, step, getView)
│   ├── renderer.ts     # DOM描画
│   ├── types.ts        # 型定義
│   ├── i18n.ts         # 多言語対応
│   ├── guide.ts        # 遊び方ガイド
│   └── playSound.ts    # 効果音
├── print/              # 印刷版
│   └── flyerdungeon.html  # A4印刷用HTML (単体完結)
├── index.html          # ブラウザゲーム エントリーHTML
├── main.js             # esbuildによるトランスパイル生成物
└── styles.css          # ブラウザ版スタイル
```

## Source of Truth (SoT)

**`flyerdungeon.yaml`** がゲームルールの唯一の正本。

### ゲーム構造 (flyerdungeon.yaml)

- **dice_rules**: 5個の6面ダイス
- **flow**: ターン構造
  - roll_phase: 最大3回振り直し可能
  - skill_phase: スキル使用
  - choose_category_phase: カテゴリ選択
- **categories**: 達成条件ノード (dungeon, str, dex, int の4グループ)
- **skills**: 3つのスキル (mighty, acrobatics, metamorph)
- **win_lose_conditions**: 勝敗条件

## ゲームルール概要

### 目標
ダンジョン5階層を踏破する (dungeon_floor_5 達成で勝利)

### ターン進行
1. サイコロを振る (最大3回、選択的振り直し可)
2. スキル使用 (アンロック済みなら)
3. 条件を満たすカテゴリを1つ選択してチェック

### カテゴリグループ
- **dungeon**: 階層進行 (floor_1→2→3→4→5 の順序制約あり)
- **str**: 筋力系 (フルハウス、フォーカード等)
- **dex**: 敏捷系 (ストレート、フリー等)
- **int**: 知力系 (ペア、ツーペア等)

### スキル (各グループ3つチェックでアンロック)
- **Mighty** (STR): ダイス1つを6に変更
- **Acrobatics** (DEX): ダイス1つを-1
- **Metamorph** (INT): ダイス目を反転 (1↔6, 2↔5, 3↔4)

### 敗北条件
選択可能なカテゴリが存在しないターンで敗北

## 開発コマンド

```bash
npm run build      # TypeScript → main.js (esbuild)
npm run type-check # 型チェックのみ
```

## アーキテクチャ

### ブラウザ版 (src/)
- **純粋関数設計**: `rules.ts` のロジックは副作用なし
- **単方向データフロー**: State → View → Renderer
- **イベント駆動**: PlayerAction → step() → 新State

### 印刷版 (print/)
- **単体完結HTML**: 外部依存なし、A4印刷対応
- **手動プレイ用**: チェックボックスとスコアシート

## 技術スタック

- TypeScript 5.3
- esbuild (バンドラー)
- Vanilla JS (フレームワークなし)
