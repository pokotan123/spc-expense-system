'use client';

import { useEffect, useState } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { adminApi } from '@/lib/api/admin';

export default function PaymentsPage() {
  const [targets, setTargets] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchTargets = async () => {
      try {
        const data = await adminApi.getPaymentTargets();
        setTargets(data.items || []);
      } catch (error) {
        console.error('Failed to fetch payment targets:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTargets();
  }, []);

  const handleGenerate = async () => {
    if (selectedIds.length === 0) {
      alert('振込対象を選択してください');
      return;
    }

    setIsGenerating(true);
    try {
      const data = await adminApi.generatePaymentData({
        expenseApplicationIds: selectedIds,
      });

      // CSVデータをダウンロード
      const blob = new Blob([data.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.fileName || 'payment-data.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate payment data:', error);
      alert('振込データの生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <MainLayout requireRole="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">振込データ出力</h1>
          <p className="mt-2 text-gray-600">承認済み申請から振込データを生成します</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : targets.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <p className="text-gray-500">振込対象がありません</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === targets.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(targets.map((t) => t.expenseApplicationId));
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      申請ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      申請者
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      金額
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {targets.map((target) => (
                    <tr key={target.expenseApplicationId}>
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(target.expenseApplicationId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds([...selectedIds, target.expenseApplicationId]);
                            } else {
                              setSelectedIds(selectedIds.filter((id) => id !== target.expenseApplicationId));
                            }
                          }}
                        />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        #{target.expenseApplicationId}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {target.member?.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        ¥{target.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || selectedIds.length === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isGenerating ? '生成中...' : '振込データを生成'}
              </button>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
