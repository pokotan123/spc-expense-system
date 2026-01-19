'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MainLayout from '@/components/layouts/MainLayout';
import { adminApi } from '@/lib/api/admin';
import { ExpenseApplication } from '@/types';
import { format } from 'date-fns';
import Link from 'next/link';

const statusLabels: Record<string, string> = {
  submitted: '申請中',
  returned: '差戻し',
  approved: '承認済',
  rejected: '却下',
};

const statusColors: Record<string, string> = {
  submitted: 'bg-yellow-100 text-yellow-800',
  returned: 'bg-red-100 text-red-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-gray-100 text-gray-800',
};

function AdminApplicationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [applications, setApplications] = useState<ExpenseApplication[]>([]);
  const [allApplications, setAllApplications] = useState<ExpenseApplication[]>([]); // 会員リスト抽出用
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  
  // フィルタ・検索状態
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<number | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);
  
  const statusParam = searchParams.get('status');
  // 「すべて」を選択した場合（statusパラメータがない場合）はundefinedにしてすべてのステータスを表示
  const status = statusParam || undefined;

  // 会員リストを抽出（申請データから）
  const memberList = Array.from(
    new Map(
      allApplications
        .filter(app => app.member)
        .map(app => [app.member!.id, { id: app.member!.id, name: app.member!.name }])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    const fetchApplications = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // 会員リスト抽出用に全件取得（limitなし）
        const allData = await adminApi.getApplications({
          status: undefined,
          page: 1,
          limit: 1000,
        });
        setAllApplications(allData.items);

        // 表示用データ取得
        const params: any = {
          status,
          page,
          limit: 20,
        };

        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        if (selectedMemberId) params.memberId = selectedMemberId;

        const data = await adminApi.getApplications(params);
        let filteredItems = data.items;

        // クライアント側で検索クエリによるフィルタリング
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          filteredItems = filteredItems.filter(app => 
            app.description?.toLowerCase().includes(query) ||
            app.member?.name?.toLowerCase().includes(query) ||
            app.id.toString().includes(query)
          );
        }

        setApplications(filteredItems);
        setTotalPages(data.totalPages);
        console.log('Fetched applications:', filteredItems.map(app => ({ id: app.id, status: app.status })));
      } catch (err: any) {
        console.error('Failed to fetch applications:', err);
        const errorMessage = err.response?.data?.error?.message || '申請一覧の取得に失敗しました';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplications();
  }, [status, page, startDate, endDate, selectedMemberId]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setSelectedMemberId(undefined);
    setPage(1);
  };

  return (
    <MainLayout requireRole="admin">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">申請一覧（事務局）</h1>
          <Link
            href="/admin/payments"
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            振込データ出力
          </Link>
        </div>

        {/* ステータスフィルタ */}
        <div className="flex space-x-2">
          <Link
            href="/admin/applications"
            className={`px-4 py-2 rounded-md ${
              !statusParam ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            すべて
          </Link>
          {Object.entries(statusLabels).map(([key, label]) => (
            <Link
              key={key}
              href={`/admin/applications?status=${key}`}
              className={`px-4 py-2 rounded-md ${
                status === key ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* 検索・フィルタセクション */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">検索・フィルタ</h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showFilters ? '閉じる' : '開く'}
            </button>
          </div>

          {showFilters && (
            <div className="space-y-4">
              {/* 検索 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  検索（申請内容・申請者名・ID）
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="検索キーワードを入力..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 期間フィルタ */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    開始日
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    終了日
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 会員フィルタ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  申請者
                </label>
                <select
                  value={selectedMemberId || ''}
                  onChange={(e) => {
                    setSelectedMemberId(e.target.value ? Number(e.target.value) : undefined);
                    setPage(1);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">すべて</option>
                  {memberList.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* リセットボタン */}
              {(searchQuery || startDate || endDate || selectedMemberId) && (
                <div className="flex justify-end">
                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    フィルタをリセット
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg shadow-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-700 font-semibold mb-2">申請がありません</p>
            <p className="text-gray-500 text-sm">
              {status === 'submitted' 
                ? '現在、申請中の申請はありません。会員が申請を送信すると、ここに表示されます。'
                : '該当する申請がありません。'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    申請者
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    経費発生日
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    金額
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      #{app.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {app.member?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(app.expenseDate), 'yyyy年MM月dd日')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ¥{app.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[app.status]}`}
                      >
                        {statusLabels[app.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/admin/applications/${app.id}`}
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all duration-200"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        詳細を確認・承認
                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border rounded-md disabled:opacity-50"
            >
              前へ
            </button>
            <span className="px-4 py-2">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border rounded-md disabled:opacity-50"
            >
              次へ
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default function AdminApplicationsPage() {
  return (
    <Suspense fallback={
      <MainLayout requireRole="admin">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </MainLayout>
    }>
      <AdminApplicationsContent />
    </Suspense>
  );
}
