FROM node:20-alpine

WORKDIR /app

# 依存関係をインストール
COPY package*.json ./
RUN npm ci --only=production

# Prismaクライアントを生成
COPY prisma ./prisma
RUN npx prisma generate

# アプリケーションコードをコピー
COPY . .

# ビルド
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
