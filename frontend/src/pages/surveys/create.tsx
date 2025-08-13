import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { surveyApi } from '@/lib/api';
import { QuestionType, Question } from '@/types/survey';
import toast from 'react-hot-toast';

export default function CreateSurveyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      type: 'single_choice',
      question: '',
      required: true,
      options: [''],
      order: questions.length,
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const addOption = (questionIndex: number) => {
    const updated = [...questions];
    if (!updated[questionIndex].options) {
      updated[questionIndex].options = [];
    }
    updated[questionIndex].options!.push('');
    setQuestions(updated);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions];
    if (updated[questionIndex].options) {
      updated[questionIndex].options![optionIndex] = value;
      setQuestions(updated);
    }
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    if (updated[questionIndex].options) {
      updated[questionIndex].options = updated[questionIndex].options!.filter((_, i) => i !== optionIndex);
      setQuestions(updated);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('제목을 입력해주세요.');
      return;
    }

    if (!adminPassword || adminPassword.length < 8) {
      toast.error('관리자 비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    if (questions.length === 0) {
      toast.error('최소 1개 이상의 질문을 추가해주세요.');
      return;
    }

    // 질문 유효성 검사
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        toast.error(`${i + 1}번째 질문의 내용을 입력해주세요.`);
        return;
      }
      if ((q.type === 'single_choice' || q.type === 'multiple_choice') && (!q.options || q.options.filter(o => o.trim()).length < 2)) {
        toast.error(`${i + 1}번째 질문의 선택지를 2개 이상 입력해주세요.`);
        return;
      }
    }

    setLoading(true);
    try {
      const result = await surveyApi.create({
        title: title.trim(),
        description: description.trim(),
        tags,
        admin_password: adminPassword,
        questions,
      });

      toast.success('설문이 성공적으로 생성되었습니다!');
      
      // 관리자 URL 복사
      const adminUrl = `${window.location.origin}/surveys/${result.id}/admin`;
      await navigator.clipboard.writeText(adminUrl);
      toast.success('관리자 URL이 클립보드에 복사되었습니다.');

      // 설문 페이지로 이동
      router.push(`/surveys/${result.id}`);
    } catch (error: any) {
      toast.error(error.message || '설문 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getQuestionTypeLabel = (type: QuestionType) => {
    const labels: Record<QuestionType, string> = {
      single_choice: '단일 선택',
      multiple_choice: '다중 선택',
      short_text: '단답형',
      long_text: '장문형',
      rating: '평점',
    };
    return labels[type];
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">설문 만들기</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 */}
          <div className="bg-white shadow-sm rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">기본 정보</h2>
            
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                placeholder="설문 제목을 입력하세요"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                설명
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                placeholder="설문에 대한 설명을 입력하세요 (선택사항)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                태그
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  placeholder="태그를 입력하고 Enter를 누르세요"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  추가
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-light text-primary"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-2 text-primary hover:text-primary-dark"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700 mb-1">
                관리자 비밀번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="adminPassword"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                placeholder="8자 이상의 비밀번호를 입력하세요"
              />
              <p className="mt-1 text-sm text-gray-500">
                설문 수정/삭제 시 필요합니다. 분실하면 복구할 수 없으니 안전하게 보관하세요.
              </p>
            </div>
          </div>

          {/* 질문 목록 */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">질문</h2>
              <button
                type="button"
                onClick={addQuestion}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark"
              >
                질문 추가
              </button>
            </div>

            {questions.map((question, qIndex) => (
              <div key={question.id} className="bg-white shadow-sm rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium text-gray-900">질문 {qIndex + 1}</h3>
                  <button
                    type="button"
                    onClick={() => removeQuestion(qIndex)}
                    className="text-red-600 hover:text-red-800"
                  >
                    삭제
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      질문 유형
                    </label>
                    <select
                      value={question.type}
                      onChange={(e) => updateQuestion(qIndex, { type: e.target.value as QuestionType })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    >
                      <option value="single_choice">단일 선택</option>
                      <option value="multiple_choice">다중 선택</option>
                      <option value="short_text">단답형</option>
                      <option value="long_text">장문형</option>
                      <option value="rating">평점</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      필수 여부
                    </label>
                    <select
                      value={question.required ? 'true' : 'false'}
                      onChange={(e) => updateQuestion(qIndex, { required: e.target.value === 'true' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    >
                      <option value="true">필수</option>
                      <option value="false">선택</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    질문 내용
                  </label>
                  <input
                    type="text"
                    value={question.question}
                    onChange={(e) => updateQuestion(qIndex, { question: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    placeholder="질문을 입력하세요"
                  />
                </div>

                {/* 선택형 질문의 옵션 */}
                {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      선택지
                    </label>
                    <div className="space-y-2">
                      {question.options?.map((option, oIndex) => (
                        <div key={oIndex} className="flex gap-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                            placeholder={`선택지 ${oIndex + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() => removeOption(qIndex, oIndex)}
                            className="px-3 py-2 text-red-600 hover:text-red-800"
                            disabled={question.options!.length <= 1}
                          >
                            삭제
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addOption(qIndex)}
                        className="text-sm text-primary hover:text-primary-dark"
                      >
                        + 선택지 추가
                      </button>
                    </div>
                  </div>
                )}

                {/* 평점형 질문의 설정 */}
                {question.type === 'rating' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        최소값
                      </label>
                      <input
                        type="number"
                        value={question.min_rating || 1}
                        onChange={(e) => updateQuestion(qIndex, { min_rating: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                        min="0"
                        max="10"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        최대값
                      </label>
                      <input
                        type="number"
                        value={question.max_rating || 5}
                        onChange={(e) => updateQuestion(qIndex, { max_rating: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                        min="1"
                        max="10"
                      />
                    </div>
                  </div>
                )}

                {/* 텍스트형 질문의 설정 */}
                {(question.type === 'short_text' || question.type === 'long_text') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      최대 글자수 (선택사항)
                    </label>
                    <input
                      type="number"
                      value={question.max_length || ''}
                      onChange={(e) => updateQuestion(qIndex, { max_length: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                      placeholder="제한 없음"
                      min="1"
                    />
                  </div>
                )}
              </div>
            ))}

            {questions.length === 0 && (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <p className="text-gray-500">아직 추가된 질문이 없습니다.</p>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="mt-4 text-primary hover:text-primary-dark"
                >
                  첫 번째 질문 추가하기
                </button>
              </div>
            )}
          </div>

          {/* 제출 버튼 */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '생성 중...' : '설문 생성'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}