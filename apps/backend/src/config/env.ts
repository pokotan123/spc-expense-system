import dotenv from 'dotenv';

dotenv.config();

// 環境変数の型定義
interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  API_VERSION: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  CORS_ORIGIN: string;
  GOOGLE_CLOUD_PROJECT_ID: string;
  GOOGLE_APPLICATION_CREDENTIALS: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
  AWS_S3_BUCKET_NAME: string;
  SPC_MEMBER_DB_API_URL: string;
  SPC_MEMBER_DB_API_KEY: string;
}

export const env: EnvConfig = {
  // アプリケーション
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  API_VERSION: process.env.API_VERSION || 'v1',

  // データベース
  DATABASE_URL: process.env.DATABASE_URL || '',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'development-secret-key-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3001',

  // OCR (Google Cloud Vision API)
  GOOGLE_CLOUD_PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',

  // ファイルストレージ (AWS S3)
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
  AWS_REGION: process.env.AWS_REGION || 'ap-northeast-1',
  AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME || '',

  // SPC会員DB連携
  SPC_MEMBER_DB_API_URL: process.env.SPC_MEMBER_DB_API_URL || '',
  SPC_MEMBER_DB_API_KEY: process.env.SPC_MEMBER_DB_API_KEY || '',
};

// 必須環境変数の検証
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
];

if (env.NODE_ENV === 'production') {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
}
