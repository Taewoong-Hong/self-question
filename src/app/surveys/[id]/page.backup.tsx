'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { surveyApi } from '@/lib/api';
import { Survey, SurveyResponseData } from '@/types/survey';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function SurveyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;
  
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasResponded, setHasResponded] = useState(false);
  const [responses, setResponses] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchSurvey();
  }, [surveyId]);

  const fetchSurvey = async () => {
    try {
      setLoading(true);
      const data = await surveyApi.get(surveyId);
      setSurvey(data.survey);
      setHasResponded(data.has_responded);
      
      // 초기 응답 상태 설정
      const initialResponses: Record<string, any> = {};
      data.survey.questions.forEach(q => {
        if (q.type === 'multiple_choice') {
          initialResponses[q.id] = [];
        } else {
          initialResponses[q.id] = '';
        }
      });
      setResponses(initialResponses);
    } catch (error) {
      console.error('설문 조회 실패:', error);
      alert('설문을 불러올 수 없습니다.');
      router.push('/surveys');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!survey) return;

    // 필수 질문 검증
    const missingRequired = survey.questions.find(q => 
      q.required && (!responses[q.id] || 
        (Array.isArray(responses[q.id]) && responses[q.id].length === 0))
    );

    if (missingRequired) {
      alert('필수 질문에 모두 답변해주세요.');
      return;
    }

    try {
      setSubmitting(true);
      const responseData: SurveyResponseData = {
        answers: survey.questions.map(q => ({
          question_id: q.id,
          answer: responses[q.id]
        }))
      };
      
      const result = await surveyApi.respond(surveyId, responseData);
      setHasResponded(true);
      alert(`설문이 제출되었습니다!\n응답 코드: ${result.response_code}`);
      router.push(`/surveys/${surveyId}/results`);
    } catch (error: any) {
      if (error.message?.includes('이미 응답')) {
        setHasResponded(true);
        alert('이미 설문에 참여하셨습니다.');
      } else {
        alert('설문 제출 중 오류가 발생했습니다.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-100"></div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-400">설문을 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="mb-8">
        <Link href="/surveys" className="text-zinc-400 hover:text-zinc-100 mb-4 inline-block">
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
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                survey.status === 'open' 
                  ? 'bg-surbate/10 text-surbate' 
                  : survey.status === 'closed'
                  ? 'bg-red-100/10 text-red-400'
                  : 'bg-yellow-100/10 text-yellow-400'
              }`}>
                {survey.status === 'open' ? '진행중' : survey.status === 'closed' ? '종료' : '예정'}
              </span>
              <span>•</span>
              <span>응답 {survey.stats?.response_count || 0}명</span>
            </div>
            {survey.tags && survey.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {survey.tags.map((tag, index) => (
                  <span 
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded text-xs bg-zinc-800 text-zinc-400"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex gap-2 self-start">
            <Link
              href={`/surveys/${surveyId}/results`}
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              <span className="sm:hidden">결과</span>
              <span className="hidden sm:inline">결과 보기</span>
            </Link>
            <Link
              href={`/surveys/${surveyId}/admin`}
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              <span className="sm:hidden">관리</span>
              <span className="hidden sm:inline">작성자 페이지</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 설문 폼 */}
      {survey.status === 'open' && !hasResponded ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {survey.questions.map((question, index) => (
            <div key={question.id} className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-4 sm:p-6">
              <div className="mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-medium mb-1">
                  {index + 1}. {question.title}
                  {question.required && <span className="text-red-400 ml-1">*</span>}
                </h3>
              </div>

              {/* 단일 선택 */}
              {question.type === 'single_choice' && (
                <div className="space-y-2">
                  {question.properties?.choices?.map((choice) => (
                    <label key={choice.id} className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg hover:bg-zinc-800/50 cursor-pointer">
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={choice.id}
                        checked={responses[question.id] === choice.id}
                        onChange={(e) => handleResponseChange(question.id, e.target.value)}
                        className="text-brand-500 bg-zinc-900 border-zinc-700 focus:ring-brand-500"
                      />
                      <span className="text-sm sm:text-base">{choice.label}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* 다중 선택 */}
              {question.type === 'multiple_choice' && (
                <div className="space-y-2">
                  {question.properties?.choices?.map((choice) => (
                    <label key={choice.id} className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg hover:bg-zinc-800/50 cursor-pointer">
                      <input
                        type="checkbox"
                        value={choice.id}
                        checked={responses[question.id]?.includes(choice.id) || false}
                        onChange={(e) => {
                          const currentValues = responses[question.id] || [];
                          if (e.target.checked) {
                            handleResponseChange(question.id, [...currentValues, choice.id]);
                          } else {
                            handleResponseChange(question.id, currentValues.filter((v: string) => v !== choice.id));
                          }
                        }}
                        className="rounded text-brand-500 bg-zinc-900 border-zinc-700 focus:ring-brand-500"
                      />
                      <span className="text-sm sm:text-base">{choice.label}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* 단답형 */}
              {question.type === 'short_text' && (
                <input
                  type="text"
                  value={responses[question.id] || ''}
                  onChange={(e) => handleResponseChange(question.id, e.target.value)}
                  className="w-full px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="답변을 입력하세요"
                  maxLength={question.properties?.max_length || question.validations?.max_characters}
                />
              )}

              {/* 장문형 */}
              {question.type === 'long_text' && (
                <textarea
                  value={responses[question.id] || ''}
                  onChange={(e) => handleResponseChange(question.id, e.target.value)}
                  className="w-full px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  rows={4}
                  placeholder="답변을 입력하세요"
                  maxLength={question.properties?.max_length || question.validations?.max_characters}
                />
              )}

              {/* 평점 */}
              {question.type === 'rating' && (
                <div className="flex gap-2">
                  {Array.from({ length: question.properties?.rating_scale || 5 }, (_, i) => i + 1).map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => handleResponseChange(question.id, rating)}
                      className={`w-10 h-10 sm:w-12 sm:h-12 text-sm sm:text-base rounded-lg border-2 transition-all ${
                        responses[question.id] === rating
                          ? 'bg-brand-500 border-brand-500 text-white'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-surbate to-brand-600 text-zinc-900 font-semibold rounded-lg hover:from-brand-400 hover:to-brand-600 shadow-sm hover:shadow-lg hover:shadow-surbate/20 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
            >
              {submitting ? '제출 중...' : '설문 제출'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              취소
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-4 sm:p-6">
          <p className="text-center text-sm sm:text-base text-zinc-400">
            {hasResponded ? '이미 설문에 참여하셨습니다.' : 
             survey.status === 'closed' ? '이 설문은 종료되었습니다.' :
             '이 설문은 아직 시작되지 않았습니다.'}
          </p>
        </div>
      )}
    </div>
  );
}