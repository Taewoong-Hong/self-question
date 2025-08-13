import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { surveyApi } from '@/lib/api';
import { Survey, SurveyStats } from '@/types/survey';
import { formatDate, formatNumber } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function SurveyAdminPage() {
  const router = useRouter();
  const { id } = router.query;
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [stats, setStats] = useState<SurveyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [adminToken, setAdminToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    // 로컬 스토리지에서 토큰 확인
    const storedToken = localStorage.getItem(`survey_admin_${id}`);
    if (storedToken) {
      setAdminToken(storedToken);
      setIsAuthenticated(true);
    }
  }, [id]);

  useEffect(() => {
    if (id && isAuthenticated) {
      fetchSurveyData();
    }
  }, [id, isAuthenticated]);

  const fetchSurveyData = async () => {
    try {
      setLoading(true);
      const [surveyData, statsData] = await Promise.all([
        surveyApi.get(id as string),
        surveyApi.getResults(id as string)
      ]);
      setSurvey(surveyData);
      setStats(statsData);
    } catch (error) {
      toast.error('데이터를 불러오는데 실패했습니다.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      toast.error('비밀번호를 입력해주세요.');
      return;
    }

    try {
      const result = await surveyApi.verifyPassword(id as string, password);
      setAdminToken(result.token);
      setIsAuthenticated(true);
      localStorage.setItem(`survey_admin_${id}`, result.token);
      toast.success('인증되었습니다.');
      setPassword('');
    } catch (error) {
      toast.error('비밀번호가 올바르지 않습니다.');
    }
  };

  const handleStatusToggle = async () => {
    if (!survey) return;

    try {
      const newStatus = survey.status === 'open' ? 'closed' : 'open';
      await surveyApi.updateStatus(survey.id, newStatus, adminToken);
      setSurvey({ ...survey, status: newStatus });
      toast.success(`설문이 ${newStatus === 'open' ? '열렸습니다' : '닫혔습니다'}.`);
    } catch (error) {
      toast.error('상태 변경에 실패했습니다.');
    }
  };

  const handleExportCsv = async () => {
    if (!survey) return;

    try {
      const blob = await surveyApi.exportCsv(survey.id, adminToken);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `survey_${survey.id}_responses_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('CSV 파일이 다운로드되었습니다.');
    } catch (error) {
      toast.error('CSV 다운로드에 실패했습니다.');
    }
  };

  const handleDelete = async () => {
    if (!survey) return;

    try {
      await surveyApi.delete(survey.id, adminToken);
      localStorage.removeItem(`survey_admin_${id}`);
      toast.success('설문이 삭제되었습니다.');
      router.push('/surveys');
    } catch (error) {
      toast.error('설문 삭제에 실패했습니다.');
    }
  };

  const copyPublicUrl = () => {
    const url = `${window.location.origin}/surveys/${id}`;
    navigator.clipboard.writeText(url);
    toast.success('공개 URL이 복사되었습니다.');
  };

  const copyAdminUrl = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('관리자 URL이 복사되었습니다.');
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="max-w-md mx-auto mt-12">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">관리자 인증</h2>
            <form onSubmit={handlePasswordSubmit}>
              <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  관리자 비밀번호
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  placeholder="설문 생성 시 입력한 비밀번호"
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
              >
                확인
              </button>
            </form>
          </div>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white bg-primary">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              로딩중...
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!survey || !stats) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">설문을 찾을 수 없습니다.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{survey.title} - 관리자</h1>
              {survey.description && (
                <p className="text-gray-600 mt-1">{survey.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleStatusToggle}
                className={`px-4 py-2 rounded-md ${
                  survey.status === 'open'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {survey.status === 'open' ? '설문 닫기' : '설문 열기'}
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                삭제
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-50 rounded-md p-3">
              <p className="text-sm text-gray-600">상태</p>
              <p className="text-lg font-semibold">{survey.status === 'open' ? '진행중' : '종료'}</p>
            </div>
            <div className="bg-gray-50 rounded-md p-3">
              <p className="text-sm text-gray-600">응답 수</p>
              <p className="text-lg font-semibold">{formatNumber(stats.total_responses)}</p>
            </div>
            <div className="bg-gray-50 rounded-md p-3">
              <p className="text-sm text-gray-600">생성일</p>
              <p className="text-lg font-semibold">{formatDate(survey.created_at)}</p>
            </div>
            <div className="bg-gray-50 rounded-md p-3">
              <p className="text-sm text-gray-600">완료율</p>
              <p className="text-lg font-semibold">{stats.completion_rate}%</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={copyPublicUrl}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              공개 URL 복사
            </button>
            <button
              onClick={copyAdminUrl}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              관리자 URL 복사
            </button>
            <button
              onClick={handleExportCsv}
              className="px-3 py-1 text-sm bg-primary text-white rounded-md hover:bg-primary-dark"
            >
              CSV 다운로드
            </button>
          </div>
        </div>

        {/* 질문별 통계 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">응답 통계</h2>
          
          {survey.questions.map((question, index) => {
            const questionStats = stats.question_stats[question.id];
            if (!questionStats) return null;

            return (
              <div key={question.id} className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {index + 1}. {question.question}
                </h3>

                {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
                  <div className="space-y-2">
                    {Object.entries(questionStats.options || {}).map(([option, count]) => {
                      const percentage = stats.total_responses > 0 
                        ? ((count as number) / stats.total_responses) * 100 
                        : 0;
                      
                      return (
                        <div key={option}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{option}</span>
                            <span>{count as number}명 ({percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-6">
                            <div
                              className="bg-primary h-6 rounded-full flex items-center justify-end pr-2"
                              style={{ width: `${percentage}%` }}
                            >
                              {percentage > 10 && (
                                <span className="text-xs text-white">{percentage.toFixed(0)}%</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {question.type === 'rating' && questionStats.average && (
                  <div>
                    <p className="text-lg">
                      평균: <span className="font-semibold">{questionStats.average.toFixed(1)}</span>
                      <span className="text-gray-500 text-sm ml-2">
                        (최소: {question.min_rating || 1}, 최대: {question.max_rating || 5})
                      </span>
                    </p>
                  </div>
                )}

                {(question.type === 'short_text' || question.type === 'long_text') && (
                  <div>
                    <p className="text-gray-600">
                      {questionStats.response_count}개의 텍스트 응답이 있습니다.
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      자세한 내용은 CSV 파일을 다운로드하여 확인하세요.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 삭제 확인 모달 */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">설문 삭제 확인</h3>
              <p className="text-gray-600 mb-6">
                이 설문과 모든 응답 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}