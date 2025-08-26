'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { debateApi } from '@/lib/api';
import { Debate } from '@/types/debate';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';

export default function DebateAdminPage() {
  const params = useParams();
  const router = useRouter();
  const debateId = params.id as string;
  
  const [debate, setDebate] = useState<Debate | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumeEndDate, setResumeEndDate] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    // localStorage에서 토큰 확인
    const savedToken = localStorage.getItem(`debate_author_${debateId}`);
    if (savedToken) {
      setAdminToken(savedToken);
      setIsAuthenticated(true);
    }
    
    checkAuthStatus();
    
    // QR 코드 생성
    generateQRCode();
  }, [debateId]);

  const generateQRCode = async () => {
    try {
      const debateUrl = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/debates/${debateId}`;
      const qrDataUrl = await QRCode.toDataURL(debateUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      console.error('QR 코드 생성 실패:', error);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const data = await debateApi.get(debateId);
      setDebate(data);
      // localStorage에 토큰이 있으면 인증 상태 유지
      const savedToken = localStorage.getItem(`debate_author_${debateId}`);
      if (savedToken) {
        setIsAuthenticated(true);
      }
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
      const response = await debateApi.verifyAdmin(debateId, password);
      
      // 토큰을 localStorage에 저장
      if (response.admin_token) {
        localStorage.setItem(`debate_author_${debateId}`, response.admin_token);
        setAdminToken(response.admin_token);
        setIsAuthenticated(true);
        // 토론 데이터 다시 불러오기
        const data = await debateApi.get(debateId);
        setDebate(data);
      }
    } catch (error) {
      console.error('인증 오류:', error);
      alert('비밀번호가 올바르지 않습니다.');
    } finally {
      setVerifying(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!debate) return;
    
    // localStorage에서 토큰 직접 가져오기
    const token = adminToken || localStorage.getItem(`debate_author_${debateId}`);
    if (!token) {
      toast.error('관리자 인증이 필요합니다.');
      return;
    }
    
    try {
      if (debate.status === 'active') {
        // 종료
        const newStatus = 'ended';
        await debateApi.updateStatus(debateId, newStatus);
        setDebate({ ...debate, status: newStatus });
        toast.success('투표가 종료되었습니다.');
      } else {
        // 재개 시 모달 표시
        // 기본값으로 7일 후 설정
        const defaultEndDate = new Date();
        defaultEndDate.setDate(defaultEndDate.getDate() + 7);
        setResumeEndDate(defaultEndDate.toISOString().slice(0, 16));
        setShowResumeModal(true);
      }
    } catch (error) {
      console.error('상태 변경 오류:', error);
      toast.error('상태 변경에 실패했습니다.');
    }
  };

  const handleResume = async () => {
    if (!debate || !resumeEndDate) return;
    
    const token = adminToken || localStorage.getItem(`debate_author_${debateId}`);
    if (!token) {
      toast.error('관리자 인증이 필요합니다.');
      return;
    }
    
    try {
      await debateApi.updateStatus(debateId, 'active', resumeEndDate);
      setDebate({ 
        ...debate, 
        status: 'active',
        end_at: resumeEndDate
      });
      toast.success('투표가 재개되었습니다.');
      setShowResumeModal(false);
    } catch (error) {
      console.error('재개 오류:', error);
      toast.error('투표 재개에 실패했습니다.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('정말로 이 투표를 삭제하시겠습니까? 모든 투표 기록도 함께 삭제됩니다.')) {
      return;
    }

    // localStorage에서 토큰 직접 가져오기
    const token = adminToken || localStorage.getItem(`debate_author_${debateId}`);
    if (!token) {
      alert('관리자 인증이 필요합니다.');
      return;
    }

    try {
      await debateApi.delete(debateId);
      alert('투표가 삭제되었습니다.');
      router.push('/debates');
    } catch (error) {
      console.error('삭제 오류:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleExportCSV = async () => {
    try {
      // 쿠키 기반 인증으로 CSV 다운로드 (토큰은 선택사항)
      const adminToken = localStorage.getItem(`debate_author_${debateId}`);
      await debateApi.exportCSV(debateId);
    } catch (error: any) {
      console.error('CSV 다운로드 오류 상세:', error);
      
      // 인증 에러인 경우
      if (error.message?.includes('인증이 필요') || error.message?.includes('세션이 만료')) {
        // 토큰 제거하고 재인증 유도
        localStorage.removeItem(`debate_author_${debateId}`);
        setIsAuthenticated(false);
        alert('인증이 만료되었습니다. 비밀번호를 다시 입력해주세요.');
        return;
      }
      
      const errorMessage = error.message || 'CSV 다운로드에 실패했습니다.';
      alert(`CSV 다운로드 실패: ${errorMessage}`);
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
        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-8 w-full max-w-md shadow-lg dark:shadow-none">
          <h2 className="text-2xl font-bold mb-6 text-center text-zinc-900 dark:text-zinc-100">작성자 인증</h2>
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                작성자 비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-surbate focus:border-transparent"
                placeholder="비밀번호를 입력하세요"
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={verifying}
              className="w-full px-4 py-2 bg-gradient-to-r from-surbate to-brand-600 text-zinc-900 font-semibold rounded-lg hover:from-brand-400 hover:to-brand-600 shadow-sm hover:shadow-lg hover:shadow-surbate/20 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
            >
              {verifying ? '확인 중...' : '확인'}
            </button>
            <Link
              href={`/debates/${debateId}`}
              className="block text-center text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              투표로 돌아가기
            </Link>
          </form>
        </div>
      </div>
    );
  }

  const totalVotes = debate.stats.total_votes;
  const agreeVotes = debate.vote_options.find(opt => opt.label === '찬성')?.vote_count || 0;
  const disagreeVotes = debate.vote_options.find(opt => opt.label === '반대')?.vote_count || 0;
  const agreePercentage = totalVotes > 0 ? (agreeVotes / totalVotes) * 100 : 0;
  const disagreePercentage = totalVotes > 0 ? (disagreeVotes / totalVotes) * 100 : 0;

  // 인증된 경우 관리자 페이지 표시
  return (
    <div className="min-h-screen max-w-4xl mx-auto relative">
      {/* 우측 상단 뒤로가기 버튼 */}
      <Link
        href={`/debates/${debateId}`}
        className="absolute right-0 top-0 p-2 bg-gray-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-100 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-700 transition-colors"
        title="투표로 돌아가기"
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
      <div className="mb-8 pr-12">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 text-zinc-900 dark:text-zinc-100">{debate.title} - 관리</h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-xs sm:text-sm text-zinc-600 dark:text-zinc-500">
              <span>작성자: {debate.author_nickname || '익명'}</span>
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
        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-sm dark:shadow-none">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-zinc-900 dark:text-zinc-100">투표 현황</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm sm:text-base font-medium text-zinc-900 dark:text-zinc-100">찬성</span>
                <span className="text-sm sm:text-base text-surbate">{agreeVotes}표 ({agreePercentage.toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-zinc-800 rounded-full h-3 sm:h-4 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-surbate to-brand-600 h-full transition-all duration-500"
                  style={{ width: `${agreePercentage}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm sm:text-base font-medium text-zinc-900 dark:text-zinc-100">반대</span>
                <span className="text-sm sm:text-base text-red-400">{disagreeVotes}표 ({disagreePercentage.toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-zinc-800 rounded-full h-3 sm:h-4 overflow-hidden">
                <div 
                  className="bg-red-500 h-full transition-all duration-500"
                  style={{ width: `${disagreePercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 상태 관리 */}
        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-sm dark:shadow-none">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-zinc-900 dark:text-zinc-100">투표 상태 관리</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-700 dark:text-zinc-300">
                현재 상태: 
                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                  debate.status === 'active' 
                    ? 'bg-surbate/10 text-surbate' 
                    : 'bg-red-100/10 text-red-400'
                }`}>
                  {debate.status === 'active' ? '진행중' : debate.status === 'scheduled' ? '예정' : '종료'}
                </span>
              </p>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-500 mt-1">
                {debate.status === 'active' 
                  ? '투표를 종료하면 더 이상 투표를 받지 않습니다.' 
                  : debate.status === 'ended'
                  ? '투표를 다시 열면 투표를 받을 수 있습니다.'
                  : '예정된 시간에 투표가 시작됩니다.'}
              </p>
            </div>
            <button
              onClick={handleStatusToggle}
              className={`p-2 rounded-lg transition-all duration-200 ${
                debate.status === 'active'
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-gradient-to-r from-surbate to-brand-600 text-zinc-900 hover:from-brand-400 hover:to-brand-600'
              }`}
              title={debate.status === 'active' ? '투표 종료' : '투표 재개'}
            >
              {debate.status === 'active' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* 데이터 내보내기 */}
        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-sm dark:shadow-none">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-zinc-900 dark:text-zinc-100">데이터 내보내기</h2>
          <button
            onClick={handleExportCSV}
            className="w-full flex items-center justify-between p-2.5 sm:p-3 text-sm sm:text-base bg-gray-100 dark:bg-zinc-800/50 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <span>투표 데이터 CSV 다운로드</span>
            <span className="text-zinc-600 dark:text-zinc-400">↓</span>
          </button>
        </div>

        {/* 공유 링크 */}
        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-sm dark:shadow-none">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-zinc-900 dark:text-zinc-100">공유 링크</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 sm:mb-2">
                투표 참여 링크
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={`${window.location.origin}/debates/${debateId}`}
                  readOnly
                  className="flex-1 px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/debates/${debateId}`);
                    toast.success('링크가 복사되었습니다.');
                  }}
                  className="p-2 bg-gray-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-100 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-700 transition-colors"
                  title="링크 복사"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 sm:mb-2">
                작성자 페이지 링크
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={`${window.location.origin}/debates/${debateId}/admin`}
                  readOnly
                  className="flex-1 px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/debates/${debateId}/admin`);
                    toast.success('링크가 복사되었습니다.');
                  }}
                  className="p-2 bg-gray-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-100 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-700 transition-colors"
                  title="링크 복사"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* QR 코드 */}
        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-sm dark:shadow-none">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-zinc-900 dark:text-zinc-100">QR 코드</h2>
          <div className="flex flex-col items-center space-y-4">
            {qrCodeUrl && (
              <img 
                src={qrCodeUrl} 
                alt="투표 QR 코드" 
                className="w-48 h-48 bg-white p-2 rounded-lg"
              />
            )}
            <p className="text-xs sm:text-sm text-zinc-500 text-center">
              이 QR 코드를 스캔하면 투표 페이지로 바로 이동합니다
            </p>
            <button
              onClick={() => {
                const link = document.createElement('a');
                link.download = `debate_${debateId}_qr.png`;
                link.href = qrCodeUrl;
                link.click();
              }}
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-gray-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-100 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-700 transition-colors"
            >
              QR 코드 다운로드
            </button>
          </div>
        </div>

        {/* 위험 구역 */}
        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm sm:text-base text-zinc-700 dark:text-zinc-300">
                투표 삭제
              </p>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-500 mt-1">
                이 작업은 되돌릴 수 없으며, 모든 투표 데이터가 함께 삭제됩니다.
              </p>
            </div>
            <button
              onClick={handleDelete}
              className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              title="투표 삭제"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 재개 모달 */}
      {showResumeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">투표 재개</h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              투표를 재개하려면 새로운 종료 일정을 설정해주세요.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                종료 일시
              </label>
              <input
                type="datetime-local"
                value={resumeEndDate}
                onChange={(e) => setResumeEndDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-surbate focus:border-transparent"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResumeModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-700 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleResume}
                disabled={!resumeEndDate}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-surbate to-brand-600 text-zinc-900 font-semibold rounded-lg hover:from-brand-400 hover:to-brand-600 transition-colors disabled:opacity-50"
              >
                재개하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}