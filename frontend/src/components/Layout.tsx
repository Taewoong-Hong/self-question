import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-primary">
                Self Question
              </Link>
              <nav className="ml-10 flex items-baseline space-x-6">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500 text-sm">투표</span>
                  <Link
                    href="/"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      router.pathname === '/'
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    목록
                  </Link>
                  <Link
                    href="/create"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      router.pathname === '/create'
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    만들기
                  </Link>
                </div>
                <div className="h-6 w-px bg-gray-300"></div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500 text-sm">설문</span>
                  <Link
                    href="/surveys"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      router.pathname === '/surveys'
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    목록
                  </Link>
                  <Link
                    href="/surveys/create"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      router.pathname === '/surveys/create'
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    만들기
                  </Link>
                </div>
              </nav>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-500 text-sm">
            © 2024 Self Question. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}