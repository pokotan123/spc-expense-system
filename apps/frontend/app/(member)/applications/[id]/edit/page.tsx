'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import MainLayout from '@/components/layouts/MainLayout';
import { expenseApplicationApi } from '@/lib/api/expenseApplications';
import { ExpenseApplication } from '@/types';
import Link from 'next/link';

const applicationSchema = z.object({
  expenseDate: z.string().min(1, '経費発生日を入力してください'),
  amount: z.number().min(1, '金額を入力してください'),
  description: z.string().min(1, '申請内容を入力してください'),
});

type ApplicationForm = z.infer<typeof applicationSchema>;

export default function EditApplicationPage() {
  const router = useRouter();
  const params = useParams();
  const id = parseInt(params.id as string);
  const [application, setApplication] = useState<ExpenseApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ApplicationForm>({
    resolver: zodResolver(applicationSchema),
  });

  useEffect(() => {
    const fetchApplication = async () => {
      try {
        const data = await expenseApplicationApi.getById(id);
        setApplication(data);
        reset({
          expenseDate: data.expenseDate,
          amount: data.amount,
          description: data.description,
        });
      } catch (error) {
        console.error('Failed to fetch application:', error);
        setError('申請の取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplication();
  }, [id, reset]);

  const onSubmit = async (data: ApplicationForm) => {
    if (!application || (application.status !== 'draft' && application.status !== 'returned')) {
      alert('編集可能な状態ではありません');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await expenseApplicationApi.update(id, {
        expenseDate: data.expenseDate,
        amount: data.amount,
        description: data.description,
      });
      router.push(`/applications/${id}`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '申請の更新に失敗しました');
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

  if (application.status !== 'draft' && application.status !== 'returned') {
    return (
      <MainLayout>
        <div className="text-center">
          <p className="text-gray-500">編集可能な状態ではありません</p>
          <Link href={`/applications/${id}`} className="text-blue-600 hover:underline">
            申請詳細に戻る
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">申請編集 #{application.id}</h1>
          <p className="mt-2 text-gray-600">申請内容を編集します</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-lg shadow space-y-6">
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

          <div className="flex justify-end space-x-4">
            <Link
              href={`/applications/${id}`}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? '更新中...' : '更新'}
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
