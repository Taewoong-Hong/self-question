'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { surveyApi } from '@/lib/api';
import { SurveyCreateData, QuestionType } from '@/types/survey';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ko } from 'date-fns/locale';

export default function CreateSurveyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<SurveyCreateData>({
    title: '',
    description: '',
    questions: [
      {
        id: '1',
        title: '',
        type: 'single_choice',
        required: true,
        properties: {
          choices: [
            { id: '1', label: '' },
            { id: '2', label: '' }
          ]
        },
        order: 0
      }
    ],
    author_nickname: '',
    admin_password: '',
    tags: [],
    welcome_screen: {
      title: '',
      description: '',
      button_text: '시작하기',
      show_button: true
    },
    thankyou_screen: {
      title: '응답해 주셔서 감사합니다!',
      description: '',
      show_response_count: true
    },
    settings: {
      show_progress_bar: true,
      show_question_number: true,
      allow_back_navigation: true,
      autosave_progress: true
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.admin_password) {
      alert('제목과 작성자 비밀번호는 필수입니다.');
      return;
    }

    if (formData.admin_password.length < 8) {
      alert('작성자 비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    try {
      setLoading(true);
      const result = await surveyApi.create(formData);
      alert(`설문이 생성되었습니다!\n공개 URL: ${window.location.origin}/surveys/${result.id}\n작성자 페이지: ${window.location.origin}/surveys/${result.id}/admin`);
      router.push(`/surveys/${result.id}`);
    } catch (error) {
      console.error('설문 생성 실패:', error);
      alert('설문 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [
        ...formData.questions,
        {
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
        }
      ]
    });
  };

  const removeQuestion = (index: number) => {
    if (formData.questions.length > 1) {
      setFormData({
        ...formData,
        questions: formData.questions.filter((_, i) => i !== index)
      });
    }
  };

  const updateQuestion = (index: number, field: string, value: any) => {
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
    const newQuestions = [...formData.questions];
    if (newQuestions[questionIndex].properties?.choices) {
      newQuestions[questionIndex].properties!.choices![optionIndex].label = value;
      setFormData({ ...formData, questions: newQuestions });
    }
  };

  const toggleOtherOption = (questionIndex: number, optionIndex: number, isOther: boolean) => {
    const newQuestions = [...formData.questions];
    if (newQuestions[questionIndex].properties?.choices) {
      newQuestions[questionIndex].properties!.choices![optionIndex].is_other = isOther;
      if (isOther) {
        // '기타' 옵션이 활성화되면 라벨을 '기타'로 설정
        newQuestions[questionIndex].properties!.choices![optionIndex].label = '기타';
      }
      setFormData({ ...formData, questions: newQuestions });
    }
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const newQuestions = [...formData.questions];
    if (newQuestions[questionIndex].properties?.choices && 
        newQuestions[questionIndex].properties!.choices!.length > 2) {
      newQuestions[questionIndex].properties!.choices!.splice(optionIndex, 1);
      setFormData({ ...formData, questions: newQuestions });
    }
  };

  return (
    <div className="min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">새 설문 만들기</h1>
        <p className="text-zinc-400 mt-1">다양한 질문으로 의견을 수집하세요</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">기본 정보</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                설문 제목 *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="예: 신제품 출시에 대한 의견 조사"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                설명
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                rows={3}
                placeholder="설문에 대한 설명을 입력하세요"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                작성자 닉네임
              </label>
              <input
                type="text"
                value={formData.author_nickname}
                onChange={(e) => setFormData({ ...formData, author_nickname: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="익명 (선택사항)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                태그
              </label>
              <input
                type="text"
                value={formData.tags?.join(', ')}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag) 
                })}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="태그1, 태그2 (쉼표로 구분)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                종료일시 (선택사항)
              </label>
              <DatePicker
                selected={formData.settings?.close_at ? new Date(formData.settings.close_at) : null}
                onChange={(date) => setFormData({ 
                  ...formData, 
                  settings: {
                    ...formData.settings,
                    close_at: date ? date.toISOString() : undefined
                  }
                })}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={1}
                dateFormat="yyyy년 MM월 dd일 HH:mm"
                locale={ko}
                placeholderText="종료일시를 선택하세요 (선택사항)"
                isClearable
                className="w-full px-2 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                wrapperClassName="w-full"
                withPortal
                portalId="root-portal"
                minDate={new Date()}
              />
            </div>
          </div>
        </div>

        {/* 질문 섹션 */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
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
              <div key={qIndex} className="bg-zinc-800/50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-sm font-medium text-zinc-300">질문 {qIndex + 1}</h3>
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
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="질문을 입력하세요"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={question.type}
                      onChange={(e) => updateQuestion(qIndex, 'type', e.target.value)}
                      className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
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
                        className="rounded bg-zinc-900 border-zinc-700 text-brand-500 focus:ring-brand-500"
                      />
                      <span className="text-sm text-zinc-300">필수 응답</span>
                    </label>
                  </div>

                  {/* 조건부 로직 설정 */}
                  {qIndex > 0 && (
                    <div className="mt-3 p-3 bg-zinc-900/50 rounded-lg">
                      <label className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={!!question.skip_logic}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateQuestion(qIndex, 'skip_logic', {
                                condition: {
                                  question_id: formData.questions[0].id || '1',
                                  operator: 'equals',
                                  value: ''
                                },
                                action: 'skip'
                              });
                            } else {
                              updateQuestion(qIndex, 'skip_logic', undefined);
                            }
                          }}
                          className="rounded bg-zinc-900 border-zinc-700 text-brand-500 focus:ring-brand-500"
                        />
                        <span className="text-sm text-zinc-300">조건부 표시</span>
                      </label>
                      
                      {question.skip_logic && (
                        <div className="space-y-2 mt-2">
                          <div className="grid grid-cols-3 gap-2">
                            <select
                              value={question.skip_logic.condition.question_id}
                              onChange={(e) => updateQuestion(qIndex, 'skip_logic', {
                                ...question.skip_logic,
                                condition: { ...question.skip_logic.condition, question_id: e.target.value }
                              })}
                              className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100"
                            >
                              {formData.questions.slice(0, qIndex).map((q, i) => (
                                <option key={i} value={q.id || i.toString()}>
                                  질문 {i + 1}: {q.title || '(제목 없음)'}
                                </option>
                              ))}
                            </select>
                            
                            <select
                              value={question.skip_logic.condition.operator}
                              onChange={(e) => updateQuestion(qIndex, 'skip_logic', {
                                ...question.skip_logic,
                                condition: { ...question.skip_logic.condition, operator: e.target.value as any }
                              })}
                              className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100"
                            >
                              <option value="equals">같을 때</option>
                              <option value="not_equals">다를 때</option>
                            </select>
                            
                            {(() => {
                              const targetQuestion = formData.questions.find(q => q.id === question.skip_logic.condition.question_id);
                              if (targetQuestion && (targetQuestion.type === 'single_choice' || targetQuestion.type === 'multiple_choice')) {
                                return (
                                  <select
                                    value={question.skip_logic.condition.value}
                                    onChange={(e) => updateQuestion(qIndex, 'skip_logic', {
                                      ...question.skip_logic,
                                      condition: { ...question.skip_logic.condition, value: e.target.value }
                                    })}
                                    className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100"
                                  >
                                    <option value="">선택하세요</option>
                                    {targetQuestion.properties?.choices?.map((choice) => (
                                      <option key={choice.id} value={choice.id}>
                                        {choice.label || '(라벨 없음)'}
                                      </option>
                                    ))}
                                  </select>
                                );
                              } else {
                                return (
                                  <input
                                    type="text"
                                    value={question.skip_logic.condition.value}
                                    onChange={(e) => updateQuestion(qIndex, 'skip_logic', {
                                      ...question.skip_logic,
                                      condition: { ...question.skip_logic.condition, value: e.target.value }
                                    })}
                                    placeholder="값"
                                    className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100"
                                  />
                                );
                              }
                            })()}
                          </div>
                          
                          <p className="text-xs text-zinc-500">
                            {question.skip_logic.action === 'skip' ? '이 조건이 맞으면 질문을 건너뜁니다' : '이 조건이 맞을 때만 표시됩니다'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
                    <div className="space-y-2">
                      {question.properties?.choices?.map((choice, oIndex) => (
                        <div key={choice.id} className="flex gap-2">
                          <input
                            type="text"
                            required
                            value={choice.label}
                            onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                            className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            placeholder={`옵션 ${oIndex + 1}`}
                          />
                          <label className="flex items-center gap-1 text-sm text-zinc-400">
                            <input
                              type="checkbox"
                              checked={choice.is_other || false}
                              onChange={(e) => toggleOtherOption(qIndex, oIndex, e.target.checked)}
                              className="rounded bg-zinc-900 border-zinc-700 text-brand-500 focus:ring-brand-500"
                            />
                            기타
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

        {/* 작성자 설정 */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">작성자 설정</h2>
          
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              작성자 비밀번호 *
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={formData.admin_password}
              onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="8자 이상의 비밀번호"
            />
            <p className="mt-2 text-sm text-zinc-500">
              이 비밀번호로 설문을 수정하거나 결과를 확인할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-surbate to-brand-600 text-zinc-900 font-semibold rounded-lg hover:from-brand-400 hover:to-brand-600 shadow-sm hover:shadow-lg hover:shadow-surbate/20 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
          >
            {loading ? '생성 중...' : '설문 만들기'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}