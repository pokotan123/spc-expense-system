FROM node:20

WORKDIR /app

# 依存関係をインストール（devDependenciesも含む）
COPY package*.json ./
RUN npm ci

# Prismaクライアントを生成
COPY prisma ./prisma
RUN npx prisma generate

# アプリケーションコードをコピー
COPY . .

# TypeScriptをビルド
RUN npm run build

# 本番用の依存関係のみに整理（オプション）
RUN npm prune --production

EXPOSE 3001

CMD ["npm", "start"]
