'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

export default function AdminErrorsPage() {
  const router = useRouter();
  const { isAdminLoggedIn, isLoading: authLoading } = useAdminAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 인증 로딩이 완료되고 로그인되지 않은 경우 리다이렉트
    if (!authLoading && !isAdminLoggedIn) {
      router.push('/admin');
      return;
    }
    
    if (isAdminLoggedIn) {
      setLoading(false);
    }
  }, [router, isAdminLoggedIn, authLoading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-100"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-zinc-100">에러 로그</h2>
          <p className="text-zinc-400 mt-1">시스템 에러 로그 기능은 준비 중입니다</p>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-12 text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-medium text-zinc-300 mb-2">준비 중입니다</h3>
          <p className="text-zinc-500">에러 로그 분석 기능은 현재 개발 중입니다.</p>
        </div>
      </main>
    </div>
  );
}