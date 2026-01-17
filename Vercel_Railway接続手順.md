# Vercel & Railway 接続手順書

## 📋 前提条件

1. GitHubアカウントを持っていること
2. Vercelアカウント（GitHubでサインアップ可能）
3. Railwayアカウント（GitHubでサインアップ可能）
4. GitHubにリポジトリが作成されていること

---

## 🔵 Part 1: GitHubリポジトリの準備

### 1. GitHubでリポジトリを作成

1. https://github.com にアクセス
2. 右上の「+」→「New repository」をクリック
3. リポジトリ名: `spc-expense-system`
4. 説明: "SPC経費精算システム"
5. PublicまたはPrivateを選択
6. **「Initialize this repository with a README」はチェックしない**
7. 「Create repository」をクリック

### 2. ローカルリポジトリをGitHubに接続

```bash
cd "/Users/yukio/Downloads/SPCさん/spc-expense-system"

# リモートリポジトリを追加（YOUR_USERNAMEを置き換え）
git remote add origin https://github.com/YOUR_USERNAME/spc-expense-system.git

# プッシュ
git push -u origin main
```

**注意**: 初回プッシュ時は認証が必要です。Personal Access Token (PAT) を使用してください。

---

## 🟢 Part 2: Vercel（フロントエンド）の設定

### 1. Vercelアカウントの作成

1. https://vercel.com にアクセス
2. 「Sign Up」をクリック
3. 「Continue with GitHub」を選択してGitHubアカウントでログイン

### 2. プロジェクトのインポート

1. Vercelダッシュボードで「Add New...」→「Project」をクリック
2. GitHubリポジトリ一覧から `spc-expense-system` を選択
3. 「Import」をクリック

### 3. プロジェクト設定

**Root Directory**:
```
apps/frontend
```

**Framework Preset**:
```
Next.js
```

**Build Command**:
```
npm run build
```

**Output Directory**:
```
.next
```

**Install Command**:
```
npm install
```

### 4. 環境変数の設定

Vercelダッシュボードの「Settings」→「Environment Variables」で以下を追加：

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `NEXT_PUBLIC_API_URL` | `https://your-railway-app.railway.app/api/v1` | バックエンドAPIのURL（Railway設定後に更新） |

**注意**: RailwayのURLは後で設定します。最初は `http://localhost:3001/api/v1` でも可。

### 5. デプロイ

1. 「Deploy」をクリック
2. デプロイが完了するまで待機（約2-3分）
3. デプロイ完了後、URLが表示されます（例: `https://spc-expense-system.vercel.app`）

---

## 🟡 Part 3: Railway（バックエンド・データベース）の設定

### 1. Railwayアカウントの作成

1. https://railway.app にアクセス
2. 「Start a New Project」をクリック
3. 「Login with GitHub」を選択してGitHubアカウントでログイン

### 2. プロジェクトの作成

1. 「New Project」をクリック
2. 「Deploy from GitHub repo」を選択
3. `spc-expense-system` リポジトリを選択

### 3. PostgreSQLデータベースの追加

1. プロジェクトダッシュボードで「+ New」をクリック
2. 「Database」→「Add PostgreSQL」を選択
3. データベースが作成されるまで待機（約1-2分）

### 4. バックエンドサービスの追加

1. プロジェクトダッシュボードで「+ New」をクリック
2. 「GitHub Repo」を選択
3. `spc-expense-system` を選択
4. 「Settings」タブで以下を設定：

**Root Directory**:
```
apps/backend
```

**Build Command**:
```
npm install && npm run generate && npm run build
```

**Start Command**:
```
npm start
```

### 5. 環境変数の設定

Railwayダッシュボードの「Variables」タブで以下を追加：

#### 必須環境変数

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `DATABASE_URL` | （自動設定） | PostgreSQLの接続URL（Railwayが自動生成） |
| `JWT_SECRET` | （ランダムな文字列） | JWT署名用の秘密鍵（32文字以上推奨） |
| `PORT` | `3001` | サーバーポート |
| `CORS_ORIGIN` | `https://your-vercel-app.vercel.app` | VercelのURL（Vercel設定後に更新） |
| `NODE_ENV` | `production` | 環境設定 |

#### オプション環境変数（外部連携用）

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `GOOGLE_CLOUD_PROJECT_ID` | （未設定可） | Google Cloud Vision API用 |
| `AWS_ACCESS_KEY_ID` | （未設定可） | AWS S3用 |
| `AWS_SECRET_ACCESS_KEY` | （未設定可） | AWS S3用 |
| `AWS_S3_BUCKET_NAME` | （未設定可） | AWS S3用 |
| `SPC_MEMBER_DB_API_URL` | （未設定可） | SPC会員DB API用 |
| `SPC_MEMBER_DB_API_KEY` | （未設定可） | SPC会員DB API用 |

