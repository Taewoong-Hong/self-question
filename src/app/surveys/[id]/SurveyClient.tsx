'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SurveyForm from './SurveyForm';
import SurveyResults from './SurveyResults';
import toast from 'react-hot-toast';

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
    public_results?: boolean;
    stats?: {
      response_count: number;
      completion_rate?: number;
      view_count?: number;
    };
  };
}

export default function SurveyClient({ survey }: SurveyProps) {
  const router = useRouter();
  const [hasResponded, setHasResponded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(survey.stats || { response_count: 0 });

  useEffect(() => {
    // 로컬 스토리지에서 성공 메시지 확인
    const successMessage = localStorage.getItem('showSuccessMessage');
    if (successMessage) {
      toast.success(successMessage);
      localStorage.removeItem('showSuccessMessage');
    }
    
    // API에서 응답 여부 확인
    checkResponseStatus();
  }, [survey.id]);

  const checkResponseStatus = async () => {
    try {
      const response = await fetch(`/api/surveys/${survey.id}`);
      const data = await response.json();
      setHasResponded(data.has_responded || false);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error checking response status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen max-w-4xl mx-auto">
      {/* 헤더 - 제목과 버튼을 한 행에 표시 */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-zinc-900 dark:text-zinc-100">{survey.title}</h1>
          {/* 우측 버튼들 */}
          <div className="flex gap-2 flex-shrink-0">
            <Link
              href="/surveys"
              className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              title="설문 목록으로"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                strokeWidth={1.5} 
                stroke="currentColor" 
                className="w-5 h-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
            </Link>
            <Link
              href={`/surveys/${survey.id}/admin`}
              className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
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
          </div>
        </div>
        
        {/* 설명 및 메타 정보 */}
        <div>
          {survey.description && (
            <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base lg:text-lg whitespace-pre-wrap mt-2">{survey.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-xs sm:text-sm text-zinc-600 dark:text-zinc-500">
            <span>응답 {stats.response_count}명</span>
            <span>•</span>
            <span>작성자: {survey.author_nickname || '익명'}</span>
            <span>•</span>
            <span>시작: {(() => {
              const date = new Date(survey.start_at || survey.created_at);
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const hour = String(date.getHours()).padStart(2, '0');
              const minute = String(date.getMinutes()).padStart(2, '0');
              return `${year}-${month}-${day} ${hour}:${minute}`;
            })()}</span>
            <span>•</span>
            <span>종료: {survey.end_at ? (() => {
              const date = new Date(survey.end_at);
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const hour = String(date.getHours()).padStart(2, '0');
              const minute = String(date.getMinutes()).padStart(2, '0');
              return `${year}-${month}-${day} ${hour}:${minute}`;
            })() : '미정'}</span>
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
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400"
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
          {survey.status === 'closed' ? (
            <>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-6 mb-6">
                <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2 text-center">종료된 설문입니다</h2>
                <p className="text-center text-zinc-600 dark:text-zinc-400">
                  이 설문은 종료되어 더 이상 응답할 수 없습니다.
                </p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gray-100/50 dark:bg-zinc-950/50 backdrop-blur-sm z-10 rounded-xl" />
                <div className="opacity-50 pointer-events-none">
                  <SurveyForm 
                    surveyId={survey.id} 
                    questions={survey.questions}
                    onComplete={() => {}}
                  />
                </div>
              </div>
            </>
          ) : survey.status === 'draft' ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold text-yellow-600 dark:text-yellow-400 mb-2 text-center">준비중인 설문입니다</h2>
              <p className="text-center text-zinc-600 dark:text-zinc-400">
                이 설문은 아직 시작되지 않았습니다.
              </p>
            </div>
          ) : survey.status === 'open' && !hasResponded ? (
            <SurveyForm 
              surveyId={survey.id} 
              questions={survey.questions}
              onComplete={() => setHasResponded(true)}
            />
          ) : survey.status === 'open' && hasResponded ? (
            <>
              <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-6 mb-6 shadow-sm dark:shadow-none">
                <h2 className="text-xl font-semibold text-surbate dark:text-surbate mb-2 text-center">이미 응답하신 설문입니다</h2>
                <p className="text-center text-zinc-600 dark:text-zinc-400">
                  귀하의 응답이 저장되었습니다. 감사합니다!
                </p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gray-100/50 dark:bg-zinc-950/50 backdrop-blur-sm z-10 rounded-xl" />
                <div className="opacity-50 pointer-events-none">
                  <SurveyForm 
                    surveyId={survey.id} 
                    questions={survey.questions}
                    onComplete={() => {}}
                  />
                </div>
              </div>
            </>
          ) : (
            // 설문이 종료된 경우, public_results 확인
            survey.public_results || hasResponded ? (
              <SurveyResults surveyId={survey.id} publicResults={survey.public_results || false} />
            ) : (
              <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-6 mb-6 shadow-sm dark:shadow-none">
                <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300 mb-2 text-center">비공개 결과</h2>
                <p className="text-center text-zinc-600 dark:text-zinc-400">
                  이 설문의 결과는 작성자만 확인할 수 있습니다.
                </p>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}