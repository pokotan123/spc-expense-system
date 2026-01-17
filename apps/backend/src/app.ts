import express, { Express } from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';
import { requestLoggerMiddleware } from './middleware/request-logger.middleware';
import { logger } from './utils/logger';

// ルートインポート
import authRoutes from './routes/auth.routes';
import expenseApplicationRoutes from './routes/expense-application.routes';
import memberRoutes from './routes/member.routes';
import adminRoutes from './routes/admin.routes';
import receiptRoutes from './routes/receipt.routes';
import internalCategoryRoutes from './routes/internal-category.routes';

const app: Express = express();

// ミドルウェア
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLoggerMiddleware);

// ヘルスチェック
app.get('/health', async (req, res) => {
  try {
    // データベース接続確認
    const prisma = (await import('./config/database')).default;
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      version: env.API_VERSION,
    });
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }
});

// APIルート
const apiPrefix = `/api/${env.API_VERSION}`;
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/expense-applications`, expenseApplicationRoutes);
app.use(`${apiPrefix}/members`, memberRoutes);
app.use(`${apiPrefix}/admin`, adminRoutes);
app.use(`${apiPrefix}/receipts`, receiptRoutes);
app.use(`${apiPrefix}/internal-categories`, internalCategoryRoutes);

// エラーハンドリング
app.use(errorHandler);

export default app;
