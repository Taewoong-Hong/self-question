'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { surveyApi } from '@/lib/api';
import { Survey } from '@/types/survey';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// 차트 색상 팔레트
const COLORS = ['#39FF14', '#2ECC0B', '#FFD700', '#FF6B6B', '#4ECDC4', '#95E1D3'];

export default function SurveyResultsPage() {
  const params = useParams();
  const surveyId = params.id as string;
  
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');

  useEffect(() => {
    fetchResults();
  }, [surveyId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const [surveyResponse, resultsData] = await Promise.all([
        surveyApi.get(surveyId),
        surveyApi.getResults(surveyId)
      ]);
      setSurvey(surveyResponse.survey);
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
      // localStorage에서 토큰 확인
      const adminToken = localStorage.getItem(`survey_admin_${surveyId}`);
      if (!adminToken) {
        alert('관리자 인증이 필요합니다. 작성자 페이지에서 먼저 로그인해주세요.');
        return;
      }
      
      await surveyApi.exportCSV(surveyId, adminToken);
      alert('CSV 다운로드가 시작됩니다.');
    } catch (error) {
      alert('CSV 다운로드에 실패했습니다.');
    }
  };

  // 차트 데이터 준비 함수
  const prepareChartData = (question: any, questionResults: any) => {
    if (!question.properties?.choices || !questionResults?.options) return [];
    
    return question.properties.choices.map((choice: any) => ({
      name: choice.label,
      value: questionResults.options[choice.id] || 0,
      percentage: questionResults.response_count > 0 
        ? ((questionResults.options[choice.id] || 0) / questionResults.response_count * 100).toFixed(1)
        : 0
    }));
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
      <div className="mb-6">
        <Link href={`/surveys/${surveyId}`} className="text-zinc-400 hover:text-zinc-100 text-sm mb-3 inline-block">
          ← 설문으로 돌아가기
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">{survey.title} - 결과</h1>
            <div className="flex items-center gap-3 text-xs sm:text-sm text-zinc-500">
              <span>응답 {survey.stats?.response_count || 0}명</span>
              {survey.created_at && (
                <>
                  <span>•</span>
                  <span>
                    {formatDistanceToNow(new Date(survey.created_at), { 
                      addSuffix: true, 
                      locale: ko 
                    })}
                  </span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm bg-gradient-to-r from-surbate to-brand-600 text-zinc-900 font-semibold rounded-lg hover:from-brand-400 hover:to-brand-600 shadow-sm hover:shadow-lg hover:shadow-surbate/20 transform hover:-translate-y-0.5 transition-all duration-200"
            >
              <span className="hidden sm:inline">CSV 다운로드</span>
              <span className="sm:hidden">CSV</span>
            </button>
            <Link
              href={`/surveys/${surveyId}/admin`}
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              <span className="hidden sm:inline">작성자 페이지</span>
              <span className="sm:hidden">관리</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 결과 표시 */}
      <div className="space-y-4">
        {survey.questions.map((question, index) => {
          const questionResults = results.question_stats?.[question.id];
          
          return (
            <div key={question.id} className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-medium mb-3">
                {index + 1}. {question.title}
              </h3>

              {/* 응답이 없는 경우 */}
              {!questionResults || questionResults.response_count === 0 ? (
                <p className="text-zinc-500 text-center py-8">아직 응답이 없습니다</p>
              ) : (
                <>
              {/* 단일/다중 선택 결과 */}
              {(question.type === 'single_choice' || question.type === 'multiple_choice') && questionResults?.options && (
                <>
                  {/* 차트 유형 선택 버튼 */}
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setChartType('bar')}
                      className={`px-2.5 py-1 rounded-lg text-xs sm:text-sm transition-colors ${
                        chartType === 'bar' 
                          ? 'bg-zinc-700 text-zinc-100' 
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      막대 차트
                    </button>
                    <button
                      onClick={() => setChartType('pie')}
                      className={`px-2.5 py-1 rounded-lg text-xs sm:text-sm transition-colors ${
                        chartType === 'pie' 
                          ? 'bg-zinc-700 text-zinc-100' 
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      원형 차트
                    </button>
                  </div>

                  {/* 차트 렌더링 */}
                  <div className="h-48 sm:h-64 mb-3">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'bar' ? (
                        <BarChart data={prepareChartData(question, questionResults)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                          <XAxis dataKey="name" stroke="#a1a1aa" />
                          <YAxis stroke="#a1a1aa" />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                            labelStyle={{ color: '#e4e4e7' }}
                          />
                          <Bar dataKey="value" fill="#39FF14" />
                        </BarChart>
                      ) : (
                        <PieChart>
                          <Pie
                            data={prepareChartData(question, questionResults)}
                            cx="50%"
                            cy="50%"
                            innerRadius={0}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percentage }) => `${name} (${percentage}%)`}
                          >
                            {prepareChartData(question, questionResults).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                            labelStyle={{ color: '#e4e4e7' }}
                          />
                        </PieChart>
                      )}
                    </ResponsiveContainer>
                  </div>

                  {/* 기존 목록 형태도 유지 */}
                  <div className="space-y-3">
                    {question.properties?.choices?.map((choice) => {
                      const count = questionResults.options[choice.id] || 0;
                      const percentage = questionResults.response_count > 0 ? (count / questionResults.response_count) * 100 : 0;
                      return (
                        <div key={choice.id}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm">{choice.label}</span>
                            <span className="text-sm text-zinc-400">
                              {count}명 ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-surbate to-brand-600 h-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
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
              {question.type === 'rating' && questionResults?.average !== undefined && (
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-surbate mb-2">
                    {questionResults.average.toFixed(1)}
                  </div>
                  <div className="flex justify-center gap-0.5 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`text-xl sm:text-2xl ${
                          star <= Math.round(questionResults.average)
                            ? 'text-yellow-400'
                            : 'text-zinc-600'
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-500">
                    총 {questionResults.response_count || 0}명 응답
                  </p>
                </div>
              )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}