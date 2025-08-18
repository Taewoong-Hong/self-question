'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { debateApi } from '@/lib/api';
import { surveyApi } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface ContentItem {
  id: string;
  title: string;
  description?: string;
  type: 'debate' | 'survey';
  status: 'open' | 'closed' | 'scheduled' | 'draft';
  created_at: string;
  participantCount: number;
  author_nickname?: string;
  tags?: string[];
}

export default function Home() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'debate' | 'survey'>('all');
  const [sort, setSort] = useState<'latest' | 'popular'>('latest');
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
          if (sort === 'latest') {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          } else {
            return b.participantCount - a.participantCount;
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
  }, [filter, sort, searchQuery]);

  return (
    <div className="min-h-screen">
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">모든 투표 & 설문</h1>
            <p className="text-zinc-400 mt-1">누구나 참여할 수 있는 투표와 설문을 확인하세요</p>
          </div>
        </div>
      </div>
      
      {/* 검색 및 필터 */}
      <div className="mb-6 space-y-4">
        {/* 검색 입력 */}
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="검색..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        
        {/* 카테고리 탭 */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === 'all' 
                ? 'bg-zinc-800 text-zinc-100' 
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setFilter('debate')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === 'debate' 
                ? 'bg-zinc-800 text-zinc-100' 
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            투표만
            <span className="ml-1 text-zinc-500">({items.filter(i => i.type === 'debate').length})</span>
          </button>
          <button
            onClick={() => setFilter('survey')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === 'survey' 
                ? 'bg-zinc-800 text-zinc-100' 
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            설문만
            <span className="ml-1 text-zinc-500">({items.filter(i => i.type === 'survey').length})</span>
          </button>
          
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setSort('latest')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                sort === 'latest' 
                  ? 'bg-zinc-800 text-zinc-100' 
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              최신순
            </button>
            <button
              onClick={() => setSort('popular')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                sort === 'popular' 
                  ? 'bg-zinc-800 text-zinc-100' 
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              인기순
            </button>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-100"></div>
          <p className="mt-2 text-zinc-600">로딩 중...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 카테고리별 섹션 - 바이브클럽 스타일 */}
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl overflow-hidden">
            {/* 콘텐츠 리스트 */}
            <div className="divide-y divide-zinc-800">
              {items.map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={`/${item.type}s/${item.id}`}
                  className="block p-6 hover:bg-zinc-800/30 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                        item.type === 'debate' 
                          ? 'bg-blue-100/10 text-blue-400' 
                          : 'bg-red-500/10 text-red-500'
                      }`}>
                        {item.type === 'debate' ? '📊 투표' : '📝 설문'}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                        item.status === 'open' 
                          ? 'bg-brand-100/10 text-brand-400' 
                          : item.status === 'closed'
                          ? 'bg-red-100/10 text-red-400'
                          : 'bg-yellow-100/10 text-yellow-400'
                      }`}>
                        {item.status === 'open' ? '진행중' : item.status === 'closed' ? '종료' : '예정'}
                      </span>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-zinc-100 mb-3">
                    {item.title}
                  </h3>
                  
                  {item.description && (
                    <p className="text-zinc-400 text-sm mb-3 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-zinc-500">
                    <div className="flex items-center gap-4">
                      <span>참여 {item.participantCount}명</span>
                      {item.author_nickname && (
                        <span>작성자: {item.author_nickname}</span>
                      )}
                    </div>
                    <span>
                      {formatDistanceToNow(new Date(item.created_at), { 
                        addSuffix: true, 
                        locale: ko 
                      })}
                    </span>
                  </div>
                  
                  {item.tags && item.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {item.tags.slice(0, 3).map((tag, index) => (
                        <span 
                          key={index}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-400"
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
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-12 text-center">
          <div className="flex flex-col items-center">
            <svg className="w-12 h-12 text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-zinc-400 text-lg font-medium mb-2">
              {searchQuery ? '검색 결과가 없습니다' : '아직 등록된 콘텐츠가 없습니다'}
            </p>
            <p className="text-zinc-500 text-sm mb-6">
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
                className="px-6 py-3 bg-zinc-800 text-zinc-100 font-semibold rounded-lg hover:bg-zinc-700 transition-colors"
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