'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import VoteSection from './VoteSection';
import OpinionSection from './OpinionSection';

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
  };
}

export default function DebateClient({ debate }: DebateProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen max-w-4xl mx-auto">
      {/* 헤더 - SSG로 렌더링된 정적 정보 */}
      <div className="mb-6">
        <Link href="/debates" className="text-zinc-400 hover:text-zinc-100 text-sm mb-3 inline-block">
          ← 투표 목록으로
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">{debate.title}</h1>
            {debate.description && (
              <p className="text-zinc-400 text-sm sm:text-base lg:text-lg">{debate.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-xs sm:text-sm text-zinc-500">
              <span>작성자: {debate.author_nickname || '익명'}</span>
              <span>•</span>
              <span>
                {formatDistanceToNow(new Date(debate.created_at), { 
                  addSuffix: true, 
                  locale: ko 
                })}
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
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-400"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          <Link
            href={`/debates/${debate.id}/admin`}
            className="self-start p-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors"
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

      {/* 투표 섹션 - CSR로 실시간 업데이트 */}
      <VoteSection 
        debateId={debate.id} 
        status={debate.status}
        isAnonymous={debate.is_anonymous}
        allowComments={debate.allow_comments}
      />

      {/* 의견 섹션 - CSR로 실시간 업데이트 */}
      {debate.allow_comments && (
        <OpinionSection debateId={debate.id} />
      )}
    </div>
  );
}