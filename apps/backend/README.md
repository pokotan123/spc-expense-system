# SPC 経費精算システム バックエンド

## 📋 概要

SPC経費精算システムのバックエンドAPIサーバーです。

## 🚀 セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example`をコピーして`.env`を作成し、必要な環境変数を設定してください。

```bash
cp .env.example .env
```

**必須環境変数**:
- `DATABASE_URL`: PostgreSQLの接続URL
- `JWT_SECRET`: JWT署名用の秘密鍵

### 3. データベースのセットアップ

```bash
# Prismaクライアントの生成
npm run generate

# マイグレーションの実行
npm run migrate:dev

# シードデータの投入
npm run seed
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

サーバーは `http://localhost:3001` で起動します。

## 📝 利用可能なスクリプト

- `npm run dev` - 開発サーバー起動（ホットリロード対応）
- `npm run build` - TypeScriptのビルド
- `npm run start` - 本番サーバー起動
- `npm run generate` - Prismaクライアントの生成
- `npm run migrate:dev` - 開発用マイグレーション
- `npm run migrate` - 本番用マイグレーション
- `npm run seed` - シードデータの投入
- `npm test` - テスト実行
- `npm run lint` - リンター実行

## 🗄️ データベース

### マイグレーション

```bash
# 新しいマイグレーションの作成
npm run migrate:dev -- --name migration_name

# 本番環境でのマイグレーション実行
npm run migrate
```

### シードデータ

シードデータには以下が含まれます：
- テスト用会員（member001）
- テスト用事務局（admin001）
- 部門マスタ（総務部）
- 社内カテゴリマスタ（交通費、会議費、通信費、消耗品費、その他）

## 📚 API仕様

API仕様は `docs/api-specification.yaml` (OpenAPI 3.0形式) を参照してください。

### 主要エンドポイント

- `POST /api/v1/auth/login` - ログイン
- `GET /api/v1/members/me` - 現在の会員情報
- `GET /api/v1/expense-applications` - 申請一覧
- `POST /api/v1/expense-applications` - 申請作成
- `POST /api/v1/admin/expense-applications/:id/approve` - 承認
- `POST /api/v1/admin/payments/generate` - 振込データ生成

## 🔧 技術スタック

- **ランタイム**: Node.js
- **フレームワーク**: Express
- **言語**: TypeScript
- **ORM**: Prisma
- **データベース**: PostgreSQL
- **認証**: JWT
- **バリデーション**: Zod

## 📁 ディレクトリ構成

```
src/
├── app.ts              # Expressアプリケーション設定
├── server.ts           # サーバー起動
├── config/             # 設定ファイル
│   ├── env.ts         # 環境変数
│   └── database.ts    # データベース接続
├── controllers/        # コントローラー
├── routes/            # ルート定義
├── middleware/         # ミドルウェア
├── services/           # ビジネスロジック
└── utils/              # ユーティリティ
```

## 🔐 認証

JWT（JSON Web Token）を使用した認証を実装しています。

- Access Token: 1時間有効
- Refresh Token: 7日間有効

## 🧪 テスト

```bash
# テスト実行
npm test

# カバレッジ確認
npm test -- --coverage
```

## 🚢 デプロイ

Railwayでのデプロイを想定しています。詳細は `docs/デプロイ手順書.md` を参照してください。

## 📝 ライセンス

ISC
