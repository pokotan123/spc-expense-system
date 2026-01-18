'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import MainLayout from '@/components/layouts/MainLayout';
import { internalCategoryApi } from '@/lib/api/internalCategories';
import { InternalCategory } from '@/types';
import { format } from 'date-fns';

const categorySchema = z.object({
  name: z.string().min(1, 'カテゴリ名を入力してください'),
  code: z.string().min(1, 'コードを入力してください').regex(/^[A-Z0-9]+$/, 'コードは英数字（大文字）のみ使用できます'),
  description: z.string().optional(),
});

type CategoryForm = z.infer<typeof categorySchema>;

export default function CategoriesPage() {
  const [categories, setCategories] = useState<InternalCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const form = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
    },
  });

  const fetchCategories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await internalCategoryApi.getList();
      setCategories(data);
    } catch (err: any) {
      console.error('Failed to fetch categories:', err);
      setError(err.response?.data?.error?.message || 'カテゴリ一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = async (data: CategoryForm) => {
    setIsCreating(true);
    setError(null);
    try {
      await internalCategoryApi.create(data);
      form.reset();
      setShowForm(false);
      await fetchCategories();
    } catch (err: any) {
      console.error('Failed to create category:', err);
      setError(err.response?.data?.error?.message || 'カテゴリの作成に失敗しました');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEdit = (category: InternalCategory) => {
    setEditingId(category.id);
    form.reset({
      name: category.name,
      code: category.code,
      description: category.description || '',
    });
    setShowForm(true);
  };

  const handleUpdate = async (data: CategoryForm) => {
    if (!editingId) return;

    setIsCreating(true);
    setError(null);
    try {
      await internalCategoryApi.update(editingId, data);
      form.reset();
      setShowForm(false);
      setEditingId(null);
      await fetchCategories();
    } catch (err: any) {
      console.error('Failed to update category:', err);
      setError(err.response?.data?.error?.message || 'カテゴリの更新に失敗しました');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('このカテゴリを削除しますか？使用中のカテゴリは削除できません。')) {
      return;
    }

    try {
      await internalCategoryApi.delete(id);
      await fetchCategories();
    } catch (err: any) {
      console.error('Failed to delete category:', err);
      alert(err.response?.data?.error?.message || 'カテゴリの削除に失敗しました');
    }
  };

  const handleToggleActive = async (category: InternalCategory) => {
    try {
      await internalCategoryApi.update(category.id, {
        isActive: !category.isActive,
      });
      await fetchCategories();
    } catch (err: any) {
      console.error('Failed to toggle category:', err);
      alert(err.response?.data?.error?.message || 'カテゴリの更新に失敗しました');
    }
  };

  const cancelForm = () => {
    form.reset();
    setShowForm(false);
    setEditingId(null);
    setError(null);
  };

  return (
    <MainLayout requireRole="admin">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">社内カテゴリ（仕分け）管理</h1>
            <p className="text-gray-600">経費申請の仕分けに使用する社内カテゴリを管理します</p>
          </div>
          {!showForm && (
            <button
              onClick={() => {
                setShowForm(true);
                setEditingId(null);
                form.reset();
              }}
              className="btn-primary flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>新規登録</span>
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg shadow-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {showForm && (
          <div className="card border-2 border-blue-200">
            <div className="flex items-center space-x-2 mb-6">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h2 className="text-2xl font-bold text-gray-900">
                {editingId ? 'カテゴリ編集' : '新規カテゴリ登録'}
              </h2>
            </div>

            <form
              onSubmit={form.handleSubmit(editingId ? handleUpdate : handleCreate)}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  カテゴリ名 <span className="text-red-500">*</span>
                </label>
                <input
                  {...form.register('name')}
                  type="text"
                  className="input-field"
                  placeholder="例: 交通費"
                />
                {form.formState.errors.name && (
                  <p className="mt-1 text-sm text-red-600">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  コード <span className="text-red-500">*</span>
                </label>
                <input
                  {...form.register('code')}
                  type="text"
                  className="input-field"
                  placeholder="例: CAT001（英数字大文字のみ）"
                  style={{ textTransform: 'uppercase' }}
                  onChange={(e) => {
                    e.target.value = e.target.value.toUpperCase();
                    form.setValue('code', e.target.value);
                  }}
                />
                {form.formState.errors.code && (
                  <p className="mt-1 text-sm text-red-600">{form.formState.errors.code.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">英数字（大文字）のみ使用可能です</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  説明（任意）
                </label>
                <textarea
                  {...form.register('description')}
                  rows={3}
                  className="input-field"
                  placeholder="カテゴリの説明を入力（任意）"
                />
              </div>

              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={cancelForm}
                  className="btn-secondary"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      処理中...
                    </span>
                  ) : (
                    editingId ? '更新' : '登録'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : categories.length === 0 ? (
          <div className="card text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <p className="text-gray-700 font-semibold mb-2">カテゴリがありません</p>
            <p className="text-gray-500 text-sm">新規登録ボタンからカテゴリを追加してください</p>
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      コード
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      カテゴリ名
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      説明
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      作成日
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categories.map((category) => (
                    <tr key={category.id} className="hover:bg-blue-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">{category.code}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{category.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{category.description || '-'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            category.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          } shadow-sm`}
                        >
                          {category.isActive ? '有効' : '無効'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {format(new Date(category.createdAt), 'yyyy年MM月dd日')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(category)}
                            className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors duration-200 font-medium"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            編集
                          </button>
                          <button
                            onClick={() => handleToggleActive(category)}
                            className={`inline-flex items-center px-3 py-1.5 rounded-lg transition-colors duration-200 font-medium ${
                              category.isActive
                                ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                                : 'bg-green-50 text-green-700 hover:bg-green-100'
                            }`}
                          >
                            {category.isActive ? (
                              <>
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                                無効化
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                有効化
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(category.id)}
                            className="inline-flex items-center px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors duration-200 font-medium"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
