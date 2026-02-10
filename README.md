# SPC通商 経費精算システム

SPC（全国約1,400名の任意団体、アクティブ約100名）の経費精算業務をデジタル化するWebアプリケーション。
申請 → 領収書OCR → 承認 → 振込データ生成の一気通貫フローを実現する。

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS 3 + shadcn/ui (Radix UI) |
| State管理 | TanStack Query v5 + Zustand 5 |
| フォーム | React Hook Form 7 + Zod 3 |
| Backend | Node.js 20 + Hono 4 + TypeScript |
| ORM | Prisma 6 |
| DB | PostgreSQL 16 |
| 認証 | JWT (jose) + bcryptjs |
| ストレージ | Cloudflare R2 (S3互換、ローカルFSフォールバック付き) |
| モノレポ | Turborepo 2 + npm workspaces |
| テスト | Vitest 2 |

## デプロイ環境

| サービス | プラットフォーム | URL |
|---------|----------------|-----|
| Frontend | Vercel | https://spc-expense.vercel.app |
| Backend API | Railway | https://spc-api-production.up.railway.app/api |
| Database | Railway PostgreSQL | - |

## プロジェクト構造

```
spc-expense-system/          # Turborepo モノレポ
├── apps/
│   ├── api/                 # Hono バックエンドAPI
│   │   └── src/
│   │       ├── routes/      # エンドポイント定義
│   │       ├── services/    # ビジネスロジック
│   │       ├── middleware/   # 認証・バリデーション
│   │       ├── lib/         # ユーティリティ
│   │       └── config/      # 設定
│   └── web/                 # Next.js フロントエンド
│       └── src/
│           ├── app/         # App Router ページ
│           ├── components/  # UIコンポーネント
│           ├── hooks/       # カスタムフック
│           ├── lib/         # ユーティリティ
│           └── stores/      # Zustand ストア
├── packages/
│   ├── shared/              # 共有 Zod スキーマ・型・定数
│   └── db/                  # Prisma スキーマ・マイグレーション・シード
├── turbo.json
├── docker-compose.yml       # ローカル PostgreSQL
└── vercel.json
```

## 画面一覧（8画面）

| 画面ID | 画面名 | パス | 対象 |
|--------|-------|------|------|
| SCR-001 | ログイン | `/login` | 全員 |
| SCR-002 | マイページ（ダッシュボード） | `/dashboard` | 全員 |
| SCR-003 | 申請一覧（会員） | `/applications` | 会員 |
| SCR-004 | 申請作成/編集 | `/applications/new`, `/applications/:id/edit` | 会員 |
| SCR-005 | 申請詳細（会員） | `/applications/:id` | 会員 |
| SCR-010 | 申請一覧（事務局） | `/admin/applications` | 管理者 |
| SCR-011 | 申請詳細/承認 | `/admin/applications/:id` | 管理者 |
| SCR-013 | 振込データ出力 | `/admin/payments` | 管理者 |

## セットアップ

### 前提条件

- Node.js 20以上
- PostgreSQL 16（またはDocker）

### 手順

```bash
# 1. 依存パッケージのインストール
npm install

# 2. ローカルDBの起動（Dockerを使用する場合）
docker compose up -d

# 3. 環境変数の設定
cp apps/api/.env.example apps/api/.env
# DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET を設定

# 4. Prisma クライアント生成
npx prisma generate --schema=packages/db/prisma/schema.prisma

# 5. マイグレーション実行
npx prisma migrate dev --schema=packages/db/prisma/schema.prisma

# 6. テストデータ投入
npx tsx packages/db/prisma/seed.ts

# 7. 開発サーバー起動（API: 3001, Web: 3000）
npm run dev
```

## 環境変数

### 必須

| 変数名 | 説明 |
|--------|------|
| `DATABASE_URL` | PostgreSQL 接続文字列 |
| `JWT_SECRET` | JWTアクセストークン署名キー（32文字以上） |
| `JWT_REFRESH_SECRET` | JWTリフレッシュトークン署名キー（32文字以上） |

### オプション

| 変数名 | デフォルト | 説明 |
|--------|-----------|------|
| `PORT` | `3001` | APIサーバーポート |
| `CORS_ORIGIN` | - | CORS許可オリジン |
| `S3_ENDPOINT` | - | Cloudflare R2エンドポイント |
| `S3_ACCESS_KEY_ID` | - | S3アクセスキー |
| `S3_SECRET_ACCESS_KEY` | - | S3シークレットキー |
| `S3_BUCKET_NAME` | - | S3バケット名 |

## テストアカウント

| 役割 | 会員ID | パスワード |
|------|--------|-----------|
| 管理者（事務局） | SPC-0001 | admin123 |
| 一般会員 | SPC-0002 | member123 |

## テスト

```bash
# 全テスト実行（121テスト: shared 67, api 54）
npm test

# カバレッジ付き
npm run test:coverage
```

## 主要機能

### 会員向け

- 経費申請の作成・編集・削除（CRUD）
- 領収書画像アップロード（複数枚対応）
- OCR結果の確認・手動修正
- 下書き保存・申請送信

### 事務局向け

- 申請一覧（ステータス・期間・会員による高度フィルタリング）
- 承認・差戻し・却下（コメント付き）
- 内部カテゴリの設定
- 補助金額（finalAmount）の算出・設定

### 振込データ

- 全銀フォーマット（Shift-JIS）データ生成
- CSVエクスポート

### 認証・セキュリティ

- JWT認証（アクセストークン15分 / リフレッシュトークン7日）
- ロールベースアクセス制御（ADMIN / MEMBER）
- CSP、HSTS ヘッダー
- レート制限
- Zod による入力バリデーション

## DBスキーマ（9テーブル）

| テーブル名 | 説明 |
|-----------|------|
| `members` | 会員マスタ（役割: ADMIN / MEMBER） |
| `departments` | 部署マスタ |
| `internal_categories` | 内部カテゴリマスタ |
| `expense_applications` | 経費申請（DRAFT → SUBMITTED → APPROVED/RETURNED/REJECTED） |
| `receipts` | 領収書ファイル |
| `ocr_results` | OCR解析結果 |
| `application_comments` | 申請コメント（承認・差戻し理由等） |
| `payments` | 振込データ |
| `refresh_tokens` | リフレッシュトークン |

## APIエンドポイント

### 認証

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/api/auth/login` | ログイン |
| POST | `/api/auth/refresh` | トークンリフレッシュ |
| POST | `/api/auth/logout` | ログアウト |

### 経費申請（会員）

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/applications` | 自分の申請一覧 |
| POST | `/api/applications` | 申請作成 |
| GET | `/api/applications/:id` | 申請詳細 |
| PUT | `/api/applications/:id` | 申請更新 |
| DELETE | `/api/applications/:id` | 申請削除 |
| POST | `/api/applications/:id/submit` | 申請送信 |
| POST | `/api/applications/:id/receipts` | 領収書アップロード |

### 事務局管理

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/admin/applications` | 全申請一覧（フィルタ付き） |
| PUT | `/api/admin/applications/:id/approve` | 承認 |
| PUT | `/api/admin/applications/:id/return` | 差戻し |
| PUT | `/api/admin/applications/:id/reject` | 却下 |
| POST | `/api/admin/payments/generate` | 振込データ生成 |

## ライセンス

Private
