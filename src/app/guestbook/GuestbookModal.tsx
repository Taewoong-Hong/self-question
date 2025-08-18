'use client';

import { useState } from 'react';
import { GUESTBOOK_COLORS } from '@/types/guestbook';

interface GuestbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string, nickname?: string, password?: string) => void;
  selectedColor: string;
  onColorChange: (color: string) => void;
}

export default function GuestbookModal({
  isOpen,
  onClose,
  onSubmit,
  selectedColor,
  onColorChange,
}: GuestbookModalProps) {
  const [content, setContent] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content.trim(), nickname.trim() || undefined, password || undefined);
      setContent('');
      setNickname('');
      setPassword('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div 
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      />
      
      {/* 모달 */}
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl max-w-md w-full z-[9999]">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">메모 남기기</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 내용 입력 */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                내용 <span className="text-red-400">*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="메모를 남겨주세요..."
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                rows={4}
                maxLength={200}
                required
              />
              <p className="mt-1 text-xs text-zinc-500">
                {content.length}/200
              </p>
            </div>

            {/* 닉네임 입력 */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                닉네임 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="닉네임을 입력하세요"
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                maxLength={20}
                required
              />
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                비밀번호 <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="삭제 시 필요한 비밀번호"
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                minLength={4}
                required
              />
              <p className="mt-1 text-xs text-zinc-500">
                메모 삭제 시 필요합니다. 잊지 마세요!
              </p>
            </div>

            {/* 색상 선택 */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                메모지 색상
              </label>
              <div className="flex gap-2 flex-wrap">
                {GUESTBOOK_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onColorChange(color)}
                    className={`w-10 h-10 rounded-lg border-2 transition-all ${
                      selectedColor === color 
                        ? 'border-zinc-100 scale-110' 
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* 미리보기 */}
            <div className="p-4 bg-zinc-800 rounded-lg">
              <p className="text-sm text-zinc-400 mb-2">미리보기</p>
              <div
                className="w-32 h-32 p-3 shadow-lg rounded-sm"
                style={{
                  backgroundColor: selectedColor,
                  transform: 'rotate(-2deg)',
                }}
              >
                <p className="text-zinc-900 text-xs break-words overflow-hidden">
                  {content || '메모 내용이 여기에 표시됩니다'}
                </p>
                {(nickname || content) && (
                  <p className="text-zinc-700 text-xs mt-2 font-medium">
                    - {nickname || '(닉네임)'}
                  </p>
                )}
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={!content.trim() || !nickname.trim() || !password || isSubmitting}
                className="px-6 py-2 bg-gradient-to-r from-surbate to-brand-600 text-zinc-900 font-semibold rounded-lg hover:from-brand-400 hover:to-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isSubmitting ? '작성 중...' : '메모 남기기'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}