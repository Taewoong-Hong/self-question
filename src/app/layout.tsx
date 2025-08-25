'use client';

import './globals.css';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { usePathname } from 'next/navigation';
import { AdminAuthProvider, useAdminAuth } from '@/contexts/AdminAuthContext';

const inter = Inter({ subsets: ['latin'] });

function LayoutContent({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/admin');
  const { isAdminLoggedIn, adminUsername, logout } = useAdminAuth();
  
  console.log('Layout State:', { isAdminLoggedIn, adminUsername, isAdminPage });

  // 화면 크기 변경 시 사이드바 상태 업데이트
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <html lang="ko">
      <body className={`${inter.className} bg-zinc-950 text-zinc-100 min-h-screen`}>
        <div className="flex h-screen">
          {/* 모바일 헤더 */}
          <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-zinc-950 border-b border-zinc-800">
            <div className="flex items-center justify-between px-4 h-16">
              <button
                className="p-2 rounded-lg hover:bg-zinc-900 transition-colors"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <img src="/images/logo_surbate.png" alt="Surbate" className="h-7 w-7" />
                <h1 className="text-xl font-bold text-surbate">Surbate</h1>
              </Link>
              <div className="w-10" /> {/* 균형을 위한 빈 공간 */}
            </div>
          </header>

          {/* 모바일 오버레이 */}
          {isSidebarOpen && (
            <div
              className="lg:hidden fixed inset-0 bg-zinc-950/80 z-40"
              onClick={closeSidebar}
            />
          )}

          {/* 좌측 네비게이터 */}
          <aside className={`
            fixed lg:static inset-y-0 left-0 z-50 
            w-64 bg-zinc-900 border-r border-zinc-800 flex-shrink-0 
            transition-transform duration-300 transform
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}>
            <div className="flex flex-col h-full">
              <div className="p-6 flex items-center justify-between">
                <Link href="/" className="block hover:opacity-80 transition-opacity" onClick={closeSidebar}>
                  <div className="flex items-center gap-2">
                    <img src="/images/logo_surbate.png" alt="Surbate" className="h-7 w-7" />
                    <h1 className="text-xl font-bold text-surbate">Surbate</h1>
                  </div>
                </Link>
                {/* 모바일 닫기 버튼 */}
                <button
                  className="lg:hidden p-1 rounded hover:bg-zinc-800 transition-colors"
                  onClick={closeSidebar}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <nav className="flex-1 px-4 pb-6 overflow-y-auto">
                <ul className="space-y-2">
                  <li>
                    <Link
                      href="/"
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800 hover:text-brand-400 transition-all duration-200"
                      onClick={closeSidebar}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      <span>홈</span>
                    </Link>
                  </li>
                  
                  {/* 방명록 */}
                  <li>
                    <Link
                      href="/guestbook"
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800 hover:text-brand-400 transition-all duration-200"
                      onClick={closeSidebar}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <span>방명록</span>
                    </Link>
                  </li>
                  
                  {/* 게시판 섹션 */}
                  <li className="mt-6">
                    <h3 className="px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                      게시판
                    </h3>
                  </li>
                  <li>
                    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800 hover:text-brand-400 transition-all duration-200">
                      <Link
                        href="/debates"
                        className="flex items-center gap-3 flex-1"
                        onClick={closeSidebar}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span>투표 게시판</span>
                      </Link>
                      <Link
                        href="/debates/create"
                        className="p-1.5 rounded-lg hover:bg-zinc-700 transition-colors"
                        onClick={closeSidebar}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </Link>
                    </div>
                  </li>
                  <li>
                    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800 hover:text-brand-400 transition-all duration-200">
                      <Link
                        href="/surveys"
                        className="flex items-center gap-3 flex-1"
                        onClick={closeSidebar}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        <span>설문 게시판</span>
                      </Link>
                      <Link
                        href="/surveys/create"
                        className="p-1.5 rounded-lg hover:bg-zinc-700 transition-colors"
                        onClick={closeSidebar}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </Link>
                    </div>
                  </li>
                  
                  {/* 요청 게시판 */}
                  <li>
                    <Link
                      href="/requests"
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800 hover:text-brand-400 transition-all duration-200"
                      onClick={closeSidebar}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                      <span>요청 게시판</span>
                    </Link>
                  </li>
                  
                  {/* Admin 메뉴 - 관리자 로그인 시 항상 표시 */}
                  {isAdminLoggedIn && (
                    <>
                      <li className="mt-6">
                        <h3 className="px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                          관리자
                        </h3>
                      </li>
                      <li>
                        <Link
                          href="/admin/dashboard"
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800 hover:text-brand-400 transition-all duration-200"
                          onClick={closeSidebar}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                          </svg>
                          <span>대시보드</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/admin/users"
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800 hover:text-brand-400 transition-all duration-200"
                          onClick={closeSidebar}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          <span>회원관리</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/admin/contents"
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800 hover:text-brand-400 transition-all duration-200"
                          onClick={closeSidebar}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <span>콘텐츠관리</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/admin/stats"
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800 hover:text-brand-400 transition-all duration-200"
                          onClick={closeSidebar}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <span>통계</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/admin/errors"
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800 hover:text-brand-400 transition-all duration-200"
                          onClick={closeSidebar}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span>에러로그</span>
                        </Link>
                      </li>
                    </>
                  )}
                </ul>
              </nav>
              
              {/* 하단 정보 */}
              <div className="border-t border-zinc-800 p-4">
                {/* Admin 로그인 상태 표시 및 로그아웃 버튼 */}
                {isAdminLoggedIn && (
                  <>
                    <div className="mb-3 px-3 py-2 bg-zinc-800/50 rounded-lg">
                      <p className="text-xs text-zinc-400">관리자로 로그인됨</p>
                      <p className="text-sm font-medium text-zinc-200">{adminUsername}</p>
                    </div>
                    <button
                      onClick={logout}
                      className="w-full px-4 py-2 mb-3 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      로그아웃
                    </button>
                  </>
                )}
                <div className="text-xs text-zinc-500 text-center">
                  © 2025 Surbate
                </div>
              </div>
            </div>
          </aside>

          {/* 메인 콘텐츠 */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 lg:p-8 pt-20 lg:pt-8">
              {children}
            </div>
          </main>
        </div>
        <Toaster 
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#18181b',
              color: '#fafafa',
              border: '1px solid #27272a',
              borderRadius: '0.5rem',
              fontSize: '14px',
              padding: '12px 16px',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fafafa',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fafafa',
              },
            },
          }}
        />
      </body>
    </html>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthProvider>
      <LayoutContent>{children}</LayoutContent>
    </AdminAuthProvider>
  );
}