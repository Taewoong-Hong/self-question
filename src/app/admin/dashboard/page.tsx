'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

interface DashboardStats {
  totalDebates: number;
  totalSurveys: number;
  totalUsers: number;
  todayUsers: number;
  monthlyActiveUsers: number;
  recentErrors: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { isAdminLoggedIn, isLoading: authLoading } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalDebates: 0,
    totalSurveys: 0,
    totalUsers: 0,
    todayUsers: 0,
    monthlyActiveUsers: 0,
    recentErrors: 0
  });

  useEffect(() => {
    // 인증 로딩이 완료되고 로그인되지 않은 경우 리다이렉트
    if (!authLoading && !isAdminLoggedIn) {
      router.push('/admin');
      return;
    }
    
    // 관리자 인증 확인
    const token = localStorage.getItem('admin_token');
    const user = localStorage.getItem('admin_user');
    
    if (!token || !user) {
      router.push('/admin');
      return;
    }
    
    setAdminUser(JSON.parse(user));
    fetchDashboardStats();
  }, [router]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      
      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      
      const data = await response.json();
      setStats({
        totalDebates: data.totalDebates || 0,
        totalSurveys: data.totalSurveys || 0,
        totalUsers: data.totalUsers || 0,
        todayUsers: data.todayUsers || 0,
        monthlyActiveUsers: data.monthlyActiveUsers || 0,
        recentErrors: data.recentErrors || 0
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      // 에러 시 기본값 사용
      setStats({
        totalDebates: 0,
        totalSurveys: 0,
        totalUsers: 0,
        todayUsers: 0,
        monthlyActiveUsers: 0,
        recentErrors: 0
      });
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-700 dark:border-zinc-100"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">대시보드</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">서비스 현황을 한눈에 확인하세요</p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-zinc-600 dark:text-zinc-400 text-sm font-medium">총 투표수</h3>
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{stats.totalDebates}</div>
            <p className="text-zinc-600 dark:text-zinc-500 text-sm mt-1">진행중 82개</p>
          </div>

          <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-zinc-600 dark:text-zinc-400 text-sm font-medium">총 설문수</h3>
              <svg className="w-5 h-5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{stats.totalSurveys}</div>
            <p className="text-zinc-600 dark:text-zinc-500 text-sm mt-1">진행중 45개</p>
          </div>

          <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-zinc-600 dark:text-zinc-400 text-sm font-medium">총 사용자</h3>
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-zinc-600 dark:text-zinc-500 text-sm mt-1">오늘 +{stats.todayUsers}명</p>
          </div>

          <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-zinc-600 dark:text-zinc-400 text-sm font-medium">MAU</h3>
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{stats.monthlyActiveUsers.toLocaleString()}</div>
            <p className="text-zinc-600 dark:text-zinc-500 text-sm mt-1">전월 대비 +12%</p>
          </div>

          <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-zinc-600 dark:text-zinc-400 text-sm font-medium">오늘 방문자</h3>
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{stats.todayUsers}</div>
            <p className="text-zinc-600 dark:text-zinc-500 text-sm mt-1">실시간 접속 42명</p>
          </div>

          <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-zinc-600 dark:text-zinc-400 text-sm font-medium">시스템 에러</h3>
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{stats.recentErrors}</div>
            <p className="text-zinc-600 dark:text-zinc-500 text-sm mt-1">지난 24시간</p>
          </div>
        </div>

        {/* 빠른 작업 */}
        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm dark:shadow-none">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">빠른 작업</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/admin/users"
              className="flex items-center gap-3 p-4 bg-gray-100 dark:bg-zinc-800/50 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <div>
                <h4 className="font-medium text-zinc-900 dark:text-zinc-100">회원 관리</h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-500">IP 차단 및 관리</p>
              </div>
            </Link>

            <Link
              href="/admin/contents"
              className="flex items-center gap-3 p-4 bg-gray-100 dark:bg-zinc-800/50 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <div>
                <h4 className="font-medium text-zinc-900 dark:text-zinc-100">콘텐츠 관리</h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-500">투표/설문 관리</p>
              </div>
            </Link>

            <Link
              href="/admin/stats"
              className="flex items-center gap-3 p-4 bg-gray-100 dark:bg-zinc-800/50 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <div>
                <h4 className="font-medium text-zinc-900 dark:text-zinc-100">통계 분석</h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-500">MAU 및 지표</p>
              </div>
            </Link>

            <Link
              href="/admin/errors"
              className="flex items-center gap-3 p-4 bg-gray-100 dark:bg-zinc-800/50 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 className="font-medium text-zinc-900 dark:text-zinc-100">에러 로그</h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-500">시스템 에러 확인</p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}