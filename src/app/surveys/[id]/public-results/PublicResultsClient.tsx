'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  VictoryBar,
  VictoryChart,
  VictoryAxis,
  VictoryTheme,
  VictoryPie,
  VictoryLabel,
  VictoryContainer,
  VictoryTooltip,
  VictoryStack,
  VictoryArea
} from 'victory';

// 차트 색상 팔레트
const COLORS = ['#39FF14', '#2ECC0B', '#FFD700', '#FF6B6B', '#4ECDC4', '#95E1D3'];

interface PublicResultsClientProps {
  survey: any;
  results: any;
}

export default function PublicResultsClient({ survey, results }: PublicResultsClientProps) {
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');

  // Victory 차트용 데이터 준비 함수
  const prepareVictoryData = (questionStats: any) => {
    const data: any[] = [];
    
    Object.entries(questionStats.options || {}).forEach(([choiceId, choice]: any) => {
      if (choice.label && choice.count !== undefined) {
        data.push({
          x: choice.label,
          y: choice.count,
          label: `${choice.count}명`
        });
      }
    });
    
    return data;
  };

  // 파이 차트용 데이터 준비
  const preparePieData = (questionStats: any) => {
    const data: any[] = [];
    
    // 전체 응답 수 계산
    const totalCount = Object.values(questionStats.options || {}).reduce((sum: number, opt: any) => sum + (opt.count || 0), 0);
    
    Object.entries(questionStats.options || {}).forEach(([choiceId, choice]: any, index) => {
      if (choice.label && choice.count !== undefined && choice.count > 0) {
        const percentage = totalCount > 0 
          ? ((choice.count / totalCount) * 100).toFixed(1)
          : 0;
        data.push({
          x: `${choice.label} (${percentage}%)`,
          y: choice.count
        });
      }
    });
    
    return data;
  };

  // 평점 분포 데이터 준비
  const prepareRatingData = (ratingDistribution: any) => {
    return Object.entries(ratingDistribution || {}).map(([rating, count]) => ({
      x: `${rating}점`,
      y: count as number
    }));
  };

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="mb-6">
        <Link href={`/surveys/${survey.id}`} className="text-zinc-400 hover:text-zinc-100 text-sm mb-3 inline-block">
          ← 설문으로 돌아가기
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">{survey.title} - 결과 통계</h1>
            <div className="flex items-center gap-3 text-xs sm:text-sm text-zinc-500">
              <span>응답 {results.total_responses || 0}명</span>
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
        </div>
      </div>

      {/* 결과 표시 */}
      <div className="space-y-4">
        {survey.questions.map((question: any, index: number) => {
          // question.id와 question._id 둘 다 시도
          const questionId = question.id || question._id;
          const questionStats = results.question_stats?.[questionId];
          
          return (
            <div key={questionId} className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-medium mb-3">
                {index + 1}. {question.title}
              </h3>

              {/* 통계 데이터가 있는지 확인 */}
              {!questionStats ? (
                <p className="text-zinc-500 text-center py-8">아직 응답이 없습니다</p>
              ) : (
                <>
                  {/* 단일/다중 선택 결과 */}
                  {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
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

                      {/* Victory 차트 렌더링 */}
                      {prepareVictoryData(questionStats).length > 0 && (
                        <div className="w-full h-64 sm:h-80">
                          {chartType === 'bar' ? (
                            <VictoryChart
                            theme={VictoryTheme.material}
                            domainPadding={{ x: 20 }}
                            height={300}
                            width={600}
                            containerComponent={
                              <VictoryContainer 
                                responsive={true}
                                style={{ touchAction: "auto" }}
                              />
                            }
                          >
                            <VictoryAxis
                              style={{
                                axis: { stroke: "#a1a1aa" },
                                tickLabels: { fill: "#a1a1aa", fontSize: 12 },
                                grid: { stroke: "#3f3f46" }
                              }}
                              dependentAxis
                            />
                            <VictoryAxis
                              style={{
                                axis: { stroke: "#a1a1aa" },
                                tickLabels: { 
                                  fill: "#a1a1aa", 
                                  fontSize: 12,
                                  angle: -45,
                                  textAnchor: 'end'
                                }
                              }}
                            />
                            <VictoryBar
                              data={prepareVictoryData(questionStats)}
                              style={{
                                data: { fill: "#39FF14" }
                              }}
                              labelComponent={<VictoryTooltip />}
                            />
                          </VictoryChart>
                        ) : (
                          <div className="flex justify-center items-center h-full">
                            <VictoryPie
                              data={preparePieData(questionStats)}
                              width={400}
                              height={300}
                              innerRadius={0}
                              padAngle={3}
                              cornerRadius={3}
                              colorScale={COLORS}
                              labelRadius={({ innerRadius }: any) => 120 }
                              labelComponent={
                                <VictoryLabel
                                  style={{
                                    fontSize: 12,
                                    fill: "#e4e4e7"
                                  }}
                                />
                              }
                              containerComponent={
                                <VictoryContainer 
                                  responsive={true}
                                  style={{ touchAction: "auto" }}
                                />
                              }
                            />
                            </div>
                          )}
                        </div>
                      )}

                      {/* 기존 목록 형태도 유지 */}
                      <div className="space-y-3 mt-4">
                        {Object.entries(questionStats.options || {}).map(([choiceId, choice]: any) => {
                          // 전체 응답 수 계산 (각 선택지의 count 합계)
                          const totalCount = Object.values(questionStats.options || {}).reduce((sum: number, opt: any) => sum + (opt.count || 0), 0);
                          const percentage = totalCount > 0 
                            ? (choice.count / totalCount) * 100 
                            : 0;
                          return (
                            <div key={choiceId}>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm">{choice.label}</span>
                                <span className="text-sm text-zinc-400">
                                  {choice.count}명 ({percentage.toFixed(1)}%)
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

                  {/* 텍스트 응답 결과 (공개 페이지에서는 개수만) */}
                  {(question.type === 'short_text' || question.type === 'long_text') && (
                    <div className="text-center py-8 bg-zinc-800/50 rounded-lg">
                      <p className="text-2xl font-bold text-surbate mb-2">
                        {questionStats.text_response_count || 0}개
                      </p>
                      <p className="text-sm text-zinc-400">텍스트 응답</p>
                    </div>
                  )}

                  {/* 평점 결과 */}
                  {question.type === 'rating' && questionStats.average !== undefined && (
                    <>
                      <div className="text-center mb-6">
                        <div className="text-3xl sm:text-4xl font-bold text-surbate mb-2">
                          {questionStats.average.toFixed(1)}
                        </div>
                        <div className="flex justify-center gap-0.5 mb-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={`text-xl sm:text-2xl ${
                                star <= Math.round(questionStats.average)
                                  ? 'text-yellow-400'
                                  : 'text-zinc-600'
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        <p className="text-xs sm:text-sm text-zinc-500">
                          총 {questionStats.response_count || 0}명 응답
                        </p>
                      </div>

                      {/* 평점 분포 차트 */}
                      {questionStats.rating_distribution && (
                        <div className="w-full h-48 sm:h-64">
                          <VictoryChart
                            theme={VictoryTheme.material}
                            domainPadding={{ x: 40 }}
                            height={250}
                            width={500}
                            containerComponent={
                              <VictoryContainer 
                                responsive={true}
                                style={{ touchAction: "auto" }}
                              />
                            }
                          >
                            <VictoryAxis
                              style={{
                                axis: { stroke: "#a1a1aa" },
                                tickLabels: { fill: "#a1a1aa", fontSize: 12 },
                                grid: { stroke: "#3f3f46" }
                              }}
                              dependentAxis
                            />
                            <VictoryAxis
                              style={{
                                axis: { stroke: "#a1a1aa" },
                                tickLabels: { fill: "#a1a1aa", fontSize: 12 }
                              }}
                            />
                            <VictoryBar
                              data={prepareRatingData(questionStats.rating_distribution)}
                              style={{
                                data: { fill: "#FFD700" }
                              }}
                              barRatio={0.8}
                            />
                          </VictoryChart>
                        </div>
                      )}
                    </>
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