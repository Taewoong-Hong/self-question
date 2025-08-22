'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';

interface Question {
  _id: string;
  title: string;
  content: string;
  nickname: string;
  category?: string;
  tags?: string[];
  views: number;
  status: 'pending' | 'answered' | 'closed';
  adminAnswer?: {
    content: string;
    answeredAt: string;
    answeredBy: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortOption, setSortOption] = useState<'latest' | 'oldest' | 'views' | 'answered'>('latest');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'answered'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchQuestions();
  }, [currentPage, sortOption, statusFilter, searchQuery]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: 20,
        sort: sortOption
      };
      
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      const response = await axios.get('/api/questions', { params });
      setQuestions(response.data.questions);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('질문 목록 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen max-w-5xl mx-auto p-4">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">질문 게시판</h1>
        <p className="text-zinc-400">궁금한 점을 질문하고 답변을 받아보세요</p>
      </div>

      {/* 검색 및 필터 */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4 flex-wrap">
          {/* 검색 */}
          <div className="flex-1 min-w-[300px]">
            <input
              type="text"
              placeholder="검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          
          {/* 새 질문 작성 버튼 */}
          <Link
            href="/questions/new"
            className="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 font-medium"
          >
            질문하기
          </Link>
        </div>

        {/* 필터 및 정렬 */}
        <div className="flex gap-4 flex-wrap">
          {/* 상태 필터 */}
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'pending'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              답변 대기
            </button>
            <button
              onClick={() => setStatusFilter('answered')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'answered'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              답변 완료
            </button>
          </div>

          {/* 정렬 */}
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as any)}
            className="px-4 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="latest">최신순</option>
            <option value="oldest">오래된순</option>
            <option value="views">조회순</option>
            <option value="answered">답변순</option>
          </select>
        </div>
      </div>

      {/* 질문 목록 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-100"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              아직 질문이 없습니다. 첫 번째 질문을 작성해보세요!
            </div>
          ) : (
            questions.map((question) => (
              <Link
                key={question._id}
                href={`/questions/${question._id}`}
                className="block bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 hover:bg-zinc-800/30 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-zinc-100">{question.title}</h3>
                  <span className={`px-2.5 py-0.5 rounded text-xs font-medium ${
                    question.status === 'answered'
                      ? 'bg-green-100/10 text-green-400'
                      : question.status === 'closed'
                      ? 'bg-red-100/10 text-red-400'
                      : 'bg-yellow-100/10 text-yellow-400'
                  }`}>
                    {question.status === 'answered' ? '답변 완료' : 
                     question.status === 'closed' ? '종료' : '답변 대기'}
                  </span>
                </div>
                
                <p className="text-zinc-400 text-sm mb-3 line-clamp-2">
                  {question.content}
                </p>
                
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span>{question.nickname}</span>
                  <span>•</span>
                  <span>조회 {question.views}</span>
                  <span>•</span>
                  <span>
                    {new Date(question.createdAt).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    }).replace(/\. /g, '-').replace('.', '')}
                  </span>
                  {question.category && (
                    <>
                      <span>•</span>
                      <span className="text-zinc-400">{question.category}</span>
                    </>
                  )}
                </div>
                
                {question.tags && question.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {question.tags.map((tag, index) => (
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
            ))
          )}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            이전
          </button>
          
          <span className="px-4 py-2 text-zinc-400">
            {currentPage} / {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}