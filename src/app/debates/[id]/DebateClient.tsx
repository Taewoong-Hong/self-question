'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import VoteSection from './VoteSection';
import OpinionSection from './OpinionSection';
import CommentSection from '@/components/CommentSection';

interface DebateProps {
  debate: {
    id: string;
    title: string;
    description?: string;
    author_nickname?: string;
    status: 'active' | 'ended' | 'scheduled';
    created_at: string;
    start_at?: string;
    end_at?: string;
    is_anonymous: boolean;
    allow_comments: boolean;
    tags?: string[];
    public_results?: boolean;
    vote_options: Array<{
      id: string;
      label: string;
      vote_count: number;
    }>;
    settings?: {
      allow_multiple_choice: boolean;
      show_results_before_end: boolean;
      allow_opinion: boolean;
      max_votes_per_ip: number;
    };
  };
}

export default function DebateClient({ debate }: DebateProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen max-w-4xl mx-auto">
      {/* 헤더 - 제목과 버튼을 한 행에 표시 */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-zinc-900 dark:text-zinc-100">{debate.title}</h1>
          {/* 우측 버튼들 */}
          <div className="flex gap-2 flex-shrink-0">
            <Link
              href="/debates"
              className="p-2 bg-gray-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-100 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-700 transition-colors"
              title="투표 목록으로"
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
              href={`/debates/${debate.id}/admin`}
              className="p-2 bg-gray-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-100 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-700 transition-colors"
              title="투표 관리"
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
            {debate.description && (
              <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base lg:text-lg whitespace-pre-wrap">{debate.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-xs sm:text-sm text-zinc-600 dark:text-zinc-500">
              <span>작성자: {debate.author_nickname || '익명'}</span>
              <span>•</span>
              <span>
                {debate.start_at ? debate.start_at.split('T')[0] : '시작일 미정'}
              </span>
              <span>•</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                debate.status === 'active' 
                  ? 'bg-surbate/10 text-surbate' 
                  : debate.status === 'ended'
                  ? 'bg-red-100/10 text-red-400'
                  : 'bg-yellow-100/10 text-yellow-400'
              }`}>
                {debate.status === 'active' ? '진행중' : debate.status === 'ended' ? '종료' : '예정'}
              </span>
            </div>
            {debate.tags && debate.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {debate.tags.map((tag, index) => (
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

      {/* 투표 섹션 - CSR로 실시간 업데이트 */}
      <VoteSection 
        debateId={debate.id} 
        status={debate.status}
        isAnonymous={debate.is_anonymous}
        allowComments={debate.allow_comments}
        publicResults={debate.public_results || false}
        voteOptions={debate.vote_options}
        allowMultipleChoice={debate.settings?.allow_multiple_choice || false}
      />

      {/* 의견 섹션 - CSR로 실시간 업데이트 */}
      {debate.allow_comments && (
        <OpinionSection debateId={debate.id} />
      )}

      {/* 댓글 섹션 */}
      <CommentSection contentType="debate" contentId={debate.id} />
    </div>
  );
}