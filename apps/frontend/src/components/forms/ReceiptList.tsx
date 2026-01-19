'use client';

import { useState } from 'react';
import { Receipt, OCRResult } from '@/types';
import { receiptApi } from '@/lib/api/receipts';
import { format } from 'date-fns';

interface ReceiptListProps {
  receipts: Receipt[];
  expenseApplicationId: number;
  onDelete: (receiptId: number) => void;
  onOCRComplete?: (receiptId: number, ocrResult: OCRResult) => void;
  canEdit?: boolean;
  showOCRButton?: boolean; // 管理者画面でのみ表示
}

export default function ReceiptList({ receipts, expenseApplicationId, onDelete, onOCRComplete, canEdit = true, showOCRButton = false }: ReceiptListProps) {
  const [processingOCR, setProcessingOCR] = useState<number | null>(null);
  const [ocrResults, setOcrResults] = useState<Record<number, OCRResult>>({});

  const handleOCR = async (receiptId: number) => {
    setProcessingOCR(receiptId);
    try {
      const result = await receiptApi.executeOCR(receiptId);
      setOcrResults((prev) => ({ ...prev, [receiptId]: result }));
      if (onOCRComplete) {
        onOCRComplete(receiptId, result);
      }
    } catch (error) {
      console.error('OCR execution failed:', error);
      alert('OCR処理に失敗しました');
    } finally {
      setProcessingOCR(null);
    }
  };

  const handleDelete = async (receiptId: number) => {
    if (!confirm('この領収書を削除しますか？')) return;

    try {
      await receiptApi.delete(receiptId);
      onDelete(receiptId);
    } catch (error) {
      console.error('Delete receipt failed:', error);
      alert('領収書の削除に失敗しました');
    }
  };

  if (receipts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
        <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        領収書 ({receipts.length})
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {receipts.map((receipt) => {
          const ocrResult = receipt.ocrResult || ocrResults[receipt.id];
          const isImage = receipt.mimeType.startsWith('image/');

          return (
            <div key={receipt.id} className="card group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 truncate">{receipt.fileName}</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {format(new Date(receipt.createdAt), 'yyyy年MM月dd日 HH:mm')}
                  </p>
                </div>
                {canEdit && (
                  <button
                    onClick={() => handleDelete(receipt.id)}
                    className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="削除"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>

              {isImage ? (
                <div className="mb-3 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                  <img
                    src={receipt.fileUrl}
                    alt={receipt.fileName}
                    className="w-full h-48 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f3f4f6" width="200" height="200"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E画像を読み込めません%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
              ) : (
                <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-8 flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm text-gray-500">PDFファイル</p>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <a
                  href={receipt.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 btn-secondary text-center py-2 text-sm"
                >
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  表示
                </a>
                {showOCRButton && (
                  <button
                    onClick={() => handleOCR(receipt.id)}
                    disabled={processingOCR === receipt.id}
                    className="px-3 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium flex items-center"
                  >
                    {processingOCR === receipt.id ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        OCR処理中
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        OCR実行
                      </>
                    )}
                  </button>
                )}
              </div>

              {ocrResult && (
                <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <h5 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                    <svg className="w-4 h-4 mr-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    OCR抽出結果
                  </h5>
                  <div className="space-y-2 text-sm">
                    {ocrResult.extractedDate && (
                      <div className="flex items-center text-gray-700">
                        <span className="font-medium w-20">日付:</span>
                        <span>{format(new Date(ocrResult.extractedDate), 'yyyy年MM月dd日')}</span>
                      </div>
                    )}
                    {ocrResult.extractedAmount && (
                      <div className="flex items-center text-gray-700">
                        <span className="font-medium w-20">金額:</span>
                        <span className="font-bold">¥{ocrResult.extractedAmount.toLocaleString()}</span>
                      </div>
                    )}
                    {ocrResult.extractedStoreName && (
                      <div className="flex items-center text-gray-700">
                        <span className="font-medium w-20">店舗名:</span>
                        <span>{ocrResult.extractedStoreName}</span>
                      </div>
                    )}
                    {ocrResult.confidence && (
                      <div className="flex items-center text-gray-600 text-xs mt-2">
                        <span className="font-medium w-20">信頼度:</span>
                        <span>{(ocrResult.confidence * 100).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
