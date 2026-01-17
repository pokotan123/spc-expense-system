import { env } from '../config/env';

// OCR結果の型定義
export interface OCRResult {
  extractedDate?: string;
  extractedAmount?: number;
  extractedStoreName?: string;
  extractedText?: string;
  confidence?: number;
}

export const ocrService = {
  processReceipt: async (fileUrl: string): Promise<OCRResult> => {
    try {
      // TODO: Google Cloud Vision APIを使用したOCR実装
      // 現在はモック実装

      // モックデータ（実際の実装ではGoogle Cloud Vision APIを呼び出す）
      return {
        extractedDate: new Date().toISOString().split('T')[0],
        extractedAmount: 1000,
        extractedStoreName: 'テスト店舗',
        extractedText: '領収書\n日付: 2024-01-01\n金額: 1,000円\n店舗: テスト店舗',
        confidence: 0.95,
      };
    } catch (error) {
      console.error('OCR processing error:', error);
      throw error;
    }
  },
};
