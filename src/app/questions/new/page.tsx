'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

export default function NewQuestionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    nickname: '',
    password: '',
    category: '',
    tags: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim() || !formData.nickname.trim() || !formData.password) {
      alert('필수 항목을 모두 입력해주세요.');
      return;
    }

    if (formData.password.length < 6) {
      alert('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    try {
      setLoading(true);
      
      const tags = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const response = await axios.post('/api/questions', {
        title: formData.title.trim(),
        content: formData.content.trim(),
        nickname: formData.nickname.trim(),
        password: formData.password,
        category: formData.category.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined
      });

      router.push(`/questions/${response.data.question._id}`);
    } catch (error: any) {
      alert(error.response?.data?.error || '질문 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">새 질문 작성</h1>
        <p className="text-zinc-400">궁금한 점을 질문해보세요</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 제목 */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            제목 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="질문 제목을 입력하세요"
            maxLength={200}
          />
        </div>

        {/* 내용 */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            내용 <span className="text-red-400">*</span>
          </label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
            placeholder="질문 내용을 자세히 작성해주세요"
            rows={10}
            maxLength={5000}
          />
          <p className="mt-1 text-xs text-zinc-500">
            {formData.content.length}/5000
          </p>
        </div>

        {/* 카테고리 */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            카테고리
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">선택하세요</option>
            <option value="일반">일반</option>
            <option value="기술">기술</option>
            <option value="사용법">사용법</option>
            <option value="오류">오류</option>
            <option value="제안">제안</option>
            <option value="기타">기타</option>
          </select>
        </div>

        {/* 태그 */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            태그
          </label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="태그를 쉼표로 구분하여 입력 (예: 투표, 설문, 사용법)"
          />
        </div>

        {/* 작성자 정보 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              닉네임 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="닉네임"
              maxLength={20}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              비밀번호 <span className="text-red-400">*</span>
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="수정/삭제 시 필요 (6자 이상)"
            />
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? '생성 중...' : '질문 생성'}
          </button>
          <Link
            href="/questions"
            className="px-6 py-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 font-medium"
          >
            취소
          </Link>
        </div>
      </form>
    </div>
  );
}