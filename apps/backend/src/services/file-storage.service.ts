import { env } from '../config/env';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

// ファイルストレージサービス（簡易実装）
// 本番環境ではAWS S3などを使用
export const fileStorageService = {
  uploadFile: async (
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    expenseApplicationId: number
  ): Promise<string> => {
    try {
      // TODO: AWS S3へのアップロード実装
      // 現在はローカルストレージまたはモック

      // ファイル名を生成
      const ext = path.extname(originalName);
      const fileName = `${expenseApplicationId}/${uuidv4()}${ext}`;

      // モック実装（実際にはS3にアップロード）
      // 本番環境では以下のように実装:
      // const s3 = new AWS.S3();
      // await s3.putObject({
      //   Bucket: env.AWS_S3_BUCKET_NAME,
      //   Key: fileName,
      //   Body: buffer,
      //   ContentType: mimeType,
      // }).promise();

      // モックURLを返す
      return `https://storage.example.com/receipts/${fileName}`;
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  },

  deleteFile: async (filePath: string): Promise<void> => {
    try {
      // TODO: AWS S3からの削除実装
      // 現在はモック実装
      console.log('Delete file:', filePath);
    } catch (error) {
      console.error('File delete error:', error);
      throw error;
    }
  },
};
