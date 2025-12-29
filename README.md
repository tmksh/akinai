# 商い（アキナイ）CMS

B2B向け編集型EC対応 汎用CMSシステム

![Dashboard](docs/screenshots/dashboard.png)

## 概要

「商い（アキナイ）」は、複数クライアントで共通利用できるCMS基盤です。編集・発信・販売を一体で扱え、長期的に育てられるプロダクトとして設計されています。

### 特徴

- 📦 **商品管理** - 商品・バリエーション・カテゴリー管理
- 📝 **コンテンツ管理** - 記事・ニュース・特集の一元管理
- 🛒 **注文管理** - 注文の確認・処理・発送管理
- 📊 **ダッシュボード** - 売上・注文・在庫の可視化
- 🔧 **機能フラグ** - ON/OFFで機能を柔軟に制御
- 🎨 **モダンUI** - Upsider風のクリーンなデザイン

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS v4
- **UIコンポーネント**: shadcn/ui
- **データ**: モックデータ（Supabase対応予定）

## セットアップ

### 必要条件

- Node.js 18.x 以上
- npm または yarn

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/your-org/akinai.git
cd akinai

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

ブラウザで http://localhost:3000 を開いてください。

## プロジェクト構造

```
src/
├── app/                    # Next.js App Router
│   ├── (admin)/           # 管理画面ルート
│   │   ├── dashboard/     # ダッシュボード
│   │   ├── products/      # 商品管理
│   │   ├── contents/      # コンテンツ管理
│   │   ├── orders/        # 注文管理
│   │   ├── inventory/     # 在庫管理
│   │   └── settings/      # 設定
│   ├── layout.tsx         # ルートレイアウト
│   └── globals.css        # グローバルスタイル
├── components/
│   ├── layout/            # レイアウトコンポーネント
│   ├── providers/         # プロバイダー
│   └── ui/                # shadcn/ui コンポーネント
├── hooks/                 # カスタムフック
├── lib/                   # ユーティリティ・モックデータ
└── types/                 # TypeScript型定義
```

## 主要機能

### ダッシュボード
- 売上・注文数の統計カード
- 売上推移グラフ
- 最近の注文一覧
- 人気商品ランキング
- 在庫アラート

### 商品管理
- 商品一覧・検索・フィルタリング
- 商品登録（バリエーション対応）
- カテゴリー・タグ管理
- SEO設定

### コンテンツ管理
- 記事・ニュース・特集の管理
- タブによる種類別表示
- 公開・下書き・予約公開

### 注文管理
- 注文一覧・検索・フィルタリング
- 注文ステータス管理
- 支払状況管理

### 設定
- サイト基本情報
- EC設定（税金・配送）
- 機能フラグ管理

## 今後の予定

- [ ] Supabaseとの連携
- [ ] 認証システム実装
- [ ] リアルタイムプレビュー
- [ ] ブロックエディタ
- [ ] 見積管理（B2B）
- [ ] AI支援機能

## デザインガイドライン

### カラーパレット

- **プライマリ**: オレンジ系グラデーション（ブランドカラー）
- **サイドバー**: ダークテーマ（Upsider風）
- **コンテンツ**: ライト/ダークモード対応

### UIコンポーネント

shadcn/uiをベースに、以下のコンポーネントを使用：

- Button, Card, Input, Table
- Dialog, Dropdown, Select
- Sidebar, Tabs, Badge
- Chart (Recharts)

## 開発

```bash
# 開発サーバー
npm run dev

# ビルド
npm run build

# 本番起動
npm start

# リント
npm run lint
```

## ライセンス

Private - All rights reserved.

---

**商い（アキナイ）** - 仕事で安心して使えるCMS
