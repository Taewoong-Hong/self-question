'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { debateApi } from '@/lib/api';
import { Debate } from '@/types/debate';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function DebateAdminPage() {
  const params = useParams();
  const router = useRouter();
  const debateId = params.id as string;
  
  const [debate, setDebate] = useState<Debate | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, [debateId]);

  const checkAuthStatus = async () => {
    try {
      const data = await debateApi.get(debateId);
      setDebate(data);
      setIsAuthenticated(data.isAdmin || false);
    } catch (error) {
      console.error('투표 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setVerifying(true);
      await debateApi.verifyAdmin(debateId, password);
      setIsAuthenticated(true);
      await checkAuthStatus();
    } catch (error) {
      alert('비밀번호가 올바르지 않습니다.');
    } finally {
      setVerifying(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!debate) return;
    
    try {
      const newStatus = debate.status === 'open' ? 'closed' : 'open';
      await debateApi.updateStatus(debateId, newStatus);
      setDebate({ ...debate, status: newStatus });
      alert(`투표가 ${newStatus === 'open' ? '열렸습니다' : '닫혔습니다'}.`);
    } catch (error) {
      alert('상태 변경에 실패했습니다.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('정말로 이 투표를 삭제하시겠습니까? 모든 투표 기록도 함께 삭제됩니다.')) {
      return;
    }

    try {
      await debateApi.delete(debateId);
      alert('투표가 삭제되었습니다.');
      router.push('/debates');
    } catch (error) {
      alert('투표 삭제에 실패했습니다.');
    }
  };

  const handleExportCSV = async () => {
    try {
      await debateApi.exportCSV(debateId);
      alert('CSV 다운로드가 시작됩니다.');
    } catch (error) {
      alert('CSV 다운로드에 실패했습니다.');
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

  // 인증되지 않은 경우
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center">작성자 인증</h2>
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                작성자 비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="비밀번호를 입력하세요"
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={verifying}
              className="w-full px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              {verifying ? '확인 중...' : '확인'}
            </button>
            <Link
              href={`/debates/${debateId}`}
              className="block text-center text-zinc-400 hover:text-zinc-100"
            >
              투표로 돌아가기
            </Link>
          </form>
        </div>
      </div>
    );
  }

  const totalVotes = debate.agreeCount + debate.disagreeCount;
  const agreePercentage = totalVotes > 0 ? (debate.agreeCount / totalVotes) * 100 : 0;
  const disagreePercentage = totalVotes > 0 ? (debate.disagreeCount / totalVotes) * 100 : 0;

  // 인증된 경우 관리자 페이지 표시
  return (
    <div className="min-h-screen max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="mb-8">
        <Link href={`/debates/${debateId}`} className="text-zinc-400 hover:text-zinc-100 mb-4 inline-block">
          ← 투표로 돌아가기
        </Link>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{debate.title} - 관리</h1>
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
              <span>참여 {totalVotes}명</span>
            </div>
          </div>
        </div>
      </div>

      {/* 관리 옵션 */}
      <div className="space-y-6">
        {/* 투표 현황 */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">투표 현황</h2>
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
          </div>
        </div>

        {/* 상태 관리 */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">투표 상태 관리</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-300">
                현재 상태: 
                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                  debate.status === 'open' 
                    ? 'bg-emerald-100/10 text-emerald-400' 
                    : 'bg-red-100/10 text-red-400'
                }`}>
                  {debate.status === 'open' ? '진행중' : '종료'}
                </span>
              </p>
              <p className="text-sm text-zinc-500 mt-1">
                {debate.status === 'open' 
                  ? '투표를 종료하면 더 이상 투표를 받지 않습니다.' 
                  : '투표를 다시 열면 투표를 받을 수 있습니다.'}
              </p>
            </div>
            <button
              onClick={handleStatusToggle}
              className={`px-4 py-2 rounded-lg transition-colors ${
                debate.status === 'open'
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
              }`}
            >
              {debate.status === 'open' ? '투표 종료' : '투표 재개'}
            </button>
          </div>
        </div>

        {/* 데이터 내보내기 */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">데이터 내보내기</h2>
          <button
            onClick={handleExportCSV}
            className="w-full flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <span>투표 데이터 CSV 다운로드</span>
            <span className="text-zinc-400">↓</span>
          </button>
        </div>

        {/* 공유 링크 */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">공유 링크</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                투표 참여 링크
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={`${window.location.origin}/debates/${debateId}`}
                  readOnly
                  className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/debates/${debateId}`)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  복사
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                작성자 페이지 링크
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={`${window.location.origin}/debates/${debateId}/admin`}
                  readOnly
                  className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/debates/${debateId}/admin`)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  복사
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 위험 구역 */}
        <div className="bg-red-900/10 border border-red-900/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-red-400">위험 구역</h2>
          <p className="text-sm text-zinc-400 mb-4">
            다음 작업은 되돌릴 수 없습니다. 신중하게 진행하세요.
          </p>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            투표 삭제
          </button>
        </div>
      </div>
    </div>
  );
}