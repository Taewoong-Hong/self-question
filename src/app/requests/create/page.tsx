'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { requestApi } from '@/lib/api';

export default function CreateRequestPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    author_nickname: '',
    password: '',
    is_public: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim() || 
        !formData.author_nickname.trim() || !formData.password) {
      alert('모든 필수 항목을 입력해주세요.');
      return;
    }

    if (formData.password.length < 4) {
      alert('비밀번호는 4자 이상 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      await requestApi.create(formData);
      router.push('/requests');
    } catch (error: any) {
      alert(error.response?.data?.error || '요청 작성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen max-w-3xl mx-auto">
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link
            href="/requests"
            className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold">요청 작성</h1>
        </div>
      </div>

      {/* 작성 폼 */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-6 space-y-6">
          {/* 제목 */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-2">
              제목 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="제목을 입력하세요"
              className="w-full px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              maxLength={100}
              required
            />
          </div>

          {/* 내용 */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-2">
              내용 <span className="text-red-400">*</span>
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="요청 내용을 자세히 작성해주세요"
              className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
              rows={10}
              maxLength={2000}
              required
            />
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-500">
              {formData.content.length}/2000
            </p>
          </div>

          {/* 공개 여부 */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_public}
                onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                className="w-4 h-4 bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 rounded text-brand-500 focus:ring-brand-500 focus:ring-offset-0"
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                공개 게시 (체크 해제 시 비공개로 작성됩니다)
              </span>
            </label>
          </div>

          {/* 작성자 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-2">
                닉네임 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.author_nickname}
                onChange={(e) => setFormData({ ...formData, author_nickname: e.target.value })}
                placeholder="닉네임을 입력하세요"
                className="w-full px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                maxLength={20}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-2">
                비밀번호 <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="수정/삭제 시 필요합니다"
                className="w-full px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                minLength={4}
                required
              />
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-500">
                4자 이상 입력해주세요
              </p>
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 justify-end">
          <Link
            href="/requests"
            className="px-6 py-2 text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-gradient-to-r from-surbate to-brand-600 text-zinc-900 font-semibold rounded-lg hover:from-brand-400 hover:to-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isSubmitting ? '작성 중...' : '작성하기'}
          </button>
        </div>
      </form>
    </div>
  );
}