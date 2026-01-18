'use client';

import { useState, useRef } from 'react';
import { receiptApi } from '@/lib/api/receipts';
import { Receipt } from '@/types';

interface ReceiptUploadProps {
  expenseApplicationId: number;
  onUploadSuccess: (receipt: Receipt) => void;
  disabled?: boolean;
}

export default function ReceiptUpload({ expenseApplicationId, onUploadSuccess, disabled }: ReceiptUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック（10MB）
    if (file.size > 10 * 1024 * 1024) {
      setError('ファイルサイズは10MB以下にしてください');
      return;
    }

    // ファイル形式チェック
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('JPEG、PNG、PDFファイルのみアップロード可能です');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const receipt = await receiptApi.upload(file, expenseApplicationId);
      onUploadSuccess(receipt);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '領収書のアップロードに失敗しました');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg,application/pdf"
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
        className="hidden"
        id="receipt-upload"
      />
      <label
        htmlFor="receipt-upload"
        className={`inline-flex items-center px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ${
          disabled || isUploading
            ? 'border-gray-300 bg-gray-50 text-gray-400 cursor-not-allowed'
            : 'border-blue-300 bg-blue-50 text-blue-700 hover:border-blue-400 hover:bg-blue-100'
        }`}
      >
        {isUploading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>アップロード中...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>領収書をアップロード</span>
          </>
        )}
      </label>
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center">
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}
      <p className="text-xs text-gray-500">JPEG、PNG、PDF形式、最大10MB</p>
    </div>
  );
}
