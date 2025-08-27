'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { surveyApi } from '@/lib/api';
import { SurveyCreateData, QuestionType, Question } from '@/types/survey';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ko } from 'date-fns/locale';
import toast from 'react-hot-toast';
import TagInput from '@/components/TagInput';

export default function EditSurveyPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [authenticating, setAuthenticating] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [formData, setFormData] = useState<SurveyCreateData | null>(null);

  useEffect(() => {
    checkEditability();
  }, [surveyId]);

  const checkEditability = async () => {
    try {
      // localStorage에서 토큰 확인
      const savedToken = localStorage.getItem(`survey_author_${surveyId}`);
      if (!savedToken) {
        toast.error('작성자 인증이 필요합니다.');
        router.push(`/surveys/${surveyId}/admin`);
        return;
      }

      // 설문 데이터 가져오기
      const response = await surveyApi.get(surveyId);
      const survey = response.survey;

      // 응답자가 있는지 확인
      if (survey.stats?.response_count > 0) {
        toast.error('응답자가 있는 설문은 수정할 수 없습니다.');
        router.push(`/surveys/${surveyId}/admin`);
        return;
      }

      // 수정 가능한 경우 폼 데이터 설정
      setCanEdit(true);
      setFormData({
        title: survey.title,
        description: survey.description || '',
        start_at: survey.start_at ? new Date(survey.start_at).toISOString() : new Date().toISOString(),
        end_at: survey.end_at ? new Date(survey.end_at).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        questions: survey.questions,
        author_nickname: survey.author_nickname || '',
        admin_password: '', // 비밀번호는 보안상 표시하지 않음
        tags: survey.tags || [],
        welcome_screen: survey.welcome_screen || {
          title: '',
          description: '',
          button_text: '시작하기',
          show_button: true
        },
        thankyou_screen: survey.thankyou_screen || {
          title: '응답해 주셔서 감사합니다!',
          description: '',
          show_response_count: true
        },
        settings: survey.settings || {
          show_progress_bar: true,
          show_question_number: true,
          allow_back_navigation: true,
          autosave_progress: true
        },
        public_results: survey.public_results || false
      });
    } catch (error) {
      console.error('설문 조회 실패:', error);
      toast.error('설문을 불러올 수 없습니다.');
      router.push(`/surveys/${surveyId}`);
    } finally {
      setAuthenticating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData) return;

    if (!formData.title) {
      toast.error('제목은 필수입니다.');
      return;
    }

    try {
      setLoading(true);
      
      // localStorage에서 토큰 가져오기
      const token = localStorage.getItem(`survey_author_${surveyId}`);
      if (!token) {
        toast.error('작성자 인증이 필요합니다.');
        router.push(`/surveys/${surveyId}/admin`);
        return;
      }

      await surveyApi.update(surveyId, formData, token);
      toast.success('설문이 수정되었습니다.');
      router.push(`/surveys/${surveyId}/admin`);
    } catch (error: any) {
      console.error('설문 수정 실패:', error);
      toast.error(error.message || '설문 수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    if (!formData) return;
    
    const newQuestion: Question = {
      id: Date.now().toString(),
      title: '',
      type: 'single_choice',
      required: true,
      properties: {
        choices: [
          { id: Date.now().toString() + '1', label: '' },
          { id: Date.now().toString() + '2', label: '' }
        ]
      },
      order: formData.questions.length
    };
    
    setFormData({
      ...formData,
      questions: [...formData.questions, newQuestion]
    });
  };

  const removeQuestion = (index: number) => {
    if (!formData) return;
    
    if (formData.questions.length > 1) {
      setFormData({
        ...formData,
        questions: formData.questions.filter((_, i) => i !== index)
      });
    }
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    if (!formData) return;
    
    const newQuestions = [...formData.questions];
    if (field === 'type') {
      // 타입 변경 시 properties 초기화
      newQuestions[index] = {
        ...newQuestions[index],
        type: value,
        properties: value === 'single_choice' || value === 'multiple_choice'
          ? { choices: [{ id: '1', label: '' }, { id: '2', label: '' }] }
          : value === 'rating'
          ? { rating_scale: 5 }
          : { max_length: value === 'short_text' ? 200 : 1000 }
      };
    } else {
      newQuestions[index] = { ...newQuestions[index], [field]: value };
    }
    setFormData({ ...formData, questions: newQuestions });
  };

  const addOption = (questionIndex: number) => {
    if (!formData) return;
    
    const newQuestions = [...formData.questions];
    if (!newQuestions[questionIndex].properties) {
      newQuestions[questionIndex].properties = { choices: [] };
    }
    if (!newQuestions[questionIndex].properties!.choices) {
      newQuestions[questionIndex].properties!.choices = [];
    }
    newQuestions[questionIndex].properties!.choices!.push({
      id: Date.now().toString(),
      label: ''
    });
    setFormData({ ...formData, questions: newQuestions });
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    if (!formData) return;
    
    const newQuestions = [...formData.questions];
    if (newQuestions[questionIndex].properties?.choices) {
      newQuestions[questionIndex].properties!.choices![optionIndex].label = value;
      setFormData({ ...formData, questions: newQuestions });
    }
  };

  const toggleOtherOption = (questionIndex: number, optionIndex: number, isOther: boolean) => {
    if (!formData) return;
    
    const newQuestions = [...formData.questions];
    if (newQuestions[questionIndex].properties?.choices) {
      const choice = newQuestions[questionIndex].properties!.choices![optionIndex];
      choice.is_other = isOther;
      // 라벨이 비어있거나 기본 옵션 형식일 때만 '직접입력'으로 설정
      if (isOther && (!choice.label || choice.label.trim() === '' || choice.label.match(/^옵션 \d+$/))) {
        choice.label = '직접입력';
      }
      setFormData({ ...formData, questions: newQuestions });
    }
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    if (!formData) return;
    
    const newQuestions = [...formData.questions];
    if (newQuestions[questionIndex].properties?.choices && 
        newQuestions[questionIndex].properties!.choices!.length > 2) {
      newQuestions[questionIndex].properties!.choices!.splice(optionIndex, 1);
      setFormData({ ...formData, questions: newQuestions });
    }
  };

  if (authenticating || !formData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-100"></div>
      </div>
    );
  }

  if (!canEdit) {
    return null; // 리다이렉트 처리됨
  }

  return (
    <div className="min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">설문 수정하기</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">응답자가 없을 때만 수정할 수 있습니다</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {/* 기본 정보 섹션 */}
        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm dark:shadow-none">
          <h2 className="text-lg font-semibold mb-4">기본 정보</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                설문 제목 *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="예: 신제품 출시에 대한 의견 조사"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                설명
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                rows={3}
                placeholder="설문에 대한 설명을 입력하세요"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                작성자 닉네임
              </label>
              <input
                type="text"
                value={formData.author_nickname}
                onChange={(e) => setFormData({ ...formData, author_nickname: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="익명 (선택사항)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                태그
              </label>
              <TagInput
                tags={formData.tags || []}
                onChange={(tags) => setFormData({ ...formData, tags })}
                placeholder="태그 입력 후 Enter 또는 쉼표"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  시작일시
                </label>
                <DatePicker
                  selected={formData.start_at ? new Date(formData.start_at) : null}
                  onChange={(date) => setFormData({ ...formData, start_at: date?.toISOString() || '' })}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={1}
                  dateFormat="yyyy년 MM월 dd일 HH:mm"
                  locale={ko}
                  placeholderText="시작일시를 선택하세요"
                  className="w-full px-2 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  wrapperClassName="w-full"
                  withPortal
                  portalId="root-portal"
                  minDate={new Date()}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  종료일시
                </label>
                <DatePicker
                  selected={formData.end_at ? new Date(formData.end_at) : null}
                  onChange={(date) => setFormData({ ...formData, end_at: date?.toISOString() || '' })}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={1}
                  dateFormat="yyyy년 MM월 dd일 HH:mm"
                  locale={ko}
                  placeholderText="종료일시를 선택하세요"
                  className="w-full px-2 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  wrapperClassName="w-full"
                  withPortal
                  portalId="root-portal"
                  minDate={formData.start_at ? new Date(formData.start_at) : new Date()}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 질문 섹션 - 기존 create 페이지와 동일한 구조 */}
        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm dark:shadow-none">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">질문</h2>
            <button
              type="button"
              onClick={addQuestion}
              className="px-4 py-2 bg-gradient-to-r from-surbate to-brand-600 text-zinc-900 font-semibold rounded-lg hover:from-brand-400 hover:to-brand-600 shadow-sm hover:shadow-lg hover:shadow-surbate/20 transform hover:-translate-y-0.5 transition-all duration-200"
            >
              질문 추가
            </button>
          </div>

          <div className="space-y-6">
            {formData.questions.map((question, qIndex) => (
              <div key={qIndex} className="bg-gray-100 dark:bg-zinc-800/50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">질문 {qIndex + 1}</h3>
                  {formData.questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(qIndex)}
                      className="text-red-400 hover:text-red-300"
                    >
                      삭제
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    required
                    value={question.title}
                    onChange={(e) => updateQuestion(qIndex, 'title', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="질문을 입력하세요"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={question.type}
                      onChange={(e) => updateQuestion(qIndex, 'type', e.target.value)}
                      className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    >
                      <option value="single_choice">단일 선택</option>
                      <option value="multiple_choice">다중 선택</option>
                      <option value="short_text">단답형</option>
                      <option value="long_text">장문형</option>
                      <option value="rating">평점</option>
                    </select>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={question.required}
                        onChange={(e) => updateQuestion(qIndex, 'required', e.target.checked)}
                        className="rounded bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-brand-500 focus:ring-brand-500"
                      />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">필수 응답</span>
                    </label>
                  </div>

                  {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
                    <div className="space-y-2">
                      {question.properties?.choices?.map((choice, oIndex) => (
                        <div key={choice.id} className="flex gap-2">
                          <input
                            type="text"
                            required
                            value={choice.label}
                            onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                            className="flex-1 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            placeholder={`옵션 ${oIndex + 1}`}
                          />
                          <label className="flex items-center gap-1 text-sm text-zinc-400">
                            <input
                              type="checkbox"
                              checked={choice.is_other || false}
                              onChange={(e) => toggleOtherOption(qIndex, oIndex, e.target.checked)}
                              className="rounded bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-brand-500 focus:ring-brand-500"
                            />
                            직접입력
                          </label>
                          {question.properties!.choices!.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOption(qIndex, oIndex)}
                              className="px-3 py-2 text-red-400 hover:text-red-300"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addOption(qIndex)}
                        className="px-3 py-1 text-sm text-brand-400 hover:text-brand-300"
                      >
                        + 옵션 추가
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 설문 설정 */}
        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm dark:shadow-none">
          <h2 className="text-lg font-semibold mb-4">설문 설정</h2>
          
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.public_results || false}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    public_results: e.target.checked
                  })}
                  className="rounded text-surbate bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 focus:ring-2 ring-surbate"
                />
                <span>결과 공개</span>
              </label>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-500 ml-7">
                모든 사람이 설문 결과를 볼 수 있습니다 (체크하지 않으면 작성자만 볼 수 있습니다)
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-surbate to-brand-600 text-zinc-900 font-semibold rounded-lg hover:from-brand-400 hover:to-brand-600 shadow-sm hover:shadow-lg hover:shadow-surbate/20 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
          >
            {loading ? '수정 중...' : '설문 수정'}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/surveys/${surveyId}/admin`)}
            className="px-6 py-3 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}