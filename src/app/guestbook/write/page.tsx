'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { guestbookApi } from '@/lib/api';
import { GUESTBOOK_COLORS } from '@/types/guestbook';

export default function GuestbookWritePage() {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [selectedColor, setSelectedColor] = useState(GUESTBOOK_COLORS[0]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      alert('내용을 입력해주세요.');
      return;
    }

    setLoading(true);
    
    try {
      await guestbookApi.create({
        content,
        color: selectedColor.bg,
        author_nickname: nickname,
        password,
      });
      
      router.push('/guestbook');
    } catch (error: any) {
      alert(error.response?.data?.error || '방명록 작성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen max-w-2xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">방명록 작성</h1>
        <button
          onClick={() => router.back()}
          className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
          title="뒤로가기"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 내용 입력 */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            내용 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-surbate focus:outline-none focus:ring-1 focus:ring-surbate resize-none"
            rows={6}
            maxLength={500}
            placeholder="자유롭게 메시지를 남겨주세요..."
            autoFocus
          />
          <div className="mt-2 text-sm text-zinc-500 text-right">
            {content.length}/500
          </div>
        </div>

        {/* 색상 선택 */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-3">
            스티커 색상
          </label>
          <div className="flex gap-3 flex-wrap">
            {GUESTBOOK_COLORS.map((color) => (
              <button
                key={color.id}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={`relative w-12 h-12 rounded-lg transition-all duration-200 transform hover:scale-110 ${
                  selectedColor.id === color.id ? 'ring-2 ring-offset-2 ring-offset-zinc-950 ring-zinc-100 scale-110' : ''
                }`}
                style={{ backgroundColor: color.bg }}
                title={color.name}
              >
                {selectedColor.id === color.id && (
                  <svg className="absolute inset-0 m-auto w-6 h-6 text-zinc-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 닉네임 입력 */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            닉네임 <span className="text-zinc-500 text-xs">(선택)</span>
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-surbate focus:outline-none focus:ring-1 focus:ring-surbate"
            maxLength={20}
            placeholder="익명"
          />
        </div>

        {/* 비밀번호 입력 */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            비밀번호 <span className="text-zinc-500 text-xs">(삭제시 필요)</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-surbate focus:outline-none focus:ring-1 focus:ring-surbate"
            placeholder="비밀번호 (선택)"
          />
          <p className="mt-2 text-xs text-zinc-500">
            비밀번호를 설정하면 나중에 메모를 삭제할 수 있습니다.
          </p>
        </div>

        {/* 버튼 그룹 */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-6 py-3 border border-zinc-700 text-zinc-300 rounded-lg hover:border-zinc-500 hover:bg-zinc-800/50 transition-all duration-200"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-surbate to-brand-600 text-zinc-900 font-semibold rounded-lg hover:from-brand-400 hover:to-brand-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-lg hover:shadow-surbate/20 transform hover:-translate-y-0.5 transition-all duration-200"
          >
            {loading ? '작성 중...' : '작성하기'}
          </button>
        </div>
      </form>
    </div>
  );
}