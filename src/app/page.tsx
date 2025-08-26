'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { debateApi } from '@/lib/api';
import { surveyApi } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import SortDropdown from '@/components/SortDropdown';

interface ContentItem {
  id: string;
  title: string;
  description?: string;
  type: 'debate' | 'survey';
  status: 'open' | 'closed' | 'scheduled' | 'draft';
  created_at: string;
  start_at?: string;
  end_at?: string;
  participantCount: number;
  author_nickname?: string;
  tags?: string[];
}

export default function Home() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'debate' | 'survey'>('all');
  const [sortOption, setSortOption] = useState<'latest' | 'oldest' | 'popular' | 'unpopular'>('latest');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 투표와 설문 데이터를 동시에 가져오기
        const [debatesResult, surveysResult] = await Promise.allSettled([
          debateApi.list({ page: 1, limit: 20, sort: 'latest' }),
          surveyApi.list({ page: 1, limit: 20, sort: 'latest' })
        ]);

        // 데이터 통합 및 변환
        const debates: ContentItem[] = debatesResult.status === 'fulfilled' && debatesResult.value?.debates 
          ? debatesResult.value.debates.map(debate => ({
              id: debate.id,
              title: debate.title,
              description: debate.description,
              type: 'debate' as const,
              status: debate.status === 'active' ? 'open' : debate.status === 'ended' ? 'closed' : 'scheduled',
              created_at: debate.created_at,
              start_at: debate.start_at,
              end_at: debate.end_at,
              participantCount: debate.stats?.unique_voters || 0,
              author_nickname: debate.author_nickname,
              tags: debate.tags
            }))
          : [];

        const surveys: ContentItem[] = surveysResult.status === 'fulfilled' && surveysResult.value?.surveys
          ? surveysResult.value.surveys.map(survey => ({
              id: survey.id || survey._id || '',
              title: survey.title,
              description: survey.description,
              type: 'survey' as const,
              status: survey.status === 'draft' ? 'scheduled' : survey.status,
              created_at: survey.created_at,
              start_at: survey.created_at, // For surveys, use created_at as start
              end_at: survey.settings?.close_at,
              participantCount: survey.stats?.response_count || 0,
              author_nickname: survey.author_nickname,
              tags: survey.tags
            }))
          : [];

        // 통합 및 정렬
        let combinedItems = [...debates, ...surveys];
        
        // 검색 필터링
        if (searchQuery) {
          combinedItems = combinedItems.filter(item => 
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        
        // 타입 필터링
        if (filter !== 'all') {
          combinedItems = combinedItems.filter(item => item.type === filter);
        }

        // 정렬
        combinedItems.sort((a, b) => {
          switch (sortOption) {
            case 'latest':
              return b.created_at.localeCompare(a.created_at);
            case 'oldest':
              return a.created_at.localeCompare(b.created_at);
            case 'popular':
              return b.participantCount - a.participantCount;
            case 'unpopular':
              return a.participantCount - b.participantCount;
            default:
              return 0;
          }
        });

        setItems(combinedItems);
      } catch (error) {
        console.error('데이터 로딩 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filter, sortOption, searchQuery]);

  return (
    <div className="min-h-screen">
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="pl-[3px]">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">모든 투표 & 설문</h1>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm">누구나 참여할 수 있는 투표와 설문을 확인하세요</p>
          </div>
        </div>
      </div>
      
      {/* 검색 및 필터 */}
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
            placeholder="검색..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        
        {/* 카테고리 탭 */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === 'all' 
                ? 'bg-gray-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' 
                : 'bg-gray-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setFilter('debate')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === 'debate' 
                ? 'bg-gray-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' 
                : 'bg-gray-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            투표
            <span className="ml-1 text-zinc-600 dark:text-zinc-500">({items.filter(i => i.type === 'debate').length})</span>
          </button>
          <button
            onClick={() => setFilter('survey')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === 'survey' 
                ? 'bg-gray-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' 
                : 'bg-gray-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            설문
            <span className="ml-1 text-zinc-600 dark:text-zinc-500">({items.filter(i => i.type === 'survey').length})</span>
          </button>
          
          <div className="ml-auto">
            <SortDropdown
              value={sortOption}
              onChange={(value) => setSortOption(value as 'latest' | 'oldest' | 'popular' | 'unpopular')}
            />
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-700 dark:border-zinc-100"></div>
          <p className="mt-2 text-zinc-600">로딩 중...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 카테고리별 섹션 - 바이브클럽 스타일 */}
          <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            {/* 콘텐츠 리스트 */}
            <div className="divide-y divide-gray-200 dark:divide-zinc-800">
              {items.map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={`/${item.type}s/${item.id}`}
                  className="block p-6 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                        item.type === 'debate' 
                          ? 'bg-blue-100 dark:bg-blue-100/10 text-blue-700 dark:text-blue-400' 
                          : 'bg-pink-100 dark:bg-brand-100/10 text-pink-700 dark:text-pink-500'
                      }`}>
                        {item.type === 'debate' ? '📊 투표' : '📝 설문'}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                        item.status === 'open' 
                          ? 'bg-green-100 dark:bg-brand-100/10 text-green-700 dark:text-brand-400' 
                          : item.status === 'closed'
                          ? 'bg-red-100 dark:bg-red-100/10 text-red-700 dark:text-red-400'
                          : 'bg-yellow-100 dark:bg-yellow-100/10 text-yellow-700 dark:text-yellow-400'
                      }`}>
                        {item.status === 'open' ? '진행중' : item.status === 'closed' ? '종료' : '예정'}
                      </span>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                    {item.title}
                  </h3>
                  
                  {item.description && (
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-3 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-500">
                    <div>
                      <span>참여 {item.participantCount}명</span>
                    </div>
                    <div>
                      {item.author_nickname && (
                        <span>작성자: {item.author_nickname}</span>
                      )}
                    </div>
                    <div>
                      {item.start_at ? (
                        <span>시작: {item.start_at.split('T')[0]}</span>
                      ) : (
                        <span>시작: -</span>
                      )}
                    </div>
                    <div>
                      {item.end_at ? (
                        <span>종료: {item.end_at.split('T')[0]}</span>
                      ) : (
                        <span>종료: 미정</span>
                      )}
                    </div>
                  </div>
                  
                  {item.tags && item.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {item.tags.slice(0, 3).map((tag, index) => (
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
        </div>
      )}
      
      {/* 결과 없음 메시지 */}
      {!loading && items.length === 0 && (
        <div className="bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-12 text-center">
          <div className="flex flex-col items-center">
            <svg className="w-12 h-12 text-zinc-400 dark:text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-zinc-700 dark:text-zinc-400 text-lg font-medium mb-2">
              {searchQuery ? '검색 결과가 없습니다' : '아직 등록된 콘텐츠가 없습니다'}
            </p>
            <p className="text-zinc-600 dark:text-zinc-500 text-sm mb-6">
              {searchQuery ? '다른 검색어를 입력해보세요' : '첫 번째 투표나 설문을 만들어보세요!'}
            </p>
            <div className="flex gap-4">
              <Link
                href="/debates/create"
                className="px-6 py-3 bg-gradient-to-r from-surbate to-brand-600 text-zinc-900 font-semibold rounded-lg hover:from-brand-400 hover:to-brand-600 shadow-sm hover:shadow-lg hover:shadow-surbate/20 transform hover:-translate-y-0.5 transition-all duration-200"
              >
                투표 만들기
              </Link>
              <Link
                href="/surveys/create"
                className="px-6 py-3 bg-gray-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-700 transition-colors"
              >
                설문 만들기
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}