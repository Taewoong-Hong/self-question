'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import SurveyForm from './SurveyForm';
import SurveyResults from './SurveyResults';

interface SurveyProps {
  survey: {
    id: string;
    title: string;
    description?: string;
    author_nickname?: string;
    status: 'draft' | 'open' | 'closed';
    created_at: string;
    start_at?: string;
    end_at?: string;
    tags?: string[];
    questions: any[];
  };
}

export default function SurveyClient({ survey }: SurveyProps) {
  const router = useRouter();
  const [hasResponded, setHasResponded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkResponseStatus();
  }, [survey.id]);

  const checkResponseStatus = async () => {
    try {
      const response = await fetch(`/api/surveys/${survey.id}/check-response`);
      const data = await response.json();
      setHasResponded(data.hasResponded);
    } catch (error) {
      console.error('Error checking response status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen max-w-4xl mx-auto relative">
      {/* 우측 상단 관리 버튼 */}
      <Link
        href={`/surveys/${survey.id}/admin`}
        className="absolute right-0 top-0 p-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors"
        title="설문 관리"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24" 
          strokeWidth={1.5} 
          stroke="currentColor" 
          className="w-5 h-5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l9.932-9.931ZM19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
        </svg>
      </Link>
      
      {/* 헤더 - SSG로 렌더링된 정적 정보 */}
      <div className="mb-6">
        <Link href="/surveys" className="text-zinc-400 hover:text-zinc-100 text-sm mb-3 inline-block">
          ← 설문 목록으로
        </Link>
        
        <div className="pr-12">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">{survey.title}</h1>
          {survey.description && (
            <p className="text-zinc-400 text-sm sm:text-base lg:text-lg">{survey.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-xs sm:text-sm text-zinc-500">
            <span>작성자: {survey.author_nickname || '익명'}</span>
            <span>•</span>
            <span>
              {formatDistanceToNow(new Date(survey.created_at), { 
                addSuffix: true, 
                locale: ko 
              })}
            </span>
            <span>•</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              survey.status === 'open' 
                ? 'bg-surbate/10 text-surbate' 
                : survey.status === 'closed'
                ? 'bg-red-100/10 text-red-400'
                : 'bg-yellow-100/10 text-yellow-400'
            }`}>
              {survey.status === 'open' ? '진행중' : survey.status === 'closed' ? '종료' : '준비중'}
            </span>
          </div>
          {survey.tags && survey.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {survey.tags.map((tag, index) => (
                <span 
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-400"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 설문 폼 또는 결과 - CSR로 처리 */}
      {!loading && (
        <>
          {survey.status === 'open' && !hasResponded ? (
            <SurveyForm 
              surveyId={survey.id} 
              questions={survey.questions}
              onComplete={() => setHasResponded(true)}
            />
          ) : (
            <SurveyResults surveyId={survey.id} />
          )}

          {survey.status === 'closed' && (
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-4 sm:p-6 mb-6">
              <p className="text-center text-sm sm:text-base text-zinc-400">
                이 설문은 종료되었습니다.
              </p>
            </div>
          )}

          {survey.status === 'draft' && (
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-4 sm:p-6 mb-6">
              <p className="text-center text-sm sm:text-base text-zinc-400">
                이 설문은 아직 시작되지 않았습니다.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}