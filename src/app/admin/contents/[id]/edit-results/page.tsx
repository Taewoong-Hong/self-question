'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Question {
  id: string;
  title: string;
  type: 'single_choice' | 'multiple_choice' | 'short_text' | 'long_text' | 'rating';
  properties?: {
    choices?: Array<{ id: string; text: string; }>;
    rating_scale?: number;
  };
}

interface Survey {
  id: string;
  title: string;
  questions: Question[];
  admin_results?: {
    [questionId: string]: {
      choices?: { [choiceId: string]: number };
      ratings?: { [rating: string]: number };
      sample_responses?: string[];
      total_responses?: number;
    };
  };
  stats: {
    response_count: number;
  };
  created_at?: string;
  first_response_at?: string;
  start_at?: string;
  end_at?: string;
  settings?: {
    close_at?: string;
  };
}

export default function EditSurveyResultsPage() {
  const router = useRouter();
  const params = useParams();
  const surveyId = params?.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [results, setResults] = useState<any>({});
  const [createdAt, setCreatedAt] = useState<string>('');
  const [firstResponseAt, setFirstResponseAt] = useState<string>('');
  const [closeAt, setCloseAt] = useState<string>('');
  const [startAt, setStartAt] = useState<string>('');
  const [endAt, setEndAt] = useState<string>('');

  useEffect(() => {
    // 관리자 인증 확인
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/admin');
      return;
    }
    fetchSurvey();
  }, [surveyId, router]);

  const fetchSurvey = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      
      const response = await fetch(`/api/admin/surveys/${surveyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch survey');
      }
      
      const data = await response.json();
      console.log('Survey data:', data); // 디버그용
      console.log('Questions:', data.questions); // 디버그용
      setSurvey(data);
      
      // 날짜 설정
      if (data.created_at) {
        setCreatedAt(new Date(data.created_at).toISOString().slice(0, 16));
      }
      if (data.first_response_at) {
        setFirstResponseAt(new Date(data.first_response_at).toISOString().slice(0, 16));
      }
      if (data.settings?.close_at) {
        setCloseAt(new Date(data.settings.close_at).toISOString().slice(0, 16));
      }
      if (data.start_at) {
        setStartAt(new Date(data.start_at).toISOString().slice(0, 16));
      }
      if (data.end_at) {
        setEndAt(new Date(data.end_at).toISOString().slice(0, 16));
      }
      
      // Initialize results from existing admin_results or empty
      const initialResults: any = {};
      data.questions.forEach((question: Question) => {
        const existingResult = data.admin_results?.[question.id] || {};
        
        if (question.type === 'single_choice' || question.type === 'multiple_choice') {
          initialResults[question.id] = {
            choices: existingResult.choices || {},
            total_responses: existingResult.total_responses || 0
          };
          
          // Initialize all choices with 0 if not exists
          question.properties?.choices?.forEach(choice => {
            if (!initialResults[question.id].choices[choice.id]) {
              initialResults[question.id].choices[choice.id] = 0;
            }
          });
        } else if (question.type === 'rating') {
          initialResults[question.id] = {
            ratings: existingResult.ratings || {},
            total_responses: existingResult.total_responses || 0
          };
          
          // Initialize all ratings with 0 if not exists
          const scale = question.properties?.rating_scale || 5;
          for (let i = 1; i <= scale; i++) {
            if (!initialResults[question.id].ratings[i.toString()]) {
              initialResults[question.id].ratings[i.toString()] = 0;
            }
          }
        } else {
          initialResults[question.id] = {
            sample_responses: existingResult.sample_responses || [],
            total_responses: existingResult.total_responses || 0
          };
        }
      });
      
      setResults(initialResults);
    } catch (error) {
      console.error('Failed to fetch survey:', error);
      toast.error('설문 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleChoiceChange = (questionId: string, choiceId: string, value: string) => {
    const numValue = Math.max(0, parseInt(value) || 0);
    setResults((prev: any) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        choices: {
          ...prev[questionId].choices,
          [choiceId]: numValue
        }
      }
    }));
  };

  const handleRatingChange = (questionId: string, rating: string, value: string) => {
    const numValue = Math.max(0, parseInt(value) || 0);
    setResults((prev: any) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        ratings: {
          ...prev[questionId].ratings,
          [rating]: numValue
        }
      }
    }));
  };

  const handleSampleResponseChange = (questionId: string, index: number, value: string) => {
    setResults((prev: any) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        sample_responses: prev[questionId].sample_responses.map((r: string, i: number) => 
          i === index ? value : r
        )
      }
    }));
  };

  const addSampleResponse = (questionId: string) => {
    setResults((prev: any) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        sample_responses: [...prev[questionId].sample_responses, '']
      }
    }));
  };

  const removeSampleResponse = (questionId: string, index: number) => {
    setResults((prev: any) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        sample_responses: prev[questionId].sample_responses.filter((_: string, i: number) => i !== index)
      }
    }));
  };

  const calculateTotalResponses = () => {
    let maxResponses = 0;
    
    Object.entries(results).forEach(([questionId, result]: [string, any]) => {
      const question = survey?.questions.find(q => q.id === questionId);
      if (!question) return;
      
      if (question.type === 'single_choice' || question.type === 'multiple_choice') {
        const total = Object.values(result.choices || {}).reduce((sum: number, count: any) => sum + count, 0);
        if (question.type === 'single_choice') {
          maxResponses = Math.max(maxResponses, total);
        }
      } else if (question.type === 'rating') {
        const total = Object.values(result.ratings || {}).reduce((sum: number, count: any) => sum + count, 0);
        maxResponses = Math.max(maxResponses, total);
      } else {
        maxResponses = Math.max(maxResponses, result.total_responses || 0);
      }
    });
    
    return maxResponses;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('admin_token');
      
      // Calculate total response count
      const totalResponses = calculateTotalResponses();
      
      const response = await fetch(`/api/admin/surveys/${surveyId}/results`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          admin_results: results,
          response_count: totalResponses,
          created_at: createdAt ? new Date(createdAt).toISOString() : undefined,
          first_response_at: firstResponseAt ? new Date(firstResponseAt).toISOString() : undefined,
          close_at: closeAt ? new Date(closeAt).toISOString() : undefined,
          start_at: startAt ? new Date(startAt).toISOString() : undefined,
          end_at: endAt ? new Date(endAt).toISOString() : undefined
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save results');
      }
      
      toast.success('결과가 저장되었습니다.');
      router.push('/admin/contents');
    } catch (error) {
      console.error('Failed to save results:', error);
      toast.error('결과 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !survey) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-100"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 text-zinc-400 mb-4">
            <Link href="/admin/contents" className="hover:text-zinc-100 transition-colors">
              콘텐츠 관리
            </Link>
            <span>/</span>
            <span className="text-zinc-100">설문 결과 수정</span>
          </div>
          <h2 className="text-2xl font-bold text-zinc-100">{survey.title} - 결과 수정</h2>
          <p className="text-zinc-400 mt-1">각 질문의 응답 결과를 직접 입력하세요.</p>
        </div>

        {/* 날짜 수정 섹션 */}
        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-6 mb-6 shadow-sm dark:shadow-none">
          <h3 className="text-lg font-semibold text-zinc-100 mb-4">설문 날짜 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">생성일시</label>
              <input
                type="datetime-local"
                value={createdAt}
                onChange={(e) => setCreatedAt(e.target.value)}
                className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-2">첫 응답일시</label>
              <input
                type="datetime-local"
                value={firstResponseAt}
                onChange={(e) => setFirstResponseAt(e.target.value)}
                className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-2">종료일시 (구 설정)</label>
              <input
                type="datetime-local"
                value={closeAt}
                onChange={(e) => setCloseAt(e.target.value)}
                className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">시작일시 (새 설정)</label>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-2">종료일시 (새 설정)</label>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {survey.questions.map((question) => (
            <div key={question.id} className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-zinc-100 mb-4">{question.title}</h3>
              
              {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
                <div className="space-y-3">
                  {question.properties?.choices?.map(choice => (
                    <div key={choice.id} className="flex items-center gap-4">
                      <span className="text-zinc-300 flex-1">{(choice as any).label || (choice as any).text || '(선택지 텍스트 없음)'}</span>
                      <input
                        type="number"
                        min="0"
                        value={results[question.id]?.choices?.[choice.id] || 0}
                        onChange={(e) => handleChoiceChange(question.id, choice.id, e.target.value)}
                        className="w-24 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <span className="text-zinc-500 text-sm">명</span>
                    </div>
                  ))}
                </div>
              )}
              
              {question.type === 'rating' && (
                <div className="space-y-3">
                  {Array.from({ length: question.properties?.rating_scale || 5 }, (_, i) => i + 1).map(rating => (
                    <div key={rating} className="flex items-center gap-4">
                      <span className="text-zinc-300 flex-1">{rating}점</span>
                      <input
                        type="number"
                        min="0"
                        value={results[question.id]?.ratings?.[rating.toString()] || 0}
                        onChange={(e) => handleRatingChange(question.id, rating.toString(), e.target.value)}
                        className="w-24 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <span className="text-zinc-500 text-sm">명</span>
                    </div>
                  ))}
                </div>
              )}
              
              {(question.type === 'short_text' || question.type === 'long_text') && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 mb-3">
                    <span className="text-zinc-400 text-sm">총 응답 수:</span>
                    <input
                      type="number"
                      min="0"
                      value={results[question.id]?.total_responses || 0}
                      onChange={(e) => setResults((prev: any) => ({
                        ...prev,
                        [question.id]: {
                          ...prev[question.id],
                          total_responses: Math.max(0, parseInt(e.target.value) || 0)
                        }
                      }))}
                      className="w-24 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <span className="text-zinc-500 text-sm">명</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-zinc-400 text-sm">샘플 응답 (최대 5개)</span>
                      {results[question.id]?.sample_responses?.length < 5 && (
                        <button
                          onClick={() => addSampleResponse(question.id)}
                          className="text-brand-400 hover:text-brand-300 text-sm"
                        >
                          + 추가
                        </button>
                      )}
                    </div>
                    
                    {results[question.id]?.sample_responses?.map((response: string, index: number) => (
                      <div key={index} className="flex items-start gap-2">
                        {question.type === 'short_text' ? (
                          <input
                            type="text"
                            value={response}
                            onChange={(e) => handleSampleResponseChange(question.id, index, e.target.value)}
                            className="flex-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder="샘플 응답 입력"
                          />
                        ) : (
                          <textarea
                            value={response}
                            onChange={(e) => handleSampleResponseChange(question.id, index, e.target.value)}
                            className="flex-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[80px]"
                            placeholder="샘플 응답 입력"
                          />
                        )}
                        <button
                          onClick={() => removeSampleResponse(question.id, index)}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-end gap-4">
          <Link
            href="/admin/contents"
            className="px-6 py-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            취소
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </main>
    </div>
  );
}