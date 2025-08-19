'use client';

import { useState, useEffect } from 'react';

interface SurveyResultsProps {
  surveyId: string;
}

interface QuestionResult {
  id: string;
  text: string;
  type: string;
  results: any;
  totalResponses: number;
}

export default function SurveyResults({ surveyId }: SurveyResultsProps) {
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [totalResponses, setTotalResponses] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
    // 30초마다 결과 갱신
    const interval = setInterval(fetchResults, 30000);
    return () => clearInterval(interval);
  }, [surveyId]);

  const fetchResults = async () => {
    try {
      const response = await fetch(`/api/surveys/${surveyId}/results`);
      if (!response.ok) throw new Error('Failed to fetch results');
      const data = await response.json();
      setResults(data.questions || []);
      setTotalResponses(data.totalResponses || 0);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ResultsSkeleton />;
  }

  const renderQuestionResults = (question: QuestionResult) => {
    switch (question.type) {
      case 'single_choice':
      case 'multiple_choice':
        return (
          <div className="space-y-2">
            {Object.entries(question.results).map(([option, count]) => {
              const percentage = totalResponses > 0 
                ? ((count as number) / totalResponses) * 100 
                : 0;
              
              return (
                <div key={option}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-300">{option}</span>
                    <span className="text-zinc-500">
                      {count as number}명 ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-surbate to-brand-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        );

      case 'rating':
        const ratings = question.results as Record<string, number>;
        const totalRatings = Object.values(ratings).reduce((sum, count) => sum + count, 0);
        const avgRating = totalRatings > 0 
          ? Object.entries(ratings).reduce((sum, [rating, count]) => 
              sum + (parseInt(rating) * count), 0) / totalRatings
          : 0;

        return (
          <div>
            <div className="text-center mb-4">
              <div className="text-3xl font-bold text-surbate">{avgRating.toFixed(1)}</div>
              <div className="text-sm text-zinc-500">평균 평점</div>
            </div>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = ratings[rating] || 0;
                const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
                
                return (
                  <div key={rating} className="flex items-center gap-3">
                    <span className="text-sm text-zinc-400 w-8">{rating}점</span>
                    <div className="flex-1 bg-zinc-800 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-zinc-500 w-16 text-right">
                      {count}명
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'text':
      case 'textarea':
        const textResponses = question.results as string[];
        return (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {textResponses.slice(0, 5).map((response, index) => (
              <div key={index} className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-sm text-zinc-300">{response}</p>
              </div>
            ))}
            {textResponses.length > 5 && (
              <p className="text-sm text-zinc-500 text-center">
                외 {textResponses.length - 5}개의 응답이 더 있습니다.
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-4 sm:p-6">
      <div className="mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-zinc-100 mb-2">설문 결과</h2>
        <p className="text-sm text-zinc-400">총 {totalResponses}명이 응답했습니다</p>
        <div className="mt-4">
          <a
            href={`/surveys/${surveyId}/public-results`}
            className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <span>결과 통계 보기</span>
            <span className="text-zinc-400">→</span>
          </a>
        </div>
      </div>

      <div className="space-y-8">
        {results.map((question) => (
          <div key={question.id}>
            <h3 className="text-base font-medium text-zinc-100 mb-3">{question.text}</h3>
            {renderQuestionResults(question)}
          </div>
        ))}
      </div>
    </div>
  );
}

// 스켈레톤 UI
function ResultsSkeleton() {
  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-4 sm:p-6">
      <div className="animate-pulse">
        <div className="h-6 bg-zinc-800 rounded w-32 mb-2"></div>
        <div className="h-4 bg-zinc-800 rounded w-48 mb-6"></div>
        
        <div className="space-y-8">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-5 bg-zinc-800 rounded w-64 mb-3"></div>
              <div className="space-y-2">
                <div className="h-2 bg-zinc-800 rounded-full"></div>
                <div className="h-2 bg-zinc-800 rounded-full w-3/4"></div>
                <div className="h-2 bg-zinc-800 rounded-full w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}