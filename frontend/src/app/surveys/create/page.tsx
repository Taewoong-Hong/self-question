'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { surveyApi } from '@/lib/api';
import { SurveyCreateData, QuestionType } from '@/types/survey';

export default function CreateSurveyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<SurveyCreateData>({
    title: '',
    description: '',
    questions: [
      {
        text: '',
        type: 'single_choice',
        required: true,
        options: ['', '']
      }
    ],
    creator_nickname: '',
    admin_password: '',
    tags: [],
    start_date: new Date().toISOString().slice(0, 16),
    end_date: ''
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
          text: '',
          type: 'single_choice',
          required: true,
          options: ['', '']
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
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setFormData({ ...formData, questions: newQuestions });
  };

  const addOption = (questionIndex: number) => {
    const newQuestions = [...formData.questions];
    if (!newQuestions[questionIndex].options) {
      newQuestions[questionIndex].options = [];
    }
    newQuestions[questionIndex].options!.push('');
    setFormData({ ...formData, questions: newQuestions });
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const newQuestions = [...formData.questions];
    if (newQuestions[questionIndex].options) {
      newQuestions[questionIndex].options![optionIndex] = value;
      setFormData({ ...formData, questions: newQuestions });
    }
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const newQuestions = [...formData.questions];
    if (newQuestions[questionIndex].options && newQuestions[questionIndex].options!.length > 2) {
      newQuestions[questionIndex].options!.splice(optionIndex, 1);
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
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                value={formData.creator_nickname}
                onChange={(e) => setFormData({ ...formData, creator_nickname: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="태그1, 태그2 (쉼표로 구분)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  시작일시
                </label>
                <input
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  종료일시
                </label>
                <input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
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
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
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
                    value={question.text}
                    onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="질문을 입력하세요"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={question.type}
                      onChange={(e) => updateQuestion(qIndex, 'type', e.target.value)}
                      className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                        className="rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-zinc-300">필수 응답</span>
                    </label>
                  </div>

                  {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
                    <div className="space-y-2">
                      {question.options?.map((option, oIndex) => (
                        <div key={oIndex} className="flex gap-2">
                          <input
                            type="text"
                            required
                            value={option}
                            onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                            className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            placeholder={`옵션 ${oIndex + 1}`}
                          />
                          {question.options!.length > 2 && (
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
                        className="px-3 py-1 text-sm text-emerald-400 hover:text-emerald-300"
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
            className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
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