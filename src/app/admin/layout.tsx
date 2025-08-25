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
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-700 dark:border-zinc-100"></div>
      </div>
    );
  }

  return (
    <>
      {/* 메인 컨텐츠만 렌더링 - 네비게이션은 root layout의 사이드바 사용 */}
      {children}
    </>
  );
}