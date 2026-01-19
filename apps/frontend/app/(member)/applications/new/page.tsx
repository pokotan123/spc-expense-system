'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import MainLayout from '@/components/layouts/MainLayout';
import { expenseApplicationApi, receiptApi } from '@/lib/api';
import Link from 'next/link';
import { Receipt } from '@/types';

const applicationSchema = z.object({
  expenseDate: z.string().min(1, '経費発生日を入力してください'),
  amount: z.number().min(1, '金額を入力してください'),
  description: z.string().min(1, '申請内容を入力してください'),
});

type ApplicationForm = z.infer<typeof applicationSchema>;

export default function NewApplicationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingReceipts, setUploadingReceipts] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApplicationForm>({
    resolver: zodResolver(applicationSchema),
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // ファイルサイズチェック（10MB）
    const oversizedFiles = files.filter((file) => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setError('ファイルサイズは10MB以下にしてください');
      return;
    }

    // ファイル形式チェック
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    const invalidFiles = files.filter((file) => !allowedTypes.includes(file.type));
    if (invalidFiles.length > 0) {
      setError('JPEG、PNG、PDFファイルのみアップロード可能です');
      return;
    }

    setSelectedFiles((prev) => [...prev, ...files]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ApplicationForm) => {
    setIsLoading(true);
    setError(null);

    try {
      // 申請を作成
      const application = await expenseApplicationApi.create({
        expenseDate: data.expenseDate,
        amount: data.amount,
        description: data.description,
      });

      // 領収書をアップロード
      if (selectedFiles.length > 0) {
        setUploadingReceipts(true);
        try {
          for (const file of selectedFiles) {
            await receiptApi.upload(file, application.id);
          }
        } catch (err: any) {
          console.error('Receipt upload error:', err);
          // 領収書のアップロードに失敗しても申請は作成されているので、詳細ページに遷移
        } finally {
          setUploadingReceipts(false);
        }
      }

      router.push(`/applications/${application.id}`);
    } catch (err: any) {
      console.error('Application creation error:', err);
      const errorMessage = err.response?.data?.error?.message || err.message || '申請の作成に失敗しました';
      setError(errorMessage);
      setIsLoading(false);
      setUploadingReceipts(false);
    }
  };

  const onSaveDraft = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = {
        expenseDate: '',
        amount: 0,
        description: '',
      };

      // フォームの値を取得（バリデーションなし）
      const formValues = document.querySelector('form') as HTMLFormElement;
      if (formValues) {
        const expenseDateInput = formValues.querySelector('[name="expenseDate"]') as HTMLInputElement;
        const amountInput = formValues.querySelector('[name="amount"]') as HTMLInputElement;
        const descriptionInput = formValues.querySelector('[name="description"]') as HTMLTextAreaElement;

        if (expenseDateInput?.value) formData.expenseDate = expenseDateInput.value;
        if (amountInput?.value) formData.amount = Number(amountInput.value) || 0;
        if (descriptionInput?.value) formData.description = descriptionInput.value;
      }

      // 下書きとして申請を作成（必須項目が空でもOK）
      const application = await expenseApplicationApi.create({
        expenseDate: formData.expenseDate || new Date().toISOString().split('T')[0],
        amount: formData.amount || 0,
        description: formData.description || '（下書き）',
      });

      // 領収書をアップロード
      if (selectedFiles.length > 0) {
        setUploadingReceipts(true);
        try {
          for (const file of selectedFiles) {
            await receiptApi.upload(file, application.id);
          }
        } catch (err: any) {
          console.error('Receipt upload error:', err);
        } finally {
          setUploadingReceipts(false);
        }
      }

      router.push(`/applications/${application.id}`);
    } catch (err: any) {
      console.error('Draft save error:', err);
      const errorMessage = err.response?.data?.error?.message || err.message || '下書きの保存に失敗しました';
      setError(errorMessage);
      setIsLoading(false);
      setUploadingReceipts(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">新規申請</h1>
          <p className="text-gray-600">経費申請を新規作成します。領収書も一緒にアップロードできます。</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="expenseDate" className="block text-sm font-medium text-gray-700">
              経費発生日 <span className="text-red-500">*</span>
            </label>
            <input
              {...register('expenseDate')}
              type="date"
              id="expenseDate"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.expenseDate && (
              <p className="mt-1 text-sm text-red-600">{errors.expenseDate.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
              金額 <span className="text-red-500">*</span>
            </label>
            <input
              {...register('amount', { valueAsNumber: true })}
              type="number"
              id="amount"
              min="1"
              step="1"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="1000"
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              申請内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('description')}
              id="description"
              rows={5}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="申請内容を入力してください"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              領収書（任意）
            </label>
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg,application/pdf"
                onChange={handleFileSelect}
                disabled={isLoading || uploadingReceipts}
                multiple
                className="hidden"
                id="receipt-upload"
              />
              <label
                htmlFor="receipt-upload"
                className={`inline-flex items-center px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ${
                  isLoading || uploadingReceipts
                    ? 'border-gray-300 bg-gray-50 text-gray-400 cursor-not-allowed'
                    : 'border-blue-300 bg-blue-50 text-blue-700 hover:border-blue-400 hover:bg-blue-100'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>領収書を選択（複数選択可）</span>
              </label>
              <p className="text-xs text-gray-500">JPEG、PNG、PDF形式、最大10MB、複数ファイル選択可能</p>

              {selectedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">選択されたファイル ({selectedFiles.length}件)</p>
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="ml-3 p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          disabled={isLoading || uploadingReceipts}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Link
              href="/applications"
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              キャンセル
            </Link>
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={isLoading || uploadingReceipts}
              className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-700 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading || uploadingReceipts ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  保存中...
                </span>
              ) : (
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  下書きとして保存
                </span>
              )}
            </button>
            <button
              type="submit"
              disabled={isLoading || uploadingReceipts}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading || uploadingReceipts ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {uploadingReceipts ? '領収書をアップロード中...' : '作成中...'}
                </span>
              ) : (
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  作成
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
