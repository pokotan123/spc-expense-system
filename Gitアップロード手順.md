# Gitアップロード手順

## ✅ 現在の状態

ローカルリポジトリへのコミットは完了しました。
- コミットID: `825dbb9`
- コミットメッセージ: "feat: MVP機能の実装完了"
- 55ファイル、16,058行の追加

## 📋 次のステップ

### 1. GitHubでリポジトリを作成

1. GitHubにログイン
2. 右上の「+」→「New repository」をクリック
3. リポジトリ名を入力（例: `spc-expense-system`）
4. 説明を入力（例: "SPC経費精算システム"）
5. PublicまたはPrivateを選択
6. **「Initialize this repository with a README」はチェックしない**
7. 「Create repository」をクリック

### 2. リモートリポジトリを追加

GitHubでリポジトリを作成したら、以下のコマンドを実行してください：

```bash
cd "/Users/yukio/Downloads/SPCさん/spc-expense-system"

# リモートリポジトリを追加（YOUR_USERNAMEとREPO_NAMEを置き換えてください）
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# またはSSHを使用する場合
git remote add origin git@github.com:YOUR_USERNAME/REPO_NAME.git
```

### 3. プッシュ

```bash
# メインブランチにプッシュ
git push -u origin main
```

### 4. 認証

初回プッシュ時は認証が求められる場合があります：
- **Personal Access Token (PAT)** を使用する場合: パスワードの代わりにPATを入力
- **SSH** を使用する場合: SSH鍵が設定されている必要があります

## 🔧 既存のリポジトリに接続する場合

既にGitHubにリポジトリが存在する場合：

```bash
# リモートを追加
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# 既存のブランチを確認
git branch -M main

# プッシュ
git push -u origin main
```

## 📝 コミット内容

以下の内容がコミットされています：

- ✅ フロントエンド全8画面の実装
- ✅ バックエンド全APIエンドポイントの実装
- ✅ 補助金額算出ロジック
- ✅ 社内カテゴリマスタ管理API
- ✅ バリデーション機能
- ✅ ログ機能
- ✅ ヘルスチェックエンドポイント
- ✅ 環境変数バリデーション
- ✅ データベースセットアップ手順書
- ✅ 各種ドキュメント

## 🚀 デプロイ準備

GitHubにプッシュ後、以下のサービスと連携できます：

1. **Vercel**（フロントエンド）
   - GitHubリポジトリを接続
   - 自動デプロイ設定

2. **Railway**（バックエンド・データベース）
   - GitHubリポジトリを接続
   - PostgreSQLデータベースを追加
   - 環境変数を設定

詳細は `docs/デプロイ手順書.md` を参照してください。
