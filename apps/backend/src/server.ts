import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { validateEnv } from './utils/env-validator';

// 環境変数のバリデーション
try {
  validateEnv();
} catch (error) {
  logger.error('Failed to start server due to environment validation errors', error);
  process.exit(1);
}

const PORT = env.PORT;

app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    apiVersion: env.API_VERSION,
    environment: env.NODE_ENV,
    url: `http://localhost:${PORT}`,
  });
  
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📝 Environment: ${env.NODE_ENV}`);
  console.log(`🔗 API: http://localhost:${PORT}/api/${env.API_VERSION}`);
});
