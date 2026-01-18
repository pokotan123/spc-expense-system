'use client';

import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

interface MainLayoutProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireRole?: 'member' | 'admin' | 'manager';
}

export default function MainLayout({ children, requireAuth = true, requireRole }: MainLayoutProps) {
  const { member, isAuthenticated, clearAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (requireAuth && !isAuthenticated()) {
      router.push('/login');
      return;
    }

    if (requireRole && member) {
      const hasRole = member.role === requireRole || member.role === 'manager';
      if (!hasRole) {
        router.push('/dashboard');
        return;
      }
    }
  }, [requireAuth, requireRole, member, isAuthenticated, router]);

  const handleLogout = async () => {
    try {
      // API呼び出しは後で実装
      clearAuth();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      clearAuth();
      router.push('/login');
    }
  };

  if (requireAuth && !isAuthenticated()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <nav className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <Link href={member?.role === 'admin' || member?.role === 'manager' ? '/admin/applications' : '/dashboard'} className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    SPC経費精算システム
                  </h1>
                </Link>
              </div>
              {member && (member.role === 'admin' || member.role === 'manager') && (
                <div className="flex items-center space-x-2">
                  <Link
                    href="/admin/applications"
                    className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    申請一覧
                  </Link>
                  <Link
                    href="/admin/categories"
                    className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  >
                    仕分け管理
                  </Link>
                  <Link
                    href="/admin/payments"
                    className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    振込データ
                  </Link>
                </div>
              )}
            </div>
            {member && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3 px-4 py-2 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                    {member.name.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{member.name}さん</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 rounded-lg hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  ログアウト
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
