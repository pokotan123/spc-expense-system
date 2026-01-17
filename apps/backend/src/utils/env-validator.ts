import { env } from '../config/env';
import { logger } from './logger';

/**
 * 環境変数のバリデーション
 * アプリケーション起動時に実行
 */
export const validateEnv = (): void => {
  const errors: string[] = [];

  // 必須環境変数のチェック（開発環境では警告のみ）
  if (env.NODE_ENV === 'production') {
    if (!env.DATABASE_URL) {
      errors.push('DATABASE_URL is required in production');
    }
    if (!env.JWT_SECRET || env.JWT_SECRET === 'development-secret-key-change-in-production') {
      errors.push('JWT_SECRET must be set to a secure value in production');
    }
  }

  // 開発環境での警告
  if (env.NODE_ENV === 'development') {
    if (!env.DATABASE_URL) {
      logger.warn('DATABASE_URL is not set. Database features will not work.');
    }
    if (env.JWT_SECRET === 'development-secret-key-change-in-production') {
      logger.warn('Using default JWT_SECRET. Change this in production!');
    }
  }

  // 外部連携の設定チェック（警告のみ）
  if (!env.GOOGLE_CLOUD_PROJECT_ID) {
    logger.warn('GOOGLE_CLOUD_PROJECT_ID is not set. OCR features will use mock data.');
  }
  if (!env.AWS_S3_BUCKET_NAME) {
    logger.warn('AWS_S3_BUCKET_NAME is not set. File storage will use mock URLs.');
  }
  if (!env.SPC_MEMBER_DB_API_URL) {
    logger.warn('SPC_MEMBER_DB_API_URL is not set. Member authentication will use mock data.');
  }

  // エラーがある場合は例外をスロー
  if (errors.length > 0) {
    const errorMessage = `Environment validation failed:\n${errors.join('\n')}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  logger.info('Environment validation passed');
};
