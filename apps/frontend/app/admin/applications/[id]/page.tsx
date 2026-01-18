'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import MainLayout from '@/components/layouts/MainLayout';
import { adminApi, internalCategoryApi } from '@/lib/api';
import { ExpenseApplication, InternalCategory } from '@/types';
import { format } from 'date-fns';

const approvalSchema = z.object({
  internalCategoryId: z.number().min(1, '社内カテゴリを選択してください'),
  finalAmount: z.number().min(0, '確定金額を入力してください'),
  comment: z.string().optional(),
});

const rejectionSchema = z.object({
  comment: z.string().min(1, '差戻し理由を入力してください'),
});

type ApprovalForm = z.infer<typeof approvalSchema>;
type RejectionForm = z.infer<typeof rejectionSchema>;

export default function AdminApplicationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = parseInt(params.id as string);
  const [application, setApplication] = useState<ExpenseApplication | null>(null);
  const [categories, setCategories] = useState<InternalCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approvalForm = useForm<ApprovalForm>({
    resolver: zodResolver(approvalSchema),
  });

  const rejectionForm = useForm<RejectionForm>({
    resolver: zodResolver(rejectionSchema),
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [appData, categoriesData] = await Promise.all([
          adminApi.getApplicationById(id),
          internalCategoryApi.getList({ isActive: true }).catch((catErr) => {
            console.warn('Failed to fetch categories, using empty array:', catErr);
            return []; // カテゴリ取得に失敗しても申請詳細は表示できるようにする
          }),
        ]);
        setApplication(appData);
        setCategories(categoriesData || []);
      } catch (err: any) {
        console.error('Failed to fetch data:', err);
        const errorMessage = err.response?.data?.error?.message || '申請の取得に失敗しました';
        setError(errorMessage);
        setApplication(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (id && !isNaN(id)) {
      fetchData();
    } else {
      setError('無効な申請IDです');
      setIsLoading(false);
    }
  }, [id]);

  const handleApprove = async (data: ApprovalForm) => {
    if (!application) return;

    setIsSubmitting(true);
    try {
      await adminApi.approve(application.id, data);
      router.push('/admin/applications');
    } catch (error) {
      console.error('Failed to approve:', error);
      alert('承認に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (data: RejectionForm) => {
    if (!application) return;

    setIsSubmitting(true);
    try {
      await adminApi.reject(application.id, data);
      router.push('/admin/applications');
    } catch (error) {
      console.error('Failed to reject:', error);
      alert('差戻しに失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout requireRole="admin">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </MainLayout>
    );
  }

  if (!application && !isLoading) {
    return (
      <MainLayout requireRole="admin">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-8 rounded-lg shadow-lg text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">申請が見つかりません</h2>
            {error && (
              <p className="text-red-600 mb-4">{error}</p>
            )}
            <p className="text-gray-600 mb-6">
              申請ID: {id}
            </p>
            <div className="flex justify-center space-x-4">
              <Link
                href="/admin/applications"
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all duration-200"
              >
                申請一覧に戻る
              </Link>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // TypeScriptの型チェック用：applicationがnullでないことを確認
  if (!application) {
    return null;
  }

  return (
    <MainLayout requireRole="admin">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">申請詳細・承認 #{application.id}</h1>
            <p className="mt-2 text-gray-600">申請内容を確認し、承認または差戻しを行います</p>
          </div>
          <Link
            href="/admin/applications"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ← 一覧に戻る
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500">申請者</label>
              <p className="mt-1 text-gray-900">{application.member?.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">経費発生日</label>
              <p className="mt-1 text-gray-900">
                {format(new Date(application.expenseDate), 'yyyy年MM月dd日')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">申請金額</label>
              <p className="mt-1 text-gray-900">¥{application.amount.toLocaleString()}</p>
            </div>
            {application.proposedAmount && (
              <div>
                <label className="block text-sm font-medium text-gray-500">システム提案額</label>
                <p className="mt-1 text-gray-900">¥{application.proposedAmount.toLocaleString()}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500">申請内容</label>
            <p className="mt-1 text-gray-900 whitespace-pre-wrap">{application.description}</p>
          </div>

          {application.status === 'submitted' && (
            <div className="border-t-4 border-blue-200 pt-6 space-y-6 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg">
              <div className="flex items-center space-x-2 mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-xl font-bold text-gray-900">承認・差戻し操作</h2>
              </div>
              {action === null && (
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => setAction('approve')}
                    className="flex-1 flex items-center justify-center px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-lg font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    承認する
                  </button>
                  <button
                    onClick={() => setAction('reject')}
                    className="flex-1 flex items-center justify-center px-6 py-4 bg-gradient-to-r from-red-600 to-rose-600 text-white text-lg font-semibold rounded-lg hover:from-red-700 hover:to-rose-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    差戻しする
                  </button>
                </div>
              )}

              {action === 'approve' && (
                <form onSubmit={approvalForm.handleSubmit(handleApprove)} className="bg-white p-6 rounded-lg border-2 border-green-200 space-y-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-lg font-bold text-gray-900">承認情報を入力</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      社内カテゴリ <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...approvalForm.register('internalCategoryId', { valueAsNumber: true })}
                      className="mt-1 block w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-colors"
                    >
                      <option value="">選択してください</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    {approvalForm.formState.errors.internalCategoryId && (
                      <p className="mt-1 text-sm text-red-600">
                        {approvalForm.formState.errors.internalCategoryId.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      確定金額 <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">¥</span>
                      <input
                        {...approvalForm.register('finalAmount', { valueAsNumber: true })}
                        type="number"
                        placeholder="0"
                        className="mt-1 block w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-colors text-lg font-semibold"
                      />
                    </div>
                    {approvalForm.formState.errors.finalAmount && (
                      <p className="mt-1 text-sm text-red-600">
                        {approvalForm.formState.errors.finalAmount.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">コメント（任意）</label>
                    <textarea
                      {...approvalForm.register('comment')}
                      rows={3}
                      placeholder="承認時のコメントを入力（任意）"
                      className="mt-1 block w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-colors"
                    />
                  </div>
                  <div className="flex space-x-4 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setAction(null)}
                      className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:transform-none"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          処理中...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          承認を確定
                        </span>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {action === 'reject' && (
                <form onSubmit={rejectionForm.handleSubmit(handleReject)} className="bg-white p-6 rounded-lg border-2 border-red-200 space-y-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-lg font-bold text-gray-900">差戻し理由を入力</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      差戻し理由 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      {...rejectionForm.register('comment')}
                      rows={5}
                      className="mt-1 block w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-colors"
                      placeholder="差戻し理由を詳しく入力してください。この内容は申請者に通知されます。"
                    />
                    {rejectionForm.formState.errors.comment && (
                      <p className="mt-1 text-sm text-red-600">
                        {rejectionForm.formState.errors.comment.message}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-4 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setAction(null)}
                      className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white font-semibold rounded-lg hover:from-red-700 hover:to-rose-700 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:transform-none"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          処理中...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          差戻しを確定
                        </span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
