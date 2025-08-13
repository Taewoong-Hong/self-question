import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { surveyApi } from '@/lib/api';
import { Survey, Question, SurveyResponseData } from '@/types/survey';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function SurveyDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [responseCode, setResponseCode] = useState('');

  useEffect(() => {
    if (id) {
      fetchSurvey();
    }
  }, [id]);

  const fetchSurvey = async () => {
    try {
      setLoading(true);
      const data = await surveyApi.get(id as string);
      setSurvey(data);
      
      // 초기 응답 객체 설정
      const initialResponses: Record<string, any> = {};
      data.questions.forEach(q => {
        if (q.type === 'multiple_choice') {
          initialResponses[q.id] = [];
        } else if (q.type === 'rating') {
          initialResponses[q.id] = q.min_rating || 1;
        } else {
          initialResponses[q.id] = '';
        }
      });
      setResponses(initialResponses);
    } catch (error: any) {
      if (error.message?.includes('already responded')) {
        toast.error('이미 이 설문에 응답하셨습니다.');
        router.push('/surveys');
      } else {
        toast.error('설문을 불러오는데 실패했습니다.');
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleMultipleChoiceChange = (questionId: string, option: string, checked: boolean) => {
    setResponses(prev => {
      const current = prev[questionId] || [];
      if (checked) {
        return { ...prev, [questionId]: [...current, option] };
      } else {
        return { ...prev, [questionId]: current.filter((o: string) => o !== option) };
      }
    });
  };

  const validateCurrentPage = () => {
    if (!survey) return false;
    
    const questionsPerPage = 1; // 한 페이지에 한 질문
    const currentQuestion = survey.questions[currentPage];
    
    if (currentQuestion.required) {
      const response = responses[currentQuestion.id];
      
      if (currentQuestion.type === 'multiple_choice') {
        if (!response || response.length === 0) {
          toast.error('이 질문은 필수입니다.');
          return false;
        }
      } else if (!response || response.toString().trim() === '') {
        toast.error('이 질문은 필수입니다.');
        return false;
      }
    }
    
    return true;
  };

  const handleNext = () => {
    if (validateCurrentPage()) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleSubmit = async () => {
    if (!survey || !validateCurrentPage()) return;

    // 모든 필수 질문 확인
    for (const question of survey.questions) {
      if (question.required) {
        const response = responses[question.id];
        if (!response || (Array.isArray(response) && response.length === 0) || response.toString().trim() === '') {
          toast.error(`"${question.question}" 질문은 필수입니다.`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const responseData: SurveyResponseData = {
        responses,
      };

      const result = await surveyApi.respond(survey.id, responseData);
      setResponseCode(result.data.response_code);
      setCompleted(true);
      toast.success('설문이 제출되었습니다!');
    } catch (error: any) {
      if (error.message?.includes('already responded')) {
        toast.error('이미 이 설문에 응답하셨습니다.');
        router.push('/surveys');
      } else {
        toast.error(error.message || '설문 제출에 실패했습니다.');
      }
    } finally {
      setSubmitting(false);
    }
  };

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

  if (!survey) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">설문을 찾을 수 없습니다.</p>
        </div>
      </Layout>
    );
  }

  if (survey.status === 'closed') {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-yellow-800 mb-2">설문이 종료되었습니다</h2>
            <p className="text-yellow-700">이 설문은 현재 응답을 받지 않습니다.</p>
            <button
              onClick={() => router.push('/surveys')}
              className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
            >
              다른 설문 보기
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (completed) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
            <div className="mb-4">
              <svg className="mx-auto h-16 w-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-green-800 mb-2">설문이 제출되었습니다!</h2>
            <p className="text-green-700 mb-4">응답해 주셔서 감사합니다.</p>
            {responseCode && (
              <div className="bg-white rounded-md p-4 mb-4">
                <p className="text-sm text-gray-600">응답 코드</p>
                <p className="text-lg font-mono font-semibold text-gray-900">{responseCode}</p>
              </div>
            )}
            <button
              onClick={() => router.push('/surveys')}
              className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-dark"
            >
              다른 설문 보기
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const currentQuestion = survey.questions[currentPage];
  const progress = ((currentPage + 1) / survey.questions.length) * 100;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        {/* 설문 헤더 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{survey.title}</h1>
          {survey.description && (
            <p className="text-gray-600 mb-4">{survey.description}</p>
          )}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>생성일: {formatDate(survey.created_at)}</span>
            <span>{survey.response_count || 0}명 참여</span>
          </div>
        </div>

        {/* 진행률 표시 */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>질문 {currentPage + 1} / {survey.questions.length}</span>
            <span>{Math.round(progress)}% 완료</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* 현재 질문 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {currentQuestion.question}
            {currentQuestion.required && <span className="text-red-500 ml-1">*</span>}
          </h3>

          {/* 단일 선택 */}
          {currentQuestion.type === 'single_choice' && (
            <div className="space-y-3">
              {currentQuestion.options?.map((option) => (
                <label key={option} className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value={option}
                    checked={responses[currentQuestion.id] === option}
                    onChange={(e) => handleResponseChange(currentQuestion.id, e.target.value)}
                    className="mr-3 text-primary focus:ring-primary"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          )}

          {/* 다중 선택 */}
          {currentQuestion.type === 'multiple_choice' && (
            <div className="space-y-3">
              {currentQuestion.options?.map((option) => (
                <label key={option} className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    value={option}
                    checked={responses[currentQuestion.id]?.includes(option) || false}
                    onChange={(e) => handleMultipleChoiceChange(currentQuestion.id, option, e.target.checked)}
                    className="mr-3 text-primary focus:ring-primary"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          )}

          {/* 단답형 */}
          {currentQuestion.type === 'short_text' && (
            <input
              type="text"
              value={responses[currentQuestion.id] || ''}
              onChange={(e) => handleResponseChange(currentQuestion.id, e.target.value)}
              maxLength={currentQuestion.max_length}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              placeholder="답변을 입력하세요"
            />
          )}

          {/* 장문형 */}
          {currentQuestion.type === 'long_text' && (
            <textarea
              value={responses[currentQuestion.id] || ''}
              onChange={(e) => handleResponseChange(currentQuestion.id, e.target.value)}
              maxLength={currentQuestion.max_length}
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              placeholder="답변을 입력하세요"
            />
          )}

          {/* 평점 */}
          {currentQuestion.type === 'rating' && (
            <div className="flex items-center justify-center space-x-4">
              {Array.from(
                { length: (currentQuestion.max_rating || 5) - (currentQuestion.min_rating || 1) + 1 },
                (_, i) => i + (currentQuestion.min_rating || 1)
              ).map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => handleResponseChange(currentQuestion.id, rating)}
                  className={`w-12 h-12 rounded-full border-2 font-semibold transition-all ${
                    responses[currentQuestion.id] === rating
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                  }`}
                >
                  {rating}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 네비게이션 버튼 */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentPage === 0}
            className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            이전
          </button>

          {currentPage < survey.questions.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-dark"
            >
              다음
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '제출 중...' : '제출하기'}
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
}