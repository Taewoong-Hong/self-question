'use client';

import { useState } from 'react';
import { surveyApi } from '@/lib/api';
import { ResponseDto } from '@/types/survey';

interface SurveyFormProps {
  surveyId: string;
  questions: any[];
  onComplete: () => void;
}

export default function SurveyForm({ surveyId, questions, onComplete }: SurveyFormProps) {
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

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

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    // 모든 필수 질문 검증
    let isValid = true;
    for (const question of questions) {
      if (!validateResponse(question._id, responses[question._id])) {
        isValid = false;
      }
    }

    if (!isValid) {
      alert('필수 항목을 모두 입력해주세요.');
      return;
    }

    try {
      setSubmitting(true);
      
      const responseData: ResponseDto = {
        answers: questions.map(q => ({
          question_id: q._id,
          value: responses[q._id] || null
        })).filter(a => a.value !== null)
      };

      await surveyApi.submitResponse(surveyId, responseData);
      
      // 임시 저장 삭제
      localStorage.removeItem(`survey-${surveyId}-draft`);
      
      alert('설문이 제출되었습니다. 감사합니다!');
      onComplete();
    } catch (error: any) {
      if (error.message?.includes('이미 응답')) {
        alert('이미 응답한 설문입니다.');
        onComplete();
      } else {
        alert('설문 제출 중 오류가 발생했습니다.');
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
            {question.options.map((option: string, index: number) => (
              <label key={index} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800">
                <input
                  type="radio"
                  name={question._id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleResponseChange(question._id, e.target.value)}
                  className="text-surbate focus:ring-surbate"
                />
                <span className="text-zinc-100">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'multiple_choice':
        return (
          <div className="space-y-2">
            {question.options.map((option: string, index: number) => (
              <label key={index} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800">
                <input
                  type="checkbox"
                  value={option}
                  checked={Array.isArray(value) && value.includes(option)}
                  onChange={(e) => {
                    const currentValues = Array.isArray(value) ? value : [];
                    if (e.target.checked) {
                      handleResponseChange(question._id, [...currentValues, option]);
                    } else {
                      handleResponseChange(question._id, currentValues.filter(v => v !== option));
                    }
                  }}
                  className="text-surbate focus:ring-surbate"
                />
                <span className="text-zinc-100">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleResponseChange(question._id, e.target.value)}
            className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="답변을 입력하세요"
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => handleResponseChange(question._id, e.target.value)}
            rows={4}
            className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
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
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
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
    <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-4 sm:p-6">
      {/* 진행률 표시 */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-zinc-400 mb-2">
          <span>질문 {currentQuestionIndex + 1} / {questions.length}</span>
          <span>{Math.round(progress)}% 완료</span>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-surbate to-brand-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 현재 질문 */}
      <div className="mb-8">
        <h2 className="text-lg sm:text-xl font-semibold text-zinc-100 mb-2">
          {currentQuestion.text}
          {currentQuestion.required && <span className="text-red-400 ml-1">*</span>}
        </h2>
        {currentQuestion.description && (
          <p className="text-sm text-zinc-400 mb-4">{currentQuestion.description}</p>
        )}
        
        {renderQuestionInput(currentQuestion)}
        
        {errors[currentQuestion._id] && (
          <p className="text-red-400 text-sm mt-2">{errors[currentQuestion._id]}</p>
        )}
      </div>

      {/* 네비게이션 버튼 */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          className="px-4 py-2 text-sm bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          이전
        </button>

        {currentQuestionIndex === questions.length - 1 ? (
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