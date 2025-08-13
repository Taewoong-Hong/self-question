'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { surveyApi } from '@/lib/api';
import { Survey } from '@/types/survey';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function SurveyResultsPage() {
  const params = useParams();
  const surveyId = params.id as string;
  
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, [surveyId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const [surveyData, resultsData] = await Promise.all([
        surveyApi.get(surveyId),
        surveyApi.getResults(surveyId)
      ]);
      setSurvey(surveyData);
      setResults(resultsData);
    } catch (error) {
      console.error('결과 조회 실패:', error);
      alert('결과를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      await surveyApi.exportCSV(surveyId);
      alert('CSV 다운로드가 시작됩니다.');
    } catch (error) {
      alert('CSV 다운로드에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-100"></div>
      </div>
    );
  }

  if (!survey || !results) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-400">결과를 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="mb-8">
        <Link href={`/surveys/${surveyId}`} className="text-zinc-400 hover:text-zinc-100 mb-4 inline-block">
          ← 설문으로 돌아가기
        </Link>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{survey.title} - 결과</h1>
            <div className="flex items-center gap-4 mt-4 text-sm text-zinc-500">
              <span>응답 {survey.response_count}명</span>
              <span>•</span>
              <span>
                {formatDistanceToNow(new Date(survey.created_at), { 
                  addSuffix: true, 
                  locale: ko 
                })}
              </span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              CSV 다운로드
            </button>
            <Link
              href={`/surveys/${surveyId}/admin`}
              className="px-4 py-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              작성자 페이지
            </Link>
          </div>
        </div>
      </div>

      {/* 결과 표시 */}
      <div className="space-y-6">
        {survey.questions.map((question, index) => {
          const questionResults = results.questions?.find((q: any) => q.question_id === question._id);
          
          return (
            <div key={question._id} className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-medium mb-4">
                {index + 1}. {question.text}
              </h3>

              {/* 단일/다중 선택 결과 */}
              {(question.type === 'single_choice' || question.type === 'multiple_choice') && questionResults?.distribution && (
                <div className="space-y-3">
                  {Object.entries(questionResults.distribution).map(([option, count]) => {
                    const percentage = (Number(count) / questionResults.total) * 100;
                    return (
                      <div key={option}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm">{option}</span>
                          <span className="text-sm text-zinc-400">
                            {count}명 ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 텍스트 응답 결과 */}
              {(question.type === 'short_text' || question.type === 'long_text') && questionResults?.responses && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {questionResults.responses.slice(0, 10).map((response: string, idx: number) => (
                    <div key={idx} className="bg-zinc-800/50 rounded p-3 text-sm">
                      {response}
                    </div>
                  ))}
                  {questionResults.responses.length > 10 && (
                    <p className="text-sm text-zinc-500 text-center mt-2">
                      ... 외 {questionResults.responses.length - 10}개 응답
                    </p>
                  )}
                </div>
              )}

              {/* 평점 결과 */}
              {question.type === 'rating' && questionResults?.average && (
                <div className="text-center">
                  <div className="text-4xl font-bold text-emerald-400 mb-2">
                    {questionResults.average.toFixed(1)}
                  </div>
                  <div className="flex justify-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`text-2xl ${
                          star <= Math.round(questionResults.average)
                            ? 'text-yellow-400'
                            : 'text-zinc-600'
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-zinc-500">
                    총 {questionResults.total}명 응답
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}