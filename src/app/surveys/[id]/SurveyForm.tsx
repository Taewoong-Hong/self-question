'use client';

import { useState } from 'react';
import { surveyApi } from '@/lib/api';
import { SurveyResponseData } from '@/types/survey';
import toast from 'react-hot-toast';

interface SurveyFormProps {
  surveyId: string;
  questions: any[];
  onComplete: () => void;
}

export default function SurveyForm({ surveyId, questions, onComplete }: SurveyFormProps) {
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [otherTexts, setOtherTexts] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [skippedQuestions, setSkippedQuestions] = useState<Set<string>>(new Set());
  const [startedAt] = useState(new Date());

  // 조건부 로직에 따라 건너뛸 질문 확인
  const checkSkipLogic = (question: any) => {
    if (!question.skip_logic) return false;
    
    const { condition, action } = question.skip_logic;
    const targetResponse = responses[condition.question_id];
    
    if (!targetResponse) return action === 'skip';
    
    let conditionMet = false;
    
    switch (condition.operator) {
      case 'equals':
        conditionMet = targetResponse === condition.value;
        break;
      case 'not_equals':
        conditionMet = targetResponse !== condition.value;
        break;
      case 'contains':
        if (Array.isArray(targetResponse)) {
          conditionMet = targetResponse.includes(condition.value);
        } else {
          conditionMet = targetResponse?.toString().includes(condition.value);
        }
        break;
    }
    
    return action === 'skip' ? conditionMet : !conditionMet;
  };
  
  // 표시할 질문들만 필터링
  const visibleQuestions = questions.filter(q => !checkSkipLogic(q));
  const currentQuestion = visibleQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / visibleQuestions.length) * 100;

  const validateResponse = (questionId: string, value: any): boolean => {
    const question = questions.find(q => q._id === questionId);
    if (!question) return true;

    if (question.required && (!value || (Array.isArray(value) && value.length === 0))) {
      setErrors({ ...errors, [questionId]: '이 항목은 필수입니다.' });
      return false;
    }

    if (question.validation?.min_length && value.length < question.validation.min_length) {
      setErrors({ ...errors, [questionId]: `최소 ${question.validation.min_length}자 이상 입력해주세요.` });
      return false;
    }

    if (question.validation?.max_length && value.length > question.validation.max_length) {
      setErrors({ ...errors, [questionId]: `최대 ${question.validation.max_length}자까지 입력 가능합니다.` });
      return false;
    }

    setErrors({ ...errors, [questionId]: '' });
    return true;
  };

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses({ ...responses, [questionId]: value });
    validateResponse(questionId, value);
    
    // 로컬스토리지에 임시 저장
    localStorage.setItem(`survey-${surveyId}-draft`, JSON.stringify({
      ...responses,
      [questionId]: value
    }));
  };

  const handleNext = () => {
    if (!validateResponse(currentQuestion._id, responses[currentQuestion._id])) {
      return;
    }

    if (currentQuestionIndex < visibleQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    // 표시된 필수 질문만 검증
    let isValid = true;
    for (const question of visibleQuestions) {
      if (!validateResponse(question._id, responses[question._id])) {
        isValid = false;
      }
    }

    if (!isValid) {
      toast.error('필수 항목을 모두 입력해주세요.');
      return;
    }

    try {
      setSubmitting(true);
      
      const responseData: SurveyResponseData = {
        started_at: startedAt,
        answers: questions
          .filter(q => !checkSkipLogic(q)) // 건너뛴 질문은 제외
          .map(q => {
            const answer: any = {
              question_id: q._id,
              question_type: q.type, // question_type 추가
              answered_at: new Date()
            };
            
            // 질문 유형에 따라 적절한 필드 설정
            switch (q.type) {
              case 'single_choice':
                answer.choice_id = responses[q._id] || null;
                // '기타' 옵션이 선택된 경우
                if (responses[q._id]) {
                  const selectedChoice = q.properties?.choices?.find((c: any) => c.id === responses[q._id]);
                  if (selectedChoice?.is_other && otherTexts[q._id]) {
                    answer.other_text = otherTexts[q._id];
                  }
                }
                break;
              case 'multiple_choice':
                answer.choice_ids = responses[q._id] || [];
                break;
              case 'short_text':
              case 'long_text':
                answer.text = responses[q._id] || '';
                break;
              case 'rating':
                answer.rating = responses[q._id] || null;
                break;
            }
            
            // 다중 선택에서 '기타' 옵션이 포함된 경우
            if (q.type === 'multiple_choice' && Array.isArray(responses[q._id])) {
              const otherChoices = q.properties?.choices?.filter((c: any) => 
                c.is_other && responses[q._id].includes(c.id)
              );
              if (otherChoices?.length > 0) {
                answer.other_texts = otherChoices.map((c: any) => ({
                  choice_id: c.id,
                  text: otherTexts[`${q._id}_${c.id}`] || ''
                })).filter((ot: any) => ot.text);
              }
            }
            
            return answer;
          })
      };

      await surveyApi.respond(surveyId, responseData);
      
      // 임시 저장 삭제
      localStorage.removeItem(`survey-${surveyId}-draft`);
      
      toast.success('설문이 제출되었습니다. 감사합니다!');
      onComplete();
    } catch (error: any) {
      console.error('Survey submission error:', error);
      
      // 서버에서 반환한 에러 메시지 우선 사용
      const errorData = error.response?.data || error.data;
      const errorMessage = errorData?.error || error.message;
      
      if (errorData?.code === 'ALREADY_RESPONDED' || error.message?.includes('이미 응답')) {
        toast.error('이미 응답한 설문입니다.');
        onComplete();
      } else if (errorData?.code === 'SURVEY_CLOSED') {
        toast.error('종료된 설문입니다.');
      } else if (errorData?.code === 'VALIDATION_ERROR') {
        toast.error(errorMessage || '입력값을 확인해주세요.');
      } else {
        toast.error(errorMessage || '설문 제출 중 오류가 발생했습니다.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestionInput = (question: any) => {
    const value = responses[question._id];
    const error = errors[question._id];

    switch (question.type) {
      case 'single_choice':
        return (
          <div className="space-y-2">
            {question.properties?.choices?.map((choice: any, index: number) => (
              <div key={choice.id || index}>
                <label className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800">
                  <input
                    type="radio"
                    name={question._id}
                    value={choice.id}
                    checked={value === choice.id}
                    onChange={(e) => handleResponseChange(question._id, e.target.value)}
                    className="text-surbate focus:ring-surbate"
                  />
                  <span className="text-zinc-900 dark:text-zinc-100">{choice.label}</span>
                </label>
                {choice.is_other && value === choice.id && (
                  <input
                    type="text"
                    value={otherTexts[question._id] || ''}
                    onChange={(e) => setOtherTexts({ ...otherTexts, [question._id]: e.target.value })}
                    placeholder="기타 내용을 입력해주세요"
                    className="mt-2 ml-8 w-full px-3 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-surbate focus:border-transparent"
                  />
                )}
              </div>
            ))}
          </div>
        );

      case 'multiple_choice':
        return (
          <div className="space-y-2">
            {question.properties?.choices?.map((choice: any, index: number) => (
              <div key={choice.id || index}>
                <label className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800">
                  <input
                    type="checkbox"
                    value={choice.id}
                    checked={Array.isArray(value) && value.includes(choice.id)}
                    onChange={(e) => {
                      const currentValues = Array.isArray(value) ? value : [];
                      if (e.target.checked) {
                        handleResponseChange(question._id, [...currentValues, choice.id]);
                      } else {
                        handleResponseChange(question._id, currentValues.filter(v => v !== choice.id));
                      }
                    }}
                    className="text-surbate focus:ring-surbate"
                  />
                  <span className="text-zinc-900 dark:text-zinc-100">{choice.label}</span>
                </label>
                {choice.is_other && Array.isArray(value) && value.includes(choice.id) && (
                  <input
                    type="text"
                    value={otherTexts[`${question._id}_${choice.id}`] || ''}
                    onChange={(e) => setOtherTexts({ ...otherTexts, [`${question._id}_${choice.id}`]: e.target.value })}
                    placeholder="기타 내용을 입력해주세요"
                    className="mt-2 ml-8 w-full px-3 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-surbate focus:border-transparent"
                  />
                )}
              </div>
            ))}
          </div>
        );

      case 'short_text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleResponseChange(question._id, e.target.value)}
            className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="답변을 입력하세요"
          />
        );

      case 'long_text':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => handleResponseChange(question._id, e.target.value)}
            rows={4}
            className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="답변을 입력하세요"
          />
        );

      case 'rating':
        return (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => handleResponseChange(question._id, rating)}
                className={`w-12 h-12 rounded-lg font-medium transition-colors ${
                  value === rating
                    ? 'bg-surbate text-zinc-900'
                    : 'bg-gray-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-gray-300 dark:hover:bg-zinc-700'
                }`}
              >
                {rating}
              </button>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-sm dark:shadow-none">
      {/* 진행률 표시 */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400 mb-2">
          <span>질문 {currentQuestionIndex + 1} / {visibleQuestions.length}</span>
          <span>{Math.round(progress)}% 완료</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-zinc-800 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-surbate to-brand-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 현재 질문 */}
      <div className="mb-8">
        <h2 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          {currentQuestion.title}
          {currentQuestion.required && <span className="text-red-600 dark:text-red-400 ml-1">*</span>}
        </h2>
        {currentQuestion.description && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 whitespace-pre-wrap">{currentQuestion.description}</p>
        )}
        
        {renderQuestionInput(currentQuestion)}
        
        {errors[currentQuestion._id] && (
          <p className="text-red-600 dark:text-red-400 text-sm mt-2">{errors[currentQuestion._id]}</p>
        )}
      </div>

      {/* 네비게이션 버튼 */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          className="px-4 py-2 text-sm bg-gray-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-100 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          이전
        </button>

        {currentQuestionIndex === visibleQuestions.length - 1 ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 text-sm bg-gradient-to-r from-surbate to-brand-600 text-zinc-900 font-semibold rounded-lg hover:from-brand-400 hover:to-brand-600 transition-all disabled:opacity-50"
          >
            {submitting ? '제출 중...' : '제출하기'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            className="px-4 py-2 text-sm bg-surbate text-zinc-900 font-semibold rounded-lg hover:bg-brand-400 transition-colors"
          >
            다음
          </button>
        )}
      </div>
    </div>
  );
}