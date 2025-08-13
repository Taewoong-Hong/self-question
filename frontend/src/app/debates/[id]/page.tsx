'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { debateApi } from '@/lib/api';
import { Debate, VoteDto, OpinionDto } from '@/types/debate';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function DebateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const debateId = params.id as string;
  
  const [debate, setDebate] = useState<Debate | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [voterName, setVoterName] = useState('');
  const [opinion, setOpinion] = useState('');

  useEffect(() => {
    fetchDebate();
  }, [debateId]);

  const fetchDebate = async () => {
    try {
      setLoading(true);
      const data = await debateApi.get(debateId);
      setDebate(data);
      // IP 중복 체크는 서버에서 처리
    } catch (error) {
      console.error('투표 조회 실패:', error);
      alert('투표를 불러올 수 없습니다.');
      router.push('/debates');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (choice: 'agree' | 'disagree') => {
    if (!debate) return;

    if (debate.type === 'named' && !voterName.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }

    try {
      setVoting(true);
      const voteData: VoteDto = {
        choice,
        voter_name: debate.type === 'named' ? voterName : undefined
      };
      
      await debateApi.vote(debateId, voteData);
      
      // 의견이 있으면 의견도 제출
      if (debate.allow_comments && opinion.trim()) {
        const opinionData: OpinionDto = {
          content: opinion,
          author_name: debate.type === 'named' ? voterName : undefined
        };
        await debateApi.addOpinion(debateId, opinionData);
      }
      
      setHasVoted(true);
      await fetchDebate(); // 결과 새로고침
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-100"></div>
      </div>
    );
  }

  if (!debate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-400">투표를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const totalVotes = debate.agreeCount + debate.disagreeCount;
  const agreePercentage = totalVotes > 0 ? (debate.agreeCount / totalVotes) * 100 : 0;
  const disagreePercentage = totalVotes > 0 ? (debate.disagreeCount / totalVotes) * 100 : 0;

  return (
    <div className="min-h-screen max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="mb-8">
        <Link href="/debates" className="text-zinc-400 hover:text-zinc-100 mb-4 inline-block">
          ← 투표 목록으로
        </Link>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{debate.title}</h1>
            {debate.description && (
              <p className="text-zinc-400 text-lg">{debate.description}</p>
            )}
            <div className="flex items-center gap-4 mt-4 text-sm text-zinc-500">
              <span>작성자: {debate.creator_nickname || '익명'}</span>
              <span>•</span>
              <span>
                {formatDistanceToNow(new Date(debate.created_at), { 
                  addSuffix: true, 
                  locale: ko 
                })}
              </span>
              <span>•</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                debate.status === 'open' 
                  ? 'bg-emerald-100/10 text-emerald-400' 
                  : debate.status === 'closed'
                  ? 'bg-red-100/10 text-red-400'
                  : 'bg-yellow-100/10 text-yellow-400'
              }`}>
                {debate.status === 'open' ? '진행중' : debate.status === 'closed' ? '종료' : '예정'}
              </span>
            </div>
            {debate.tags && debate.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {debate.tags.map((tag, index) => (
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
          
          <Link
            href={`/debates/${debateId}/admin`}
            className="px-4 py-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            작성자 페이지
          </Link>
        </div>
      </div>

      {/* 투표 결과 */}
      <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">현재 투표 현황</h2>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">찬성</span>
              <span className="text-emerald-400">{debate.agreeCount}표 ({agreePercentage.toFixed(1)}%)</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-4 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${agreePercentage}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">반대</span>
              <span className="text-red-400">{debate.disagreeCount}표 ({disagreePercentage.toFixed(1)}%)</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-4 overflow-hidden">
              <div 
                className="bg-red-500 h-full transition-all duration-500"
                style={{ width: `${disagreePercentage}%` }}
              />
            </div>
          </div>
          
          <div className="text-center text-sm text-zinc-500 mt-4">
            총 {totalVotes}명 참여
          </div>
        </div>
      </div>

      {/* 투표 폼 */}
      {debate.status === 'open' && !hasVoted && (
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">투표하기</h2>
          
          {debate.type === 'named' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                이름/별명
              </label>
              <input
                type="text"
                value={voterName}
                onChange={(e) => setVoterName(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="투표에 표시될 이름을 입력하세요"
              />
            </div>
          )}
          
          {debate.allow_comments && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                의견 (선택사항)
              </label>
              <textarea
                value={opinion}
                onChange={(e) => setOpinion(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                rows={3}
                placeholder="투표와 함께 의견을 남겨주세요"
              />
            </div>
          )}
          
          <div className="flex gap-4">
            <button
              onClick={() => handleVote('agree')}
              disabled={voting}
              className="flex-1 px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              찬성
            </button>
            <button
              onClick={() => handleVote('disagree')}
              disabled={voting}
              className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              반대
            </button>
          </div>
        </div>
      )}

      {hasVoted && (
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6 mb-6">
          <p className="text-center text-zinc-400">
            이미 투표에 참여하셨습니다.
          </p>
        </div>
      )}

      {debate.status === 'closed' && (
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6 mb-6">
          <p className="text-center text-zinc-400">
            이 투표는 종료되었습니다.
          </p>
        </div>
      )}

      {debate.status === 'scheduled' && (
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6 mb-6">
          <p className="text-center text-zinc-400">
            이 투표는 아직 시작되지 않았습니다.
          </p>
        </div>
      )}

      {/* 의견 목록 */}
      {debate.allow_comments && debate.opinions && debate.opinions.length > 0 && (
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">의견 ({debate.opinions.length})</h2>
          
          <div className="space-y-4">
            {debate.opinions.map((opinion) => (
              <div key={opinion.id} className="bg-zinc-800/50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="font-medium text-zinc-300">
                    {opinion.author_name || '익명'}
                  </span>
                  <span className="text-sm text-zinc-500">
                    {formatDistanceToNow(new Date(opinion.created_at), { 
                      addSuffix: true, 
                      locale: ko 
                    })}
                  </span>
                </div>
                <p className="text-zinc-400">{opinion.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}