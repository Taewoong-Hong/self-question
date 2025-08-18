'use client';

import './globals.css';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { useState, useEffect } from 'react';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
              <div className="flex items-center gap-2">
                <img src="/images/logo_surbate.png" alt="Surbate" className="h-7 w-7" />
                <h1 className="text-xl font-bold text-surbate">Surbate</h1>
              </div>
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
                  
                  {/* 투표 섹션 */}
                  <li className="mt-6">
                    <h3 className="px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                      투표
                    </h3>
                  </li>
                  <li>
                    <Link
                      href="/debates"
                      className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800 hover:text-brand-400 transition-all duration-200"
                      onClick={closeSidebar}
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span>투표 목록</span>
                      </div>
                      <Link
                        href="/debates/create"
                        className="p-1.5 rounded-lg hover:bg-zinc-700 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </Link>
                    </Link>
                  </li>
                  
                  {/* 설문 섹션 */}
                  <li className="mt-6">
                    <h3 className="px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                      설문조사
                    </h3>
                  </li>
                  <li>
                    <Link
                      href="/surveys"
                      className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800 hover:text-brand-400 transition-all duration-200"
                      onClick={closeSidebar}
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        <span>설문 목록</span>
                      </div>
                      <Link
                        href="/surveys/create"
                        className="p-1.5 rounded-lg hover:bg-zinc-700 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </Link>
                    </Link>
                  </li>
                </ul>
              </nav>
              
              {/* 하단 정보 */}
              <div className="border-t border-zinc-800 p-4">
                <div className="text-xs text-zinc-500 text-center">
                  © 2025 Surbate
                </div>
              </div>
            </div>
          </aside>

          {/* 메인 콘텐츠 */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 lg:p-8 lg:pt-8 pt-20">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}