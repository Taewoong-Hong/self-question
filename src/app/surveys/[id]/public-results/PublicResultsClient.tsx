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

// 차트 색상 팔레트 (사용자 지정 색상 - 역순)
const COLORS = [
  '#186124', // 매우 진한 녹색
  '#208230', // 진한 녹색
  '#28A33D', // 중간 녹색
  '#32CC4C', // 녹색
  '#5BD670', // 밝은 녹색
  '#84E093', // 중간 연녹색
  '#A5E8B0', // 연녹색
  '#C5F0CD', // 연한 녹색
  '#DEF6E2', // 매우 연한 녹색
  '#39FF14'  // 브랜드 컬러 (최후의 보루)
];

interface PublicResultsClientProps {
  survey: any;
  results: any;
}

export default function PublicResultsClient({ survey, results }: PublicResultsClientProps) {
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  
  const toggleExpanded = (questionId: string) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };
  

  // Victory 차트용 데이터 준비 함수
  const prepareVictoryData = (questionStats: any) => {
    const data: any[] = [];
    let index = 0;
    const totalOptions = Object.keys(questionStats.options || {}).length;
    
    Object.entries(questionStats.options || {}).forEach(([choiceId, choice]: any) => {
      // choice가 객체가 아닌 경우 처리
      if (typeof choice === 'object' && choice.label && typeof choice.count === 'number' && !isNaN(choice.count)) {
        data.push({
          x: totalOptions <= 3 ? choice.label : `${index + 1}`, // 3개 이하면 레이블, 아니면 번호
          y: choice.count,
          label: `${choice.count}명`,
          fill: COLORS[index % COLORS.length],
          originalLabel: choice.label
        });
        index++;
      }
    });
    
    return data;
  };

  // 파이 차트용 데이터 준비
  const preparePieData = (questionStats: any) => {
    const data: any[] = [];
    
    // 전체 응답 수 계산
    const totalCount = Object.values(questionStats.options || {})
      .filter((opt: any) => typeof opt === 'object' && typeof opt.count === 'number')
      .reduce((sum: number, opt: any) => sum + (opt.count || 0), 0);
    
    Object.entries(questionStats.options || {}).forEach(([choiceId, choice]: any, index) => {
      if (typeof choice === 'object' && choice.label && typeof choice.count === 'number' && !isNaN(choice.count) && choice.count > 0) {
        const percentage = totalCount > 0 
          ? ((choice.count / totalCount) * 100).toFixed(1)
          : '0';
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
    <div className="min-h-screen max-w-6xl mx-auto px-4 py-8 relative">
      {/* 우측 상단 뒤로가기 버튼 */}
      <Link
        href={`/surveys/${survey.id}`}
        className="absolute right-4 top-8 p-2 bg-gray-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-100 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-700 transition-colors"
        title="설문으로 돌아가기"
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
      
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pr-12">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 text-zinc-900 dark:text-zinc-100">{survey.title} - 결과 통계</h1>
            <div className="flex items-center gap-3 text-xs sm:text-sm text-zinc-600 dark:text-zinc-500">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {survey.questions.map((question: any, index: number) => {
          // question.id와 question._id 둘 다 시도
          const questionId = question.id || question._id;
          const questionStats = results.question_stats?.[questionId];
          
          
          return (
            <div key={questionId} className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm dark:shadow-none overflow-hidden">
              <h3 className="text-sm sm:text-base font-medium mb-2 text-zinc-900 dark:text-zinc-100">
                {index + 1}. {question.title}
              </h3>

              {/* 통계 데이터가 있는지 확인 */}
              {!questionStats ? (
                <p className="text-zinc-600 dark:text-zinc-500 text-center py-8">아직 응답이 없습니다</p>
              ) : (
                <>
                  {/* 단일/다중 선택 결과 */}
                  {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
                    <div className="space-y-3">
                      {/* 차트 섹션 */}
                      <div>
                        {/* 차트 유형 선택 버튼 */}
                        <div className="flex gap-1.5 mb-2">
                          <button
                            onClick={() => setChartType('bar')}
                            className={`px-2 py-0.5 rounded text-xs transition-colors ${
                              chartType === 'bar' 
                                ? 'bg-gray-300 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100' 
                                : 'bg-gray-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400 hover:bg-gray-300 dark:hover:bg-zinc-700'
                            }`}
                          >
                            막대
                          </button>
                          <button
                            onClick={() => setChartType('pie')}
                            className={`px-2 py-0.5 rounded text-xs transition-colors ${
                              chartType === 'pie' 
                                ? 'bg-gray-300 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100' 
                                : 'bg-gray-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400 hover:bg-gray-300 dark:hover:bg-zinc-700'
                            }`}
                          >
                            원형
                          </button>
                        </div>

                        {/* Victory 차트 렌더링 */}
                        {prepareVictoryData(questionStats).length > 0 && (
                          <div className="overflow-x-auto">
                            <div className="w-[280px] h-[180px] sm:w-[320px] sm:h-[200px] lg:w-[380px] lg:h-[240px] mx-auto">
                          {chartType === 'bar' ? (
                            <>
                              {/* 모바일 차트 */}
                              <div className="block sm:hidden">
                                <VictoryChart
                                  theme={VictoryTheme.material}
                                  domainPadding={{ x: prepareVictoryData(questionStats).length <= 2 ? 60 : 30 }}
                                  padding={{ left: 45, right: 25, top: 20, bottom: 25 }}
                                  height={180}
                                  width={280}
                                  containerComponent={
                                    <VictoryContainer 
                                      responsive={false}
                                      style={{ touchAction: "auto" }}
                                    />
                                  }
                                >
                                  <VictoryAxis
                                    style={{
                                      axis: { stroke: "#a1a1aa" },
                                      tickLabels: { fill: "#a1a1aa", fontSize: 10 },
                                      grid: { stroke: "#3f3f46" }
                                    }}
                                    dependentAxis
                                  />
                                  <VictoryAxis
                                    style={{
                                      axis: { stroke: "#a1a1aa" },
                                      tickLabels: { 
                                        fill: prepareVictoryData(questionStats).length <= 3 ? "#a1a1aa" : "transparent",
                                        fontSize: 10
                                      }
                                    }}
                                  />
                                  <VictoryBar
                                    data={prepareVictoryData(questionStats)}
                                    style={{
                                      data: { fill: ({ datum }) => datum.fill }
                                    }}
                                    barRatio={prepareVictoryData(questionStats).length <= 2 ? 0.5 : 0.8}
                                    labelComponent={<VictoryTooltip />}
                                  />
                                </VictoryChart>
                              </div>
                              
                              {/* 태블릿 차트 */}
                              <div className="hidden sm:block lg:hidden">
                                <VictoryChart
                                  theme={VictoryTheme.material}
                                  domainPadding={{ x: prepareVictoryData(questionStats).length <= 2 ? 70 : 35 }}
                                  padding={{ left: 50, right: 30, top: 20, bottom: 25 }}
                                  height={200}
                                  width={320}
                                  containerComponent={
                                    <VictoryContainer 
                                      responsive={false}
                                      style={{ touchAction: "auto" }}
                                    />
                                  }
                                >
                                  <VictoryAxis
                                    style={{
                                      axis: { stroke: "#a1a1aa" },
                                      tickLabels: { fill: "#a1a1aa", fontSize: 10 },
                                      grid: { stroke: "#3f3f46" }
                                    }}
                                    dependentAxis
                                  />
                                  <VictoryAxis
                                    style={{
                                      axis: { stroke: "#a1a1aa" },
                                      tickLabels: { 
                                        fill: prepareVictoryData(questionStats).length <= 3 ? "#a1a1aa" : "transparent",
                                        fontSize: 10
                                      }
                                    }}
                                  />
                                  <VictoryBar
                                    data={prepareVictoryData(questionStats)}
                                    style={{
                                      data: { fill: ({ datum }) => datum.fill }
                                    }}
                                    barRatio={prepareVictoryData(questionStats).length <= 2 ? 0.5 : 0.8}
                                    labelComponent={<VictoryTooltip />}
                                  />
                                </VictoryChart>
                              </div>
                              
                              {/* 데스크탑 차트 */}
                              <div className="hidden lg:block">
                                <VictoryChart
                                  theme={VictoryTheme.material}
                                  domainPadding={{ x: prepareVictoryData(questionStats).length <= 2 ? 80 : 40 }}
                                  padding={{ left: 55, right: 35, top: 25, bottom: 30 }}
                                  height={240}
                                  width={380}
                                  containerComponent={
                                    <VictoryContainer 
                                      responsive={false}
                                      style={{ touchAction: "auto" }}
                                    />
                                  }
                                >
                                  <VictoryAxis
                                    style={{
                                      axis: { stroke: "#a1a1aa" },
                                      tickLabels: { fill: "#a1a1aa", fontSize: 11 },
                                      grid: { stroke: "#3f3f46" }
                                    }}
                                    dependentAxis
                                  />
                                  <VictoryAxis
                                    style={{
                                      axis: { stroke: "#a1a1aa" },
                                      tickLabels: { 
                                        fill: prepareVictoryData(questionStats).length <= 3 ? "#a1a1aa" : "transparent",
                                        fontSize: 11
                                      }
                                    }}
                                  />
                                  <VictoryBar
                                    data={prepareVictoryData(questionStats)}
                                    style={{
                                      data: { fill: ({ datum }) => datum.fill }
                                    }}
                                    barRatio={prepareVictoryData(questionStats).length <= 2 ? 0.5 : 0.8}
                                    labelComponent={<VictoryTooltip />}
                                  />
                                </VictoryChart>
                              </div>
                            </>
                        ) : (
                          <>
                            {/* 모바일 파이 차트 */}
                            <div className="block sm:hidden flex justify-center items-center h-full">
                              <VictoryPie
                                data={preparePieData(questionStats)}
                                width={280}
                                height={180}
                                innerRadius={0}
                                padAngle={3}
                                cornerRadius={3}
                                colorScale={COLORS}
                                labelRadius={({ innerRadius }: any) => 85 }
                                labelComponent={
                                  <VictoryLabel
                                    style={{
                                      fontSize: 10,
                                      fill: "#e4e4e7"
                                    }}
                                  />
                                }
                                containerComponent={
                                  <VictoryContainer 
                                    responsive={false}
                                    style={{ touchAction: "auto" }}
                                  />
                                }
                              />
                            </div>
                            
                            {/* 태블릿 파이 차트 */}
                            <div className="hidden sm:block lg:hidden flex justify-center items-center h-full">
                              <VictoryPie
                                data={preparePieData(questionStats)}
                                width={320}
                                height={200}
                                innerRadius={0}
                                padAngle={3}
                                cornerRadius={3}
                                colorScale={COLORS}
                                labelRadius={({ innerRadius }: any) => 95 }
                                labelComponent={
                                  <VictoryLabel
                                    style={{
                                      fontSize: 11,
                                      fill: "#e4e4e7"
                                    }}
                                  />
                                }
                                containerComponent={
                                  <VictoryContainer 
                                    responsive={false}
                                    style={{ touchAction: "auto" }}
                                  />
                                }
                              />
                            </div>
                            
                            {/* 데스크탑 파이 차트 */}
                            <div className="hidden lg:block flex justify-center items-center h-full">
                              <VictoryPie
                                data={preparePieData(questionStats)}
                                width={380}
                                height={240}
                                innerRadius={0}
                                padAngle={3}
                                cornerRadius={3}
                                colorScale={COLORS}
                                labelRadius={({ innerRadius }: any) => 110 }
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
                                    responsive={false}
                                    style={{ touchAction: "auto" }}
                                  />
                                }
                              />
                            </div>
                          </>
                          )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* 범례 및 프로그레스 바 섹션 */}
                      <div>
                        {/* 차트 범례 - 선택지가 4개 이상일 때만 표시 */}
                        {prepareVictoryData(questionStats).length > 3 && (
                          <div className="mb-2">
                            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-400 mb-1">선택지:</p>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-1">
                            {prepareVictoryData(questionStats).map((item, index) => (
                              <div key={index} className="flex items-center gap-1.5 text-xs">
                                <div 
                                  className="w-3 h-3 rounded" 
                                  style={{ backgroundColor: item.fill }}
                                />
                                <span className="text-zinc-700 dark:text-zinc-300">
                                  {item.x}. {item.originalLabel}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 기존 목록 형태도 유지 */}
                      <div className="space-y-2 mt-2">
                        {Object.entries(questionStats.options || {}).map(([choiceId, choice]: any, index) => {
                          // choice가 객체인지 확인
                          if (typeof choice !== 'object' || !choice.label) return null;
                          
                          // 전체 응답 수 계산 (각 선택지의 count 합계)
                          const totalCount = Object.values(questionStats.options || {})
                            .filter((opt: any) => typeof opt === 'object' && typeof opt.count === 'number')
                            .reduce((sum: number, opt: any) => sum + (opt.count || 0), 0);
                          const percentage = totalCount > 0 && typeof choice.count === 'number'
                            ? (choice.count / totalCount) * 100 
                            : 0;
                          
                          // 차트 색상과 동일한 색상 사용
                          const barColor = COLORS[index % COLORS.length];
                          
                          return (
                            <div key={choiceId}>
                              <div className="flex justify-between items-start gap-2 mb-1">
                                <span className="text-sm text-zinc-700 dark:text-zinc-300 break-words flex-1">{choice.label}</span>
                                <span className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap flex-shrink-0">
                                  {choice.count || 0}명 ({percentage.toFixed(1)}%)
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                                <div 
                                  className="h-full transition-all duration-500"
                                  style={{ 
                                    width: `${percentage}%`,
                                    backgroundColor: barColor
                                  }}
                                />
                              </div>
                            </div>
                          );
                        }).filter(Boolean)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 텍스트 응답 결과 */}
                  {(question.type === 'short_text' || question.type === 'long_text') && (
                    <div>
                      <div className="text-center py-6 bg-zinc-800/50 rounded-lg">
                        <p className="text-xl font-bold text-surbate mb-1">
                          {questionStats.text_response_count || 0}개
                        </p>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">텍스트 응답</p>
                        
                        {/* 자세히 버튼 - 응답이 있을 때만 표시 */}
                        {questionStats.text_responses && questionStats.text_responses.length > 0 && (
                          <button
                            onClick={() => toggleExpanded(questionId)}
                            className="mt-3 p-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                            title={expandedQuestions.has(questionId) ? '접기' : '펼치기'}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                              className={`w-5 h-5 transition-transform ${
                                expandedQuestions.has(questionId) ? 'rotate-180' : ''
                              }`}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                            </svg>
                          </button>
                        )}
                      </div>
                      
                      {/* 응답 목록 */}
                      {expandedQuestions.has(questionId) && questionStats.text_responses && (
                        <div className="mt-3 space-y-2 max-h-96 overflow-y-auto">
                          {questionStats.text_responses.map((response: string, index: number) => (
                            <div key={index} className="p-3 bg-gray-100 dark:bg-zinc-800/30 rounded-lg text-sm">
                              <p className="text-zinc-800 dark:text-zinc-300 break-words">{response}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 평점 결과 */}
                  {question.type === 'rating' && questionStats.average !== undefined && (
                    <>
                      <div className="text-center mb-4">
                        <div className="text-2xl font-bold text-surbate mb-1">
                          {questionStats.average.toFixed(1)}
                        </div>
                        <div className="flex justify-center gap-0.5 mb-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={`text-lg ${
                                star <= Math.round(questionStats.average)
                                  ? 'text-surbate'
                                  : 'text-zinc-600'
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-500">
                          총 {questionStats.response_count || 0}명 응답
                        </p>
                      </div>

                      {/* 평점 분포 차트 */}
                      {questionStats.rating_distribution && (
                        <div className="overflow-x-auto">
                          <div className="w-[280px] h-[160px] sm:w-[320px] sm:h-[180px] lg:w-[380px] lg:h-[220px] mx-auto">
                          {/* 모바일 평점 차트 */}
                          <div className="block sm:hidden">
                            <VictoryChart
                              theme={VictoryTheme.material}
                              domainPadding={{ x: 30 }}
                              padding={{ left: 45, right: 25, top: 20, bottom: 25 }}
                              height={160}
                              width={280}
                              containerComponent={
                                <VictoryContainer 
                                  responsive={false}
                                  style={{ touchAction: "auto" }}
                                />
                              }
                            >
                              <VictoryAxis
                                style={{
                                  axis: { stroke: "#a1a1aa" },
                                  tickLabels: { fill: "#a1a1aa", fontSize: 10 },
                                  grid: { stroke: "#3f3f46" }
                                }}
                                dependentAxis
                              />
                              <VictoryAxis
                                style={{
                                  axis: { stroke: "#a1a1aa" },
                                  tickLabels: { fill: "#a1a1aa", fontSize: 10 }
                                }}
                              />
                              <VictoryBar
                                data={prepareRatingData(questionStats.rating_distribution)}
                                style={{
                                  data: { fill: "#39FF14" }
                                }}
                                barRatio={0.8}
                              />
                            </VictoryChart>
                          </div>
                          
                          {/* 태블릿 평점 차트 */}
                          <div className="hidden sm:block lg:hidden">
                            <VictoryChart
                              theme={VictoryTheme.material}
                              domainPadding={{ x: 35 }}
                              padding={{ left: 50, right: 30, top: 20, bottom: 25 }}
                              height={180}
                              width={320}
                              containerComponent={
                                <VictoryContainer 
                                  responsive={false}
                                  style={{ touchAction: "auto" }}
                                />
                              }
                            >
                              <VictoryAxis
                                style={{
                                  axis: { stroke: "#a1a1aa" },
                                  tickLabels: { fill: "#a1a1aa", fontSize: 10 },
                                  grid: { stroke: "#3f3f46" }
                                }}
                                dependentAxis
                              />
                              <VictoryAxis
                                style={{
                                  axis: { stroke: "#a1a1aa" },
                                  tickLabels: { fill: "#a1a1aa", fontSize: 10 }
                                }}
                              />
                              <VictoryBar
                                data={prepareRatingData(questionStats.rating_distribution)}
                                style={{
                                  data: { fill: "#39FF14" }
                                }}
                                barRatio={0.8}
                              />
                            </VictoryChart>
                          </div>
                          
                          {/* 데스크탑 평점 차트 */}
                          <div className="hidden lg:block">
                            <VictoryChart
                              theme={VictoryTheme.material}
                              domainPadding={{ x: 40 }}
                              padding={{ left: 55, right: 35, top: 25, bottom: 30 }}
                              height={220}
                              width={380}
                              containerComponent={
                                <VictoryContainer 
                                  responsive={false}
                                  style={{ touchAction: "auto" }}
                                />
                              }
                            >
                              <VictoryAxis
                                style={{
                                  axis: { stroke: "#a1a1aa" },
                                  tickLabels: { fill: "#a1a1aa", fontSize: 11 },
                                  grid: { stroke: "#3f3f46" }
                                }}
                                dependentAxis
                              />
                              <VictoryAxis
                                style={{
                                  axis: { stroke: "#a1a1aa" },
                                  tickLabels: { fill: "#a1a1aa", fontSize: 11 }
                                }}
                              />
                              <VictoryBar
                                data={prepareRatingData(questionStats.rating_distribution)}
                                style={{
                                  data: { fill: "#39FF14" }
                                }}
                                barRatio={0.8}
                              />
                            </VictoryChart>
                          </div>
                          </div>
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