**JWT_SECRETの生成方法**:
```bash
# ターミナルで実行
openssl rand -base64 32
```

### 6. データベースマイグレーションの実行

Railwayのバックエンドサービスの「Deployments」タブで：

1. 最新のデプロイメントをクリック
2. 「View Logs」をクリック
3. ターミナルで以下を実行（またはRailwayのCLIを使用）：

```bash
# Railway CLIを使用する場合
railway run npm run migrate
railway run npm run seed
```

**または、Railwayダッシュボードから**:
1. バックエンドサービスの「Settings」→「Deploy」タブ
2. 「Deploy Command」に以下を追加：
   ```
   npm run migrate && npm start
   ```
3. 初回デプロイ後に「Deploy Command」を `npm start` に戻す

### 7. カスタムドメインの設定（オプション）

1. バックエンドサービスの「Settings」→「Networking」タブ
2. 「Generate Domain」をクリック
3. 生成されたURLをコピー（例: `spc-expense-backend.railway.app`）

### 8. Vercelの環境変数を更新

1. Vercelダッシュボードに戻る
2. 「Settings」→「Environment Variables」
3. `NEXT_PUBLIC_API_URL` を更新：
   ```
   https://spc-expense-backend.railway.app/api/v1
   ```
4. 「Redeploy」をクリック

### 9. RailwayのCORS設定を更新

1. Railwayダッシュボードに戻る
2. バックエンドサービスの「Variables」
3. `CORS_ORIGIN` をVercelのURLに更新：
   ```
   https://spc-expense-system.vercel.app
   ```
4. サービスが自動的に再デプロイされます

---

## ✅ 動作確認

### 1. フロントエンドの確認

1. VercelのURLにアクセス（例: `https://spc-expense-system.vercel.app`）
2. ログイン画面が表示されることを確認

### 2. バックエンドの確認

1. RailwayのバックエンドURLにアクセス（例: `https://spc-expense-backend.railway.app/health`）
2. 以下のようなJSONが返ってくることを確認：
   ```json
   {
     "status": "ok",
     "timestamp": "2024-01-01T00:00:00.000Z",
     "database": "connected",
     "version": "v1"
   }
   ```

### 3. 統合テスト

1. フロントエンドからログインを試す
2. 申請作成を試す
3. エラーが発生する場合は、ブラウザの開発者ツール（F12）でエラーを確認

---

## 🔧 トラブルシューティング

### Vercelのデプロイエラー

**問題**: ビルドエラーが発生する

**解決方法**:
1. Vercelダッシュボードの「Deployments」タブでエラーログを確認
2. `apps/frontend/package.json` の `build` スクリプトを確認
3. 環境変数が正しく設定されているか確認

### Railwayのデプロイエラー

**問題**: サーバーが起動しない

**解決方法**:
1. Railwayダッシュボードの「Deployments」タブでログを確認
2. 環境変数（特に `DATABASE_URL` と `JWT_SECRET`）が設定されているか確認
3. `PORT` 環境変数が設定されているか確認

### データベース接続エラー

**問題**: データベースに接続できない

**解決方法**:
1. RailwayのPostgreSQLサービスの「Variables」タブで `DATABASE_URL` を確認
2. バックエンドサービスの環境変数に `DATABASE_URL` が設定されているか確認
3. マイグレーションが実行されているか確認

### CORSエラー

**問題**: フロントエンドからAPIにアクセスできない

**解決方法**:
1. Railwayの `CORS_ORIGIN` 環境変数がVercelのURLと一致しているか確認
2. プロトコル（http/https）が正しいか確認
3. 末尾のスラッシュがないか確認

---

## 📝 次のステップ

1. **カスタムドメインの設定**（オプション）
   - VercelとRailwayの両方でカスタムドメインを設定可能

2. **SSL証明書**
   - VercelとRailwayは自動的にSSL証明書を提供

3. **監視・ログ**
   - Vercel: Analytics、Logs
   - Railway: Metrics、Logs

4. **CI/CD**
   - GitHubにプッシュすると自動的にデプロイされます

---

## 🔗 参考リンク

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)

---

## 📞 サポート

問題が発生した場合：
1. 上記のトラブルシューティングを確認
2. Vercel/Railwayのドキュメントを参照
3. ログを確認してエラーメッセージを特定
