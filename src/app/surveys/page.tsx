'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { surveyApi } from '@/lib/api';
import { Survey } from '@/types/survey';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import SortDropdown from '@/components/SortDropdown';

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState<'latest' | 'oldest' | 'popular' | 'unpopular'>('latest');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');

  useEffect(() => {
    fetchSurveys();
  }, [sortOption, statusFilter]);

  const fetchSurveys = async () => {
    try {
      setLoading(true);
      const data = await surveyApi.list({
        sort: sortOption === 'latest' || sortOption === 'oldest' ? 'latest' : 'popular',
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 20,
      });
      
      // 클라이언트 사이드에서 추가 정렬
      let sortedSurveys = data.surveys || [];
      if (sortOption === 'oldest') {
        sortedSurveys = sortedSurveys.reverse();
      } else if (sortOption === 'unpopular') {
        sortedSurveys = sortedSurveys.sort((a, b) => 
          (a.stats?.response_count || 0) - (b.stats?.response_count || 0)
        );
      }
      
      setSurveys(sortedSurveys);
    } catch (error) {
      console.error('설문 목록 조회 실패:', error);
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
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">설문 목록</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">다양한 주제의 설문에 참여해보세요</p>
          </div>
          <Link
            href="/surveys/create"
            className="w-12 h-12 border-2 border-gray-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-100 rounded-full hover:border-gray-400 dark:hover:border-zinc-500 hover:bg-gray-100 dark:hover:bg-zinc-800/50 transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center"
            title="새 설문 만들기"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </Link>
        </div>
      </div>

      {/* 필터 */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            statusFilter === 'all' 
              ? 'bg-gray-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' 
              : 'bg-gray-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          전체
        </button>
        <button
          onClick={() => setStatusFilter('open')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            statusFilter === 'open' 
              ? 'bg-gray-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' 
              : 'bg-gray-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          진행중
        </button>
        <button
          onClick={() => setStatusFilter('closed')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            statusFilter === 'closed' 
              ? 'bg-gray-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' 
              : 'bg-gray-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          종료
        </button>
        
        <div className="ml-auto">
          <SortDropdown
            value={sortOption}
            onChange={(value) => setSortOption(value as 'latest' | 'oldest' | 'popular' | 'unpopular')}
          />
        </div>
      </div>

      {/* 설문 목록 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-700 dark:border-zinc-100"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-zinc-800">
            {surveys.map((survey) => (
              <Link
                key={survey.id}
                href={`/surveys/${survey.id}`}
                className="block p-6 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                      survey.status === 'open' 
                        ? 'bg-emerald-100/10 text-emerald-400' 
                        : survey.status === 'closed'
                        ? 'bg-red-100/10 text-red-400'
                        : 'bg-yellow-100/10 text-yellow-400'
                    }`}>
                      {survey.status === 'open' ? '진행중' : survey.status === 'closed' ? '종료' : '예정'}
                    </span>
                    <span className="text-sm text-zinc-600 dark:text-zinc-500">
                      {survey.questions.length}개 질문
                    </span>
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                  {survey.title}
                </h3>
                
                {survey.description && (
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-3 line-clamp-1">
                    {survey.description}
                  </p>
                )}
                
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-500">
                  <div>
                    <span>응답 {survey.stats?.response_count || 0}명</span>
                  </div>
                  <div>
                    {survey.author_nickname && (
                      <span>작성자: {survey.author_nickname}</span>
                    )}
                  </div>
                  <div>
                    <span>시작: {new Date(survey.start_at || survey.created_at).toLocaleDateString('ko-KR', { 
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    }).replace(/\. /g, '-').replace('.', '')}</span>
                  </div>
                  <div>
                    {survey.end_at || survey.settings?.close_at ? (
                      <span>종료: {new Date(survey.end_at || survey.settings?.close_at || '').toLocaleDateString('ko-KR', { 
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      }).replace(/\. /g, '-').replace('.', '')}</span>
                    ) : (
                      <span>종료: 미정</span>
                    )}
                  </div>
                </div>
                
                {survey.tags && survey.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {survey.tags.slice(0, 3).map((tag, index) => (
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
      )}

      {/* 결과 없음 */}
      {!loading && surveys.length === 0 && (
        <div className="bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-12 text-center">
          <p className="text-zinc-700 dark:text-zinc-400 text-lg font-medium mb-2">
            아직 등록된 설문이 없습니다
          </p>
          <p className="text-zinc-600 dark:text-zinc-500 text-sm mb-6">
            첫 번째 설문을 만들어보세요!
          </p>
          <Link
            href="/surveys/create"
            className="inline-block px-6 py-3 bg-gradient-to-r from-surbate to-brand-600 text-zinc-900 font-semibold rounded-lg hover:from-brand-400 hover:to-brand-600 shadow-sm hover:shadow-lg hover:shadow-surbate/20 transform hover:-translate-y-0.5 transition-all duration-200"
          >
            설문 만들기
          </Link>
        </div>
      )}
    </div>
  );
}