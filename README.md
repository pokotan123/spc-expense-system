# SPC 経費精算システム

SPC経費精算システムのMVP版リポジトリです。

## 📋 プロジェクト概要

経費精算業務のデジタル化・効率化を目的としたWebアプリケーションです。

### 主な機能（MVP）

- 経費申請のオンライン化
- 領収書アップロード + OCR読み取り
- 事務局承認フロー
- 社内カテゴリ管理
- 補助金額算出
- 振込データ生成

## 🏗️ アーキテクチャ

```
Frontend (Vercel) → Backend API (Railway) → PostgreSQL (Railway)
```

- **フロントエンド**: Next.js 14+ (TypeScript)
- **バックエンド**: Node.js + Express (TypeScript)
- **データベース**: PostgreSQL
- **OCR**: Google Cloud Vision API
- **ファイルストレージ**: AWS S3

## 📁 プロジェクト構成

```
spc-expense-system/
├── apps/
│   ├── frontend/          # Next.js フロントエンド
│   └── backend/           # Express バックエンド
├── docs/                  # ドキュメント
│   ├── api-specification.yaml
│   ├── database-schema.md
│   └── ...
└── README.md
```

## 🚀 セットアップ

### 前提条件

- Node.js 20 LTS
- npm または yarn
- PostgreSQL（ローカル開発用）

### ローカル開発環境

#### 1. リポジトリをクローン

```bash
git clone https://github.com/your-org/spc-expense-system.git
cd spc-expense-system
```

#### 2. フロントエンドセットアップ

```bash
cd apps/frontend
npm install
cp .env.example .env.local
# .env.localを編集して環境変数を設定
npm run dev
```

#### 3. バックエンドセットアップ

```bash
cd apps/backend
npm install
cp .env.example .env
# .envを編集して環境変数を設定
npm run migrate  # データベースマイグレーション
npm run dev
```

## 🌐 デプロイ

### Vercel（フロントエンド）

1. Vercelでプロジェクトを作成
2. GitHubリポジトリを接続
3. Root Directory: `apps/frontend` を指定
4. 環境変数を設定
5. 自動デプロイ

詳細は[デプロイ手順書](./docs/デプロイ手順書.md)を参照

### Railway（バックエンド・データベース）

1. Railwayでプロジェクトを作成
2. PostgreSQLデータベースを追加
3. バックエンドサービスを作成
4. Root Directory: `apps/backend` を指定
5. 環境変数を設定
6. 自動デプロイ

詳細は[デプロイ手順書](./docs/デプロイ手順書.md)を参照

## 📚 ドキュメント

- [要件定義書](./docs/MVP要件定義.md)
- [API仕様書](./docs/api-specification.yaml)
- [データベーススキーマ](./docs/database-schema.md)
- [技術スタック定義](./docs/技術スタック定義.md)
- [デプロイ手順書](./docs/デプロイ手順書.md)
- [業務フロー](./docs/SPC経費フロー.mmd)

## 🔧 開発

### コマンド

#### フロントエンド

```bash
cd apps/frontend
npm run dev        # 開発サーバー起動
npm run build      # ビルド
npm run start      # 本番モード起動
npm run lint       # リンター実行
```

#### バックエンド

```bash
cd apps/backend
npm run dev        # 開発サーバー起動
npm run build      # ビルド
npm start          # 本番モード起動
npm run migrate    # マイグレーション実行
npm run test       # テスト実行
```

## 🧪 テスト

```bash
# フロントエンド
cd apps/frontend
npm run test

# バックエンド
cd apps/backend
npm run test
```

## 📝 ライセンス

[ライセンス情報を記載]

## 👥 コントリビューター

[コントリビューター情報を記載]

## 📞 お問い合わせ

[連絡先情報を記載]
