'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { requestApi } from '@/lib/api';
import { RequestPost } from '@/types/request';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function RequestsPage() {
  const [requests, setRequests] = useState<RequestPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const limit = 20;

  useEffect(() => {
    fetchRequests();
  }, [page, searchQuery]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await requestApi.list({ 
        page, 
        limit, 
        search: searchQuery 
      });
      setRequests(response.requests);
      setTotal(response.pagination?.total || 0);
    } catch (error) {
      console.error('요청 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="pl-[3px]">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">요청 게시판</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">자유롭게 요청사항을 남겨주세요</p>
          </div>
          <Link
            href="/requests/create"
            className="relative p-3 border border-gray-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-100 rounded-lg hover:border-gray-400 dark:hover:border-zinc-500 hover:bg-gray-100 dark:hover:bg-zinc-800/50 transform hover:-translate-y-0.5 transition-all duration-200"
            title="새 요청 작성"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <div className="absolute -top-1 -left-1 w-4 h-4 bg-white dark:bg-zinc-950 border border-zinc-700 dark:border-zinc-100 rounded-full flex items-center justify-center">
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </Link>
        </div>
      </div>
      
      {/* 검색 */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-zinc-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="검색..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 요청 목록 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-700 dark:border-zinc-100"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-zinc-800">
            {requests.map((request) => (
              <Link
                key={request.id}
                href={`/requests/${request.id}`}
                className="block p-6 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      {request.title}
                    </h3>
                    {request.admin_reply && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-100/10 text-green-800 dark:text-green-400">
                        ✓ 답변완료
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-zinc-600 dark:text-zinc-500">
                    {formatDistanceToNow(new Date(request.created_at), { 
                      addSuffix: true, 
                      locale: ko 
                    })}
                  </span>
                </div>
                
                <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-3 line-clamp-2">
                  {request.content}
                </p>
                
                <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-500">
                  <div className="flex items-center gap-4">
                    <span>작성자: {request.author_nickname}</span>
                    <span>조회 {request.views}</span>
                  </div>
                  {!request.is_public && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400">
                      🔒 비공개
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
      
      {/* 페이지네이션 */}
      {total > limit && (
        <div className="mt-8 flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-zinc-900 hover:bg-gray-300 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            이전
          </button>
          <span className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
            {page} / {Math.ceil(total / limit)}
          </span>
          <button
            onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))}
            disabled={page >= Math.ceil(total / limit)}
            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-zinc-900 hover:bg-gray-300 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            다음
          </button>
        </div>
      )}
      
      {/* 결과 없음 */}
      {!loading && requests.length === 0 && (
        <div className="bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-12 text-center">
          <p className="text-zinc-700 dark:text-zinc-400 text-lg font-medium mb-2">
            {searchQuery ? '검색 결과가 없습니다' : '아직 등록된 요청이 없습니다'}
          </p>
          <p className="text-zinc-600 dark:text-zinc-500 text-sm mb-6">
            {searchQuery ? '다른 검색어를 입력해보세요' : '첫 번째 요청을 작성해보세요!'}
          </p>
          <Link
            href="/requests/create"
            className="inline-block px-6 py-3 bg-gradient-to-r from-surbate to-brand-600 text-zinc-900 font-semibold rounded-lg hover:from-brand-400 hover:to-brand-600 shadow-sm hover:shadow-lg hover:shadow-surbate/20 transform hover:-translate-y-0.5 transition-all duration-200"
          >
            요청 작성하기
          </Link>
        </div>
      )}
    </div>
  );
}