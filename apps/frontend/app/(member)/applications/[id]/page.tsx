'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MainLayout from '@/components/layouts/MainLayout';
import { expenseApplicationApi, receiptApi } from '@/lib/api';
import { ExpenseApplication, Receipt, OCRResult } from '@/types';
import { format } from 'date-fns';
import Link from 'next/link';
import ReceiptUpload from '@/components/forms/ReceiptUpload';
import ReceiptList from '@/components/forms/ReceiptList';

const statusLabels: Record<string, string> = {
  draft: '下書き',
  submitted: '申請中',
  returned: '差戻し',
  approved: '承認済',
  rejected: '却下',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-yellow-100 text-yellow-800',
  returned: 'bg-red-100 text-red-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-gray-100 text-gray-800',
};

export default function ApplicationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = parseInt(params.id as string);
  const [application, setApplication] = useState<ExpenseApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>([]);

  useEffect(() => {
    const fetchApplication = async () => {
      try {
        const data = await expenseApplicationApi.getById(id);
        setApplication(data);
        setReceipts(data.receipts || []);
      } catch (error) {
        console.error('Failed to fetch application:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplication();
  }, [id]);

  const handleReceiptUpload = async (receipt: Receipt) => {
    setReceipts((prev) => [...prev, receipt]);
    // 申請データを再取得して最新の状態を反映
    try {
      const data = await expenseApplicationApi.getById(id);
      setApplication(data);
      setReceipts(data.receipts || []);
    } catch (error) {
      console.error('Failed to refresh application:', error);
    }
  };

  const handleReceiptDelete = (receiptId: number) => {
    setReceipts((prev) => prev.filter((r) => r.id !== receiptId));
    // 申請データを再取得
    expenseApplicationApi.getById(id).then((data) => {
      setApplication(data);
      setReceipts(data.receipts || []);
    });
  };

  const handleOCRComplete = (receiptId: number, ocrResult: OCRResult) => {
    // OCR結果を反映
    setReceipts((prev) =>
      prev.map((r) => (r.id === receiptId ? { ...r, ocrResult } : r))
    );
  };

  const handleSubmit = async () => {
    if (!application || (application.status !== 'draft' && application.status !== 'returned')) return;

    setIsSubmitting(true);
    try {
      await expenseApplicationApi.submit(application.id);
      router.push('/applications');
    } catch (error) {
      console.error('Failed to submit application:', error);
      alert('申請の送信に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!application || application.status !== 'draft') return;

    setIsSubmitting(true);
    try {
      // 下書きとして保存（現在の状態を維持）
      await expenseApplicationApi.update(application.id, {
        expenseDate: application.expenseDate,
        amount: application.amount,
        description: application.description,
      });
      // 申請データを再取得して最新の状態を反映
      const data = await expenseApplicationApi.getById(id);
      setApplication(data);
      alert('下書きとして保存しました');
    } catch (error) {
      console.error('Failed to save draft:', error);
      alert('下書きの保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </MainLayout>
    );
  }

  if (!application) {
    return (
      <MainLayout>
        <div className="text-center">
          <p className="text-gray-500">申請が見つかりません</p>
          <Link href="/applications" className="text-blue-600 hover:underline">
            申請一覧に戻る
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">申請詳細 #{application.id}</h1>
            <p className="text-gray-600">申請内容と領収書を確認・管理できます</p>
          </div>
          <Link
            href="/applications"
            className="btn-secondary"
          >
            一覧に戻る
          </Link>
        </div>

        {/* 差し戻し・却下の場合のアラート表示 */}
        {application.status === 'returned' && (
          <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-6 shadow-lg">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-orange-900 mb-2">この申請は差し戻されました</h3>
                <p className="text-orange-800 mb-4">
                  事務局から修正の依頼があります。下記の差し戻し理由を確認し、内容を修正して再度申請してください。
                </p>
                {application.comments && application.comments.filter((c) => c.commentType === 'return').length > 0 && (
                  <div className="bg-white border border-orange-200 rounded-lg p-4 mt-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      <span className="font-semibold text-orange-900">差し戻し理由</span>
                    </div>
                    {application.comments
                      .filter((c) => c.commentType === 'return')
                      .map((comment) => (
                        <div key={comment.id} className="mt-2">
                          <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
                            <span>{comment.member?.name || '事務局'}</span>
                            <span>{format(new Date(comment.createdAt), 'yyyy年MM月dd日 HH:mm')}</span>
                          </div>
                          <p className="text-gray-900 whitespace-pre-wrap leading-relaxed text-base bg-orange-50 p-3 rounded border-l-4 border-orange-400">
                            {comment.comment}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {application.status === 'rejected' && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 shadow-lg">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-red-900 mb-2">この申請は却下されました</h3>
                <p className="text-red-800 mb-4">
                  事務局により、この申請は却下されました。新たに申請を行う場合は、新規申請から作成してください。
                </p>
                {application.comments && application.comments.filter((c) => c.commentType === 'rejection').length > 0 && (
                  <div className="bg-white border border-red-200 rounded-lg p-4 mt-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      <span className="font-semibold text-red-900">却下理由</span>
                    </div>
                    {application.comments
                      .filter((c) => c.commentType === 'rejection')
                      .map((comment) => (
                        <div key={comment.id} className="mt-2">
                          <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
                            <span>{comment.member?.name || '事務局'}</span>
                            <span>{format(new Date(comment.createdAt), 'yyyy年MM月dd日 HH:mm')}</span>
                          </div>
                          <p className="text-gray-900 whitespace-pre-wrap leading-relaxed text-base bg-red-50 p-3 rounded border-l-4 border-red-400">
                            {comment.comment}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="card space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`p-4 rounded-lg border ${
              application.status === 'returned' 
                ? 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300' 
                : application.status === 'rejected'
                ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-300'
                : application.status === 'approved'
                ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-300'
                : 'bg-gradient-to-br from-gray-50 to-blue-50 border-gray-200'
            }`}>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">ステータス</label>
              <span className={`inline-block px-4 py-2 text-sm font-semibold rounded-full ${statusColors[application.status]} shadow-sm`}>
                {statusLabels[application.status]}
              </span>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-lg border border-gray-200">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">経費発生日</label>
              <p className="text-lg font-bold text-gray-900">
                {format(new Date(application.expenseDate), 'yyyy年MM月dd日')}
              </p>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-lg border border-gray-200">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">申請金額</label>
              <p className="text-2xl font-bold text-blue-600">¥{application.amount.toLocaleString()}</p>
            </div>
            {application.finalAmount && (
              <div className="bg-gradient-to-br from-gray-50 to-green-50 p-4 rounded-lg border border-green-200">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">確定金額</label>
                <p className="text-2xl font-bold text-green-600">¥{application.finalAmount.toLocaleString()}</p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
            <label className="block text-sm font-semibold text-gray-700 mb-3">申請内容</label>
            <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">{application.description}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-semibold text-gray-700">領収書</label>
              {(application.status === 'draft' || application.status === 'returned') && (
                <ReceiptUpload
                  expenseApplicationId={application.id}
                  onUploadSuccess={handleReceiptUpload}
                  disabled={isSubmitting}
                />
              )}
            </div>
            <ReceiptList
              receipts={receipts}
              expenseApplicationId={application.id}
              onDelete={handleReceiptDelete}
              onOCRComplete={handleOCRComplete}
              canEdit={application.status === 'draft' || application.status === 'returned'}
            />
          </div>

          {/* 承認コメントの表示 */}
          {application.status === 'approved' && application.comments && application.comments.filter((c) => c.commentType === 'approval').length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="font-semibold text-green-900">承認コメント</h3>
              </div>
              <div className="space-y-2">
                {application.comments
                  .filter((c) => c.commentType === 'approval')
                  .map((comment) => (
                    <div key={comment.id} className="bg-white border border-green-100 rounded p-3">
                      <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
                        <span>{comment.member?.name || '事務局'}</span>
                        <span>{format(new Date(comment.createdAt), 'yyyy/MM/dd HH:mm')}</span>
                      </div>
                      <p className="text-gray-900 whitespace-pre-wrap">{comment.comment}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {(application.status === 'draft' || application.status === 'returned') && (
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <Link
                href={`/applications/${application.id}/edit`}
                className="btn-secondary"
              >
                編集
              </Link>
              {application.status === 'draft' && (
                <button
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isSubmitting ? (
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
              )}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    送信中...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    申請を送信
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
