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

export default function VoteSection({ debateId, status, isAnonymous, allowComments, publicResults, voteOptions }: VoteSectionProps) {
  const [voteStats, setVoteStats] = useState<VoteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [opinion, setOpinion] = useState('');
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    fetchVoteStats();
    // 10초마다 자동 갱신 (투표 진행중일 때만)
    if (status === 'active') {
      const interval = setInterval(fetchVoteStats, 10000);
      return () => clearInterval(interval);
    }
  }, [debateId, status]);

  const fetchVoteStats = async () => {
    try {
      const response = await fetch(`/api/debates/${debateId}/stats`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setVoteStats(data);
      setHasVoted(data.has_voted);
    } catch (error) {
      console.error('Error fetching vote stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (optionId: string) => {
    try {
      setVoting(true);
      const voteData: VoteDto = {
        option_ids: [optionId],
        is_anonymous: true
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
      await fetchVoteStats(); // 결과 새로고침
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

  return (
    <>
      {/* 투표 결과 */}
      <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 mb-6 shadow-sm dark:shadow-none">
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-zinc-900 dark:text-zinc-100">현재 투표 현황</h2>
        
        {canViewResults ? (
          <div className="space-y-4">
            {voteStats.option_stats.map((option, index) => {
              const percentage = getOptionPercentage(option.count);
              const colorClasses = index === 0 
                ? "bg-gradient-to-r from-surbate to-brand-600" 
                : index === 1 
                ? "bg-red-500" 
                : `bg-gradient-to-r from-blue-400 to-blue-600`;
              const textColor = index === 0 
                ? "text-surbate" 
                : index === 1 
                ? "text-red-400" 
                : "text-blue-400";
              
              return (
                <div key={option.option_id}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm sm:text-base font-medium text-zinc-900 dark:text-zinc-100">{option.label}</span>
                    <span className={`text-sm sm:text-base ${textColor}`}>
                      {option.count}표 ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-zinc-800 rounded-full h-3 sm:h-4 overflow-hidden">
                    <div 
                      className={`${colorClasses} h-full transition-all duration-500`}
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
      {status === 'active' && !hasVoted && (
        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 mb-6 shadow-sm dark:shadow-none">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-zinc-900 dark:text-zinc-100">투표하기</h2>
          
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
          
          <div className={`${voteOptions.length > 2 ? 'grid grid-cols-2' : 'flex'} gap-4`}>
            {voteOptions.map((option, index) => {
              const buttonClasses = index === 0 
                ? "bg-gradient-to-r from-surbate to-brand-600 text-zinc-900 font-semibold hover:from-brand-400 hover:to-brand-600 shadow-sm hover:shadow-lg hover:shadow-surbate/20" 
                : index === 1 
                ? "bg-red-500 text-white hover:bg-red-600" 
                : "bg-blue-500 text-white hover:bg-blue-600";
              
              return (
                <button
                  key={option.id}
                  onClick={() => handleVote(option.id)}
                  disabled={voting}
                  className={`flex-1 px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base ${buttonClasses} rounded-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:transform-none disabled:shadow-none`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {hasVoted && (
        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 mb-6 shadow-sm dark:shadow-none">
          <p className="text-center text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
            이미 투표에 참여하셨습니다.
          </p>
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