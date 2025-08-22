'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);

  useEffect(() => {
    // 로그인 페이지는 인증 체크 제외
    if (pathname === '/admin') {
      return;
    }

    // 관리자 인증 확인
    const token = localStorage.getItem('admin_token');
    const user = localStorage.getItem('admin_user');
    
    if (!token || !user) {
      router.push('/admin');
      return;
    }
    
    setIsAuthenticated(true);
    setAdminUser(JSON.parse(user));
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    router.push('/admin');
  };

  // 로그인 페이지는 레이아웃 적용 안함
  if (pathname === '/admin') {
    return <>{children}</>;
  }

  // 인증된 경우 헤더와 네비게이션 포함
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-100"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* 헤더 */}
      <header className="bg-zinc-900/50 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/admin/dashboard" className="text-xl font-bold text-zinc-100">
                Surbate Admin
              </Link>
              <nav className="hidden md:flex gap-6">
                <Link
                  href="/admin/dashboard"
                  className={`text-sm font-medium transition-colors ${
                    pathname === '/admin/dashboard' ? 'text-surbate' : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  대시보드
                </Link>
                <Link
                  href="/admin/contents"
                  className={`text-sm font-medium transition-colors ${
                    pathname === '/admin/contents' ? 'text-surbate' : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  콘텐츠 관리
                </Link>
                <Link
                  href="/admin/users"
                  className={`text-sm font-medium transition-colors ${
                    pathname === '/admin/users' ? 'text-surbate' : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  회원 관리
                </Link>
                <Link
                  href="/admin/stats"
                  className={`text-sm font-medium transition-colors ${
                    pathname === '/admin/stats' ? 'text-surbate' : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  통계 분석
                </Link>
                <Link
                  href="/admin/errors"
                  className={`text-sm font-medium transition-colors ${
                    pathname === '/admin/errors' ? 'text-surbate' : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  에러 로그
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-400">
                {adminUser?.name || 'Admin'}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-zinc-800 text-zinc-100 rounded-lg text-sm hover:bg-zinc-700 transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      {children}
    </div>
  );
}