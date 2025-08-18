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
    status: 'active' | 'ended' | 'scheduled';
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
    <div className="min-h-screen max-w-4xl mx-auto">
      {/* 헤더 - SSG로 렌더링된 정적 정보 */}
      <div className="mb-6">
        <Link href="/surveys" className="text-zinc-400 hover:text-zinc-100 text-sm mb-3 inline-block">
          ← 설문 목록으로
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
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
                survey.status === 'active' 
                  ? 'bg-surbate/10 text-surbate' 
                  : survey.status === 'ended'
                  ? 'bg-red-100/10 text-red-400'
                  : 'bg-yellow-100/10 text-yellow-400'
              }`}>
                {survey.status === 'active' ? '진행중' : survey.status === 'ended' ? '종료' : '예정'}
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
          
          <Link
            href={`/surveys/${survey.id}/admin`}
            className="self-start px-3 py-1.5 sm:px-4 sm:py-2 text-sm bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            <span className="sm:hidden">관리</span>
            <span className="hidden sm:inline">작성자 페이지</span>
          </Link>
        </div>
      </div>

      {/* 설문 폼 또는 결과 - CSR로 처리 */}
      {!loading && (
        <>
          {survey.status === 'active' && !hasResponded ? (
            <SurveyForm 
              surveyId={survey.id} 
              questions={survey.questions}
              onComplete={() => setHasResponded(true)}
            />
          ) : (
            <SurveyResults surveyId={survey.id} />
          )}

          {survey.status === 'ended' && (
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-4 sm:p-6 mb-6">
              <p className="text-center text-sm sm:text-base text-zinc-400">
                이 설문은 종료되었습니다.
              </p>
            </div>
          )}

          {survey.status === 'scheduled' && (
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