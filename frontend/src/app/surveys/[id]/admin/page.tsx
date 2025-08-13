'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { surveyApi } from '@/lib/api';
import { Survey } from '@/types/survey';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function SurveyAdminPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;
  
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    // 먼저 인증 상태 확인
    checkAuthStatus();
  }, [surveyId]);

  const checkAuthStatus = async () => {
    try {
      // 서버에서 인증 상태 확인 (쿠키 기반)
      const data = await surveyApi.get(surveyId);
      setSurvey(data);
      // 관리자 권한이 있는지는 서버 응답에 따라 결정
      setIsAuthenticated(data.isAdmin || false);
    } catch (error) {
      console.error('설문 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setVerifying(true);
      await surveyApi.verifyAdmin(surveyId, password);
      setIsAuthenticated(true);
      await checkAuthStatus(); // 인증 후 데이터 새로고침
    } catch (error) {
      alert('비밀번호가 올바르지 않습니다.');
    } finally {
      setVerifying(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!survey) return;
    
    try {
      const newStatus = survey.status === 'open' ? 'closed' : 'open';
      await surveyApi.updateStatus(surveyId, newStatus);
      setSurvey({ ...survey, status: newStatus });
      alert(`설문이 ${newStatus === 'open' ? '열렸습니다' : '닫혔습니다'}.`);
    } catch (error) {
      alert('상태 변경에 실패했습니다.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('정말로 이 설문을 삭제하시겠습니까? 모든 응답도 함께 삭제됩니다.')) {
      return;
    }

    try {
      await surveyApi.delete(surveyId);
      alert('설문이 삭제되었습니다.');
      router.push('/surveys');
    } catch (error) {
      alert('설문 삭제에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-100"></div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-400">설문을 찾을 수 없습니다.</p>
      </div>
    );
  }

  // 인증되지 않은 경우 비밀번호 입력 폼 표시
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
              href={`/surveys/${surveyId}`}
              className="block text-center text-zinc-400 hover:text-zinc-100"
            >
              설문으로 돌아가기
            </Link>
          </form>
        </div>
      </div>
    );
  }

  // 인증된 경우 관리자 페이지 표시
  return (
    <div className="min-h-screen max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="mb-8">
        <Link href={`/surveys/${surveyId}`} className="text-zinc-400 hover:text-zinc-100 mb-4 inline-block">
          ← 설문으로 돌아가기
        </Link>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{survey.title} - 관리</h1>
            <div className="flex items-center gap-4 mt-4 text-sm text-zinc-500">
              <span>작성자: {survey.creator_nickname || '익명'}</span>
              <span>•</span>
              <span>
                {formatDistanceToNow(new Date(survey.created_at), { 
                  addSuffix: true, 
                  locale: ko 
                })}
              </span>
              <span>•</span>
              <span>응답 {survey.response_count}명</span>
            </div>
          </div>
        </div>
      </div>

      {/* 관리 옵션 */}
      <div className="space-y-6">
        {/* 상태 관리 */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">설문 상태 관리</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-300">
                현재 상태: 
                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                  survey.status === 'open' 
                    ? 'bg-emerald-100/10 text-emerald-400' 
                    : 'bg-red-100/10 text-red-400'
                }`}>
                  {survey.status === 'open' ? '진행중' : '종료'}
                </span>
              </p>
              <p className="text-sm text-zinc-500 mt-1">
                {survey.status === 'open' 
                  ? '설문을 종료하면 더 이상 응답을 받지 않습니다.' 
                  : '설문을 다시 열면 응답을 받을 수 있습니다.'}
              </p>
            </div>
            <button
              onClick={handleStatusToggle}
              className={`px-4 py-2 rounded-lg transition-colors ${
                survey.status === 'open'
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
              }`}
            >
              {survey.status === 'open' ? '설문 종료' : '설문 재개'}
            </button>
          </div>
        </div>

        {/* 결과 및 데이터 */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">결과 및 데이터</h2>
          <div className="space-y-3">
            <Link
              href={`/surveys/${surveyId}/results`}
              className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <span>결과 통계 보기</span>
              <span className="text-zinc-400">→</span>
            </Link>
            <button
              onClick={() => surveyApi.exportCSV(surveyId)}
              className="w-full flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <span>응답 데이터 CSV 다운로드</span>
              <span className="text-zinc-400">↓</span>
            </button>
          </div>
        </div>

        {/* 공유 링크 */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">공유 링크</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                설문 참여 링크
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={`${window.location.origin}/surveys/${surveyId}`}
                  readOnly
                  className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/surveys/${surveyId}`)}
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
                  value={`${window.location.origin}/surveys/${surveyId}/admin`}
                  readOnly
                  className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/surveys/${surveyId}/admin`)}
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
            설문 삭제
          </button>
        </div>
      </div>
    </div>
  );
}