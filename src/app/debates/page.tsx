'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { debateApi } from '@/lib/api';
import { Debate } from '@/types/debate';
import SortDropdown from '@/components/SortDropdown';

export default function DebatesPage() {
  const [debates, setDebates] = useState<Debate[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortOption, setSortOption] = useState<'latest' | 'oldest' | 'popular' | 'unpopular'>('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const limit = 12;

  useEffect(() => {
    const fetchDebates = async () => {
      try {
        setLoading(true);
        const response = await debateApi.list({ 
          page, 
          limit, 
          sort: sortOption === 'latest' || sortOption === 'oldest' ? 'latest' : 'popular', 
          search: searchQuery 
        });
        
        // 클라이언트 사이드에서 추가 정렬
        let sortedDebates = response.debates;
        if (sortOption === 'oldest') {
          sortedDebates = sortedDebates.reverse();
        } else if (sortOption === 'unpopular') {
          sortedDebates = sortedDebates.sort((a, b) => 
            (a.stats?.unique_voters || 0) - (b.stats?.unique_voters || 0)
          );
        }
        
        setDebates(sortedDebates);
        setTotal(response.pagination?.total || 0);
      } catch (error) {
        console.error('투표 목록 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDebates();
  }, [page, sortOption, searchQuery]);

  return (
    <div className="min-h-screen">
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="pl-[3px]">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">투표 목록</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">찬성과 반대 의견을 수집하는 투표를 확인하세요</p>
          </div>
          <Link
            href="/debates/create"
            className="w-12 h-12 border-2 border-gray-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-100 rounded-full hover:border-gray-400 dark:hover:border-zinc-500 hover:bg-gray-100 dark:hover:bg-zinc-800/50 transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center"
            title="새 투표 만들기"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </Link>
        </div>
      </div>
      
      {/* 검색 및 정렬 */}
      <div className="mb-6 space-y-4">
        {/* 검색 입력 */}
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
            placeholder="투표 검색..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        
        {/* 정렬 드롭다운 */}
        <div className="flex justify-end">
          <SortDropdown
            value={sortOption}
            onChange={(value) => setSortOption(value as 'latest' | 'oldest' | 'popular' | 'unpopular')}
          />
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-700 dark:border-zinc-100"></div>
          <p className="mt-2 text-zinc-600">로딩 중...</p>
        </div>
      ) : (
        <>
          {/* 투표 리스트 - 바이브클럽 스타일 */}
          <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <div className="divide-y divide-gray-200 dark:divide-zinc-800">
              {debates.map((debate) => (
                <Link
                  key={debate.id}
                  href={`/debates/${debate.id}`}
                  className="block p-6 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-blue-100/10 text-blue-400">
                        📊 투표
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                        debate.status === 'active' 
                          ? 'bg-emerald-100/10 text-emerald-400' 
                          : debate.status === 'ended'
                          ? 'bg-red-100/10 text-red-400'
                          : 'bg-yellow-100/10 text-yellow-400'
                      }`}>
                        {debate.status === 'active' ? '진행중' : debate.status === 'ended' ? '종료' : '예정'}
                      </span>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                    {debate.title}
                  </h3>
                  
                  {debate.description && (
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-3 line-clamp-1">
                      {debate.description}
                    </p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-500">
                    <div>
                      <span>참여 {debate.stats?.unique_voters || 0}명</span>
                    </div>
                    <div>
                      {debate.author_nickname && (
                        <span>작성자: {debate.author_nickname}</span>
                      )}
                    </div>
                    <div>
                      {debate.start_at ? (
                        <span>시작: {(() => {
                          const date = new Date(debate.start_at);
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          const hour = String(date.getHours()).padStart(2, '0');
                          const minute = String(date.getMinutes()).padStart(2, '0');
                          return `${year}-${month}-${day} ${hour}:${minute}`;
                        })()}</span>
                      ) : (
                        <span>시작: -</span>
                      )}
                    </div>
                    <div>
                      {debate.end_at ? (
                        <span>종료: {(() => {
                          const date = new Date(debate.end_at);
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          const hour = String(date.getHours()).padStart(2, '0');
                          const minute = String(date.getMinutes()).padStart(2, '0');
                          return `${year}-${month}-${day} ${hour}:${minute}`;
                        })()}</span>
                      ) : (
                        <span>종료: 미정</span>
                      )}
                    </div>
                  </div>
                  
                  {debate.tags && debate.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {debate.tags.slice(0, 3).map((tag, index) => (
                        <span 
                          key={index}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
          
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
        </>
      )}
      
      {/* 결과 없음 메시지 */}
      {!loading && debates.length === 0 && (
        <div className="bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-12 text-center">
          <div className="flex flex-col items-center">
            <svg className="w-12 h-12 text-zinc-400 dark:text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-zinc-700 dark:text-zinc-400 text-lg font-medium mb-2">
              {searchQuery ? '검색 결과가 없습니다' : '아직 등록된 투표가 없습니다'}
            </p>
            <p className="text-zinc-600 dark:text-zinc-500 text-sm mb-6">
              {searchQuery ? '다른 검색어를 입력해보세요' : '첫 번째 투표를 만들어보세요!'}
            </p>
            <Link
              href="/debates/create"
              className="px-6 py-3 bg-gradient-to-r from-surbate to-brand-600 text-zinc-900 font-semibold rounded-lg hover:from-brand-400 hover:to-brand-600 shadow-sm hover:shadow-lg hover:shadow-surbate/20 transform hover:-translate-y-0.5 transition-all duration-200"
            >
              투표 만들기
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}