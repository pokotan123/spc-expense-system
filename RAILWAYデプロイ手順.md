# Railwayデプロイ手順（簡易版）

## 📋 前提条件

1. GitHubアカウント
2. Railwayアカウント（https://railway.app でGitHubアカウントでサインアップ）
3. GitHubリポジトリが既に作成されていること（✅ 完了）

---

## 🚀 デプロイ手順

### ステップ1: Railwayにログイン

1. https://railway.app にアクセス
2. 「Login with GitHub」をクリックしてGitHubアカウントでログイン

### ステップ2: プロジェクトの作成

1. Railwayダッシュボードで「New Project」をクリック
2. 「Deploy from GitHub repo」を選択
3. リポジトリ一覧から `pokotan123/spc-expense-system` を選択
4. 「Deploy」をクリック

### ステップ3: PostgreSQLデータベースの追加

1. プロジェクトダッシュボードで「+ New」をクリック
2. 「Database」→「Add PostgreSQL」を選択
3. データベースが作成されるまで待機（約1-2分）

### ステップ4: バックエンドサービスの設定

1. プロジェクトダッシュボードで「+ New」をクリック
2. 「GitHub Repo」を選択
3. `pokotan123/spc-expense-system` を選択
4. サービスが作成されたら、「Settings」タブを開く

#### Root Directoryの設定
- 「Root Directory」に以下を入力：
  ```
  apps/backend
  ```

#### Build Commandの設定
- 「Build Command」に以下を入力（または既に設定されていることを確認）：
  ```
  npm install && npm run generate && npm run build
  ```

#### Start Commandの設定
- 「Start Command」に以下を入力（または既に設定されていることを確認）：
  ```
  npm start
  ```

### ステップ5: 環境変数の設定

バックエンドサービスの「Variables」タブで以下を追加：

#### 必須環境変数

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | PostgreSQLの接続URL（PostgreSQLサービスを選択すると自動設定） |
| `JWT_SECRET` | （ランダムな文字列） | JWT署名用の秘密鍵（32文字以上推奨） |
| `PORT` | `3001` | サーバーポート |
| `NODE_ENV` | `production` | 環境設定 |
| `API_VERSION` | `v1` | APIバージョン |
| `JWT_EXPIRES_IN` | `1h` | JWT有効期限 |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | リフレッシュトークン有効期限 |
| `CORS_ORIGIN` | `*` | CORS設定（後でVercelのURLに更新） |

#### JWT_SECRETの生成方法

ターミナルで以下を実行：
```bash
openssl rand -base64 32
```

生成された文字列を `JWT_SECRET` に設定してください。

#### オプション環境変数（後で設定可能）

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `GOOGLE_CLOUD_PROJECT_ID` | （未設定可） | Google Cloud Vision API用 |
| `AWS_ACCESS_KEY_ID` | （未設定可） | AWS S3用 |
| `AWS_SECRET_ACCESS_KEY` | （未設定可） | AWS S3用 |
| `AWS_S3_BUCKET_NAME` | （未設定可） | AWS S3用 |
| `SPC_MEMBER_DB_API_URL` | （未設定可） | SPC会員DB API用 |
| `SPC_MEMBER_DB_API_KEY` | （未設定可） | SPC会員DB API用 |

### ステップ6: デプロイの確認

1. バックエンドサービスの「Deployments」タブでデプロイ状況を確認
2. デプロイが完了するまで待機（約3-5分）
3. 「Logs」タブでログを確認し、エラーがないか確認

### ステップ7: データベースマイグレーションの実行

デプロイが完了したら、データベースマイグレーションを実行します。

#### 方法1: Railway CLIを使用（推奨）

```bash
cd "/Users/yukio/Downloads/SPCさん/spc-expense-system/apps/backend"
npx @railway/cli login
npx @railway/cli link
npx @railway/cli run npm run migrate
npx @railway/cli run npm run seed
```

#### 方法2: Railwayダッシュボードから

1. バックエンドサービスの「Settings」→「Deploy」タブ
2. 「Deploy Command」を一時的に以下に変更：
   ```
   npm run migrate && npm start
   ```
3. 「Redeploy」をクリック
4. デプロイ完了後、「Deploy Command」を `npm start` に戻す

### ステップ8: カスタムドメインの生成

1. バックエンドサービスの「Settings」→「Networking」タブ
2. 「Generate Domain」をクリック
3. 生成されたURLをコピー（例: `spc-expense-backend.railway.app`）

### ステップ9: 動作確認

1. 生成されたURLにアクセス（例: `https://spc-expense-backend.railway.app/health`）
2. 以下のようなJSONが返ってくることを確認：
   ```json
   {
     "status": "ok",
     "timestamp": "2024-01-01T00:00:00.000Z",
     "database": "connected",
     "version": "v1"
   }
   ```

---

## 🔧 トラブルシューティング

### デプロイエラー

**問題**: ビルドエラーが発生する

**解決方法**:
1. Railwayダッシュボードの「Deployments」タブでエラーログを確認
2. 「Root Directory」が `apps/backend` に設定されているか確認
3. 「Build Command」が正しく設定されているか確認

### データベース接続エラー

**問題**: データベースに接続できない

**解決方法**:
1. PostgreSQLサービスの「Variables」タブで `DATABASE_URL` を確認
2. バックエンドサービスの環境変数に `DATABASE_URL=${{Postgres.DATABASE_URL}}` が設定されているか確認
3. マイグレーションが実行されているか確認

### サーバーが起動しない

**問題**: サーバーが起動しない

**解決方法**:
1. 「Logs」タブでエラーメッセージを確認
2. 環境変数（特に `JWT_SECRET` と `PORT`）が設定されているか確認
3. `NODE_ENV=production` が設定されているか確認

---

## 📝 次のステップ

1. **Vercelの設定**: フロントエンドをVercelにデプロイ
2. **CORS設定の更新**: VercelのURLを取得したら、`CORS_ORIGIN` を更新
3. **環境変数の更新**: Vercelの `NEXT_PUBLIC_API_URL` にRailwayのURLを設定

---

## 🔗 参考リンク

- [Railway Documentation](https://docs.railway.app)
- [Railway CLI](https://docs.railway.app/develop/cli)
