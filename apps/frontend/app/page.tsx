'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [router, isAuthenticated]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-500">読み込み中...</div>
    </div>
  );
}
