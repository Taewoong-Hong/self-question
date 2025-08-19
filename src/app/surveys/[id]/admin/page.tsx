'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { surveyApi } from '@/lib/api';
import { Survey } from '@/types/survey';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';

export default function SurveyAdminPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;
  
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    // localStorage에서 토큰 확인
    const savedToken = localStorage.getItem(`survey_admin_${surveyId}`);
    if (savedToken) {
      setAdminToken(savedToken);
      setIsAuthenticated(true);
    }
    
    // 설문 데이터 가져오기
    checkAuthStatus();
    
    // QR 코드 생성
    generateQRCode();
  }, [surveyId]);

  const checkAuthStatus = async () => {
    try {
      // 서버에서 인증 상태 확인 (쿠키 기반)
      const data = await surveyApi.get(surveyId);
      setSurvey(data.survey);
      // localStorage에 토큰이 있으면 인증된 것으로 유지
      const savedToken = localStorage.getItem(`survey_admin_${surveyId}`);
      if (!savedToken) {
        setIsAuthenticated(false);
      }
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
      const response = await surveyApi.verifyAdmin(surveyId, password);
      
      // 토큰을 localStorage에 저장 (세션 기반으로 처리)
      if (response.admin_token) {
        localStorage.setItem(`survey_admin_${surveyId}`, response.admin_token);
        setAdminToken(response.admin_token);
      }
      
      setIsAuthenticated(true);
      
      // 인증 후 데이터 새로고침
      const surveyData = await surveyApi.get(surveyId);
      setSurvey(surveyData.survey);
    } catch (error) {
      toast.error('비밀번호가 올바르지 않습니다.');
    } finally {
      setVerifying(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!survey) return;
    
    // localStorage에서 토큰 직접 가져오기
    const token = adminToken || localStorage.getItem(`survey_admin_${surveyId}`);
    if (!token) {
      toast.error('관리자 인증이 필요합니다.');
      return;
    }
    
    try {
      const newStatus = survey.status === 'open' ? 'closed' : 'open';
      await surveyApi.updateStatus(surveyId, newStatus, token);
      setSurvey({ ...survey, status: newStatus });
      toast.success(`설문이 ${newStatus === 'open' ? '열렸습니다' : '닫혔습니다'}.`);
    } catch (error) {
      console.error('상태 변경 오류:', error);
      toast.error('상태 변경에 실패했습니다.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('정말로 이 설문을 삭제하시겠습니까? 모든 응답도 함께 삭제됩니다.')) {
      return;
    }

    // localStorage에서 토큰 직접 가져오기
    const token = adminToken || localStorage.getItem(`survey_admin_${surveyId}`);
    if (!token) {
      toast.error('관리자 인증이 필요합니다.');
      return;
    }

    try {
      await surveyApi.delete(surveyId, token);
      toast.success('설문이 삭제되었습니다.');
      router.push('/surveys');
    } catch (error) {
      console.error('삭제 오류:', error);
      toast.error('설문 삭제에 실패했습니다.');
    }
  };

  const generateQRCode = async () => {
    try {
      const surveyUrl = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/surveys/${surveyId}`;
      const qrDataUrl = await QRCode.toDataURL(surveyUrl, {
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
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-surbate focus:border-transparent"
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
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold mb-2">{survey.title} - 관리</h1>
            <div className="flex items-center gap-4 text-sm text-zinc-500">
              <span>작성자: {survey.author_nickname || '익명'}</span>
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
              <span>•</span>
              <span>응답 {survey.stats?.response_count || 0}명</span>
            </div>
          </div>
          <Link 
            href={`/surveys/${surveyId}`} 
            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            title="설문으로 돌아가기"
          >
            <svg className="w-5 h-5 text-zinc-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
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
                    ? 'bg-surbate/10 text-surbate' 
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
              className={`p-2 rounded-lg transition-all duration-200 ${
                survey.status === 'open'
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-gradient-to-r from-surbate to-brand-600 text-zinc-900 hover:from-brand-400 hover:to-brand-600'
              }`}
              title={survey.status === 'open' ? '설문 종료' : '설문 재개'}
            >
              {survey.status === 'open' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* 결과 및 데이터 */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">결과 및 데이터</h2>
          <div className="space-y-3">
            <Link
              href={`/surveys/${surveyId}/public-results`}
              className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <span>결과 통계 보기</span>
              <span className="text-zinc-400">→</span>
            </Link>
            <button
              onClick={() => adminToken && surveyApi.exportCSV(surveyId, adminToken)}
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
                  value={`${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/surveys/${surveyId}`}
                  readOnly
                  className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/surveys/${surveyId}`);
                    toast.success('링크가 복사되었습니다.');
                  }}
                  className="p-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors"
                  title="링크 복사"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
              {/* QR 코드 표시 */}
              {qrCodeUrl && (
                <div className="mt-4 flex flex-col items-center">
                  <img src={qrCodeUrl} alt="설문 참여 QR 코드" className="rounded-lg shadow-lg" />
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.download = `survey_${surveyId}_qr.png`;
                      link.href = qrCodeUrl;
                      link.click();
                    }}
                    className="mt-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
                  >
                    QR 코드 다운로드
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                작성자 페이지 링크
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={`${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/surveys/${surveyId}/admin`}
                  readOnly
                  className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/surveys/${surveyId}/admin`);
                    toast.success('링크가 복사되었습니다.');
                  }}
                  className="p-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors"
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

        {/* 설문 삭제 */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-300">
                설문 삭제
              </p>
              <p className="text-sm text-zinc-500 mt-1">
                이 작업은 되돌릴 수 없으며, 모든 응답 데이터가 함께 삭제됩니다.
              </p>
            </div>
            <button
              onClick={handleDelete}
              className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              title="설문 삭제"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}