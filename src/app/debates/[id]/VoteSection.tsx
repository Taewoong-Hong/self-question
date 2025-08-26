'use client';

import { useState, useEffect } from 'react';
import { debateApi } from '@/lib/api';
import { VoteDto } from '@/types/debate';

interface VoteSectionProps {
  debateId: string;
  status: 'active' | 'ended' | 'scheduled';
  isAnonymous: boolean;
  allowComments: boolean;
  publicResults: boolean;
  voteOptions: Array<{
    id: string;
    label: string;
    vote_count: number;
  }>;
  allowMultipleChoice: boolean;
}

interface VoteStats {
  option_stats: Array<{
    option_id: string;
    label: string;
    count: number;
  }>;
  total_votes: number;
  has_voted: boolean;
}

export default function VoteSection({ debateId, status, isAnonymous, allowComments, publicResults, voteOptions, allowMultipleChoice }: VoteSectionProps) {
  const [voteStats, setVoteStats] = useState<VoteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [opinion, setOpinion] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  useEffect(() => {
    // 초기 데이터 로드
    const loadInitialData = async () => {
      setLoading(true);
      try {
        // 먼저 메인 API에서 응답 여부 확인 (우선순위)
        const mainResponse = await fetch(`/api/debates/${debateId}`);
        const mainData = await mainResponse.json();
        const hasVotedFromMain = mainData.has_voted || false;
        setHasVoted(hasVotedFromMain);

        // 그 다음 stats 로드
        const statsResponse = await fetch(`/api/debates/${debateId}/stats`);
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setVoteStats(statsData);
          // stats API의 has_voted는 메인 API 값이 false일 때만 사용
          if (!hasVotedFromMain && statsData.has_voted) {
            setHasVoted(true);
          }
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();

    // 10초마다 자동 갱신 (투표 진행중일 때만)
    if (status === 'active') {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/debates/${debateId}/stats`);
          if (response.ok) {
            const data = await response.json();
            setVoteStats(data);
            // 자동 갱신 시에는 hasVoted를 변경하지 않음 (이미 설정된 값 유지)
          }
        } catch (error) {
          console.error('Error fetching vote stats:', error);
        }
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [debateId, status]);

  const handleOptionChange = (optionId: string, checked: boolean) => {
    if (allowMultipleChoice) {
      if (checked) {
        setSelectedOptions([...selectedOptions, optionId]);
      } else {
        setSelectedOptions(selectedOptions.filter(id => id !== optionId));
      }
    } else {
      setSelectedOptions([optionId]);
    }
  };

  const handleVote = async () => {
    if (selectedOptions.length === 0) {
      alert('투표할 항목을 선택해주세요.');
      return;
    }

    try {
      setVoting(true);
      const voteData: VoteDto = {
        option_ids: selectedOptions,
        is_anonymous: isAnonymous
      };
      
      await debateApi.vote(debateId, voteData);
      
      // 의견이 있으면 의견도 제출
      if (allowComments && opinion.trim()) {
        await debateApi.addOpinion(debateId, {
          content: opinion,
          author_nickname: '익명',
          is_anonymous: true
        });
      }
      
      setHasVoted(true);
      // 투표 후 stats만 새로고침 (hasVoted는 이미 true로 설정됨)
      try {
        const response = await fetch(`/api/debates/${debateId}/stats`);
        if (response.ok) {
          const data = await response.json();
          setVoteStats(data);
        }
      } catch (error) {
        console.error('Error refreshing stats after vote:', error);
      }
      alert('투표가 완료되었습니다!');
    } catch (error: any) {
      if (error.message?.includes('이미 투표')) {
        setHasVoted(true);
        alert('이미 투표에 참여하셨습니다.');
      } else {
        alert('투표 처리 중 오류가 발생했습니다.');
      }
    } finally {
      setVoting(false);
    }
  };

  if (loading) {
    return <VoteSkeleton />;
  }

  if (!voteStats) {
    return null;
  }

  // Calculate percentages for each option
  const getOptionPercentage = (optionCount: number) => {
    return voteStats.total_votes > 0 
      ? (optionCount / voteStats.total_votes) * 100 
      : 0;
  };

  // 결과 공개 여부 확인
  const canViewResults = publicResults || hasVoted;
  
  // 디버깅을 위한 로그
  console.log('VoteSection debug:', {
    publicResults,
    hasVoted,
    canViewResults,
    voteStats
  });

  return (
    <>
      {/* 투표 결과 */}
      <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 mb-6 shadow-sm dark:shadow-none">
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-zinc-900 dark:text-zinc-100">현재 투표 현황</h2>
        
        {canViewResults ? (
          <div className="space-y-4">
            {voteStats.option_stats.map((option) => {
              const percentage = getOptionPercentage(option.count);
              
              return (
                <div key={option.option_id}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm sm:text-base font-medium text-zinc-900 dark:text-zinc-100">{option.label}</span>
                    <span className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
                      {option.count}표 ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-zinc-800 rounded-full h-3 sm:h-4 overflow-hidden">
                    <div 
                      className="bg-surbate h-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            
            <div className="text-center text-xs sm:text-sm text-zinc-600 dark:text-zinc-500 mt-3 sm:mt-4">
              총 {voteStats.total_votes}명 참여
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mb-2">
              결과는 투표 후 확인할 수 있습니다
            </p>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-500">
              총 {voteStats.total_votes}명이 투표에 참여했습니다
            </p>
          </div>
        )}
      </div>

      {/* 투표 폼 */}
      {status === 'active' && (
        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 mb-6 shadow-sm dark:shadow-none">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-zinc-900 dark:text-zinc-100">투표하기</h2>
          
          {hasVoted ? (
            <>
              {/* 이미 투표한 경우 블러 처리된 선택지 */}
              <div className="space-y-2 mb-4 relative">
                <div className="absolute inset-0 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center">
                  <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 font-medium">
                    이미 투표에 참여하셨습니다
                  </p>
                </div>
                {voteOptions.map((option) => (
                  <div 
                    key={option.id}
                    className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-zinc-800/50 rounded-lg opacity-50"
                  >
                    <input
                      type={allowMultipleChoice ? "checkbox" : "radio"}
                      disabled
                      className="text-gray-400"
                    />
                    <span className="text-zinc-500 dark:text-zinc-600">{option.label}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {allowComments && (
                <div className="mb-4">
                  <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 sm:mb-2">
                    의견 (선택사항)
                  </label>
                  <textarea
                    value={opinion}
                    onChange={(e) => setOpinion(e.target.value)}
                    className="w-full px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    rows={3}
                    placeholder="투표와 함께 의견을 남겨주세요"
                  />
                </div>
              )}
              
              <div className="space-y-3">
                <div className="space-y-2">
                  {voteOptions.map((option) => (
                    <label 
                      key={option.id}
                      className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <input
                        type={allowMultipleChoice ? "checkbox" : "radio"}
                        name="vote-option"
                        value={option.id}
                        checked={selectedOptions.includes(option.id)}
                        onChange={(e) => handleOptionChange(option.id, e.target.checked)}
                        disabled={voting}
                        className="text-surbate focus:ring-surbate"
                      />
                      <span className="text-zinc-900 dark:text-zinc-100">{option.label}</span>
                    </label>
                  ))}
                </div>
                
                <button
                  onClick={handleVote}
                  disabled={voting || selectedOptions.length === 0}
                  className="w-full px-4 py-3 bg-surbate text-zinc-900 font-semibold rounded-lg hover:bg-brand-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {voting ? '투표 중...' : '투표 제출'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {status === 'ended' && (
        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 mb-6 shadow-sm dark:shadow-none">
          <p className="text-center text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
            이 투표는 종료되었습니다.
          </p>
        </div>
      )}

      {status === 'scheduled' && (
        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 mb-6 shadow-sm dark:shadow-none">
          <p className="text-center text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
            이 투표는 아직 시작되지 않았습니다.
          </p>
        </div>
      )}
    </>
  );
}

// 스켈레톤 UI로 CLS 방지
function VoteSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 mb-6 shadow-sm dark:shadow-none">
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-32 mb-4"></div>
        <div className="space-y-4">
          <div>
            <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-20 mb-2"></div>
            <div className="h-3 sm:h-4 bg-gray-200 dark:bg-zinc-800 rounded-full"></div>
          </div>
          <div>
            <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-20 mb-2"></div>
            <div className="h-3 sm:h-4 bg-gray-200 dark:bg-zinc-800 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}