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

  // 로그인 페이지거나 인증되지 않은 경우 헤더 없이 렌더링
  if (pathname === '/admin' || !isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <>
      {/* 관리자 헤더 */}
      <header className="bg-zinc-900 border-b border-zinc-800 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/admin/dashboard" className="text-xl font-bold text-surbate">
                Surbate Admin
              </Link>
              <nav className="ml-10 flex items-center space-x-6">
                <Link 
                  href="/admin/dashboard" 
                  className={`transition-colors ${
                    pathname === '/admin/dashboard' 
                      ? 'text-surbate' 
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  대시보드
                </Link>
                <Link 
                  href="/admin/users" 
                  className={`transition-colors ${
                    pathname === '/admin/users' 
                      ? 'text-surbate' 
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  회원관리
                </Link>
                <Link 
                  href="/admin/contents" 
                  className={`transition-colors ${
                    pathname === '/admin/contents' 
                      ? 'text-surbate' 
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  콘텐츠관리
                </Link>
                <Link 
                  href="/admin/stats" 
                  className={`transition-colors ${
                    pathname === '/admin/stats' 
                      ? 'text-surbate' 
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  통계
                </Link>
                <Link 
                  href="/admin/errors" 
                  className={`transition-colors ${
                    pathname === '/admin/errors' 
                      ? 'text-surbate' 
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  에러로그
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-zinc-400 text-sm">
                {adminUser?.username}님
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors text-sm"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* 헤더 공간 확보 */}
      <div className="pt-16">
        {children}
      </div>
    </>
  );
}