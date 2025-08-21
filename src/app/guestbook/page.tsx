'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { guestbookApi } from '@/lib/api';
import { GuestbookNote, GUESTBOOK_COLORS } from '@/types/guestbook';
import StickyNote from './StickyNote';

export default function GuestbookPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<GuestbookNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const data = await guestbookApi.list();
      setNotes(data.notes);
    } catch (error) {
      console.error('방명록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePosition = async (id: string, x: number, y: number) => {
    try {
      await guestbookApi.updatePosition(id, {
        position: { x, y },
        z_index: Date.now(), // 최상위로 이동
      });
      
      // 로컬 상태 업데이트
      setNotes(notes.map(note => 
        note.id === id 
          ? { ...note, position: { x, y }, z_index: Date.now() }
          : note
      ));
    } catch (error) {
      console.error('위치 업데이트 실패:', error);
    }
  };

  const handleDeleteNote = async (id: string) => {
    const password = prompt('비밀번호를 입력하세요:');
    if (!password) return;
    
    try {
      await guestbookApi.delete(id, password);
      setNotes(notes.filter(note => note.id !== id));
    } catch (error: any) {
      alert(error.response?.data?.error || '삭제에 실패했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950">
      {/* 고정 헤더 */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">방명록</h1>
              <p className="text-zinc-400 text-sm mt-1">자유롭게 메모를 남겨주세요</p>
            </div>
            <button
              onClick={() => router.push('/guestbook/write')}
              className="relative p-3 border border-zinc-700 text-zinc-100 rounded-lg hover:border-zinc-500 hover:bg-zinc-800/50 transform hover:-translate-y-0.5 transition-all duration-200"
              title="메모 남기기"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <div className="absolute -top-1 -left-1 w-4 h-4 bg-zinc-950 border border-zinc-100 rounded-full flex items-center justify-center">
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 전체 화면 방명록 보드 */}
      <div className="absolute inset-0 pt-20 overflow-hidden">
        <div className="relative w-full h-full bg-zinc-900/30">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-100"></div>
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <svg className="w-12 h-12 text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <p className="text-zinc-400 text-lg font-medium mb-2">아직 메모가 없습니다</p>
              <p className="text-zinc-500 text-sm mb-6">첫 번째 메모를 남겨보세요!</p>
              <button
                onClick={() => router.push('/guestbook/write')}
                className="px-6 py-3 bg-gradient-to-r from-surbate to-brand-600 text-zinc-900 font-semibold rounded-lg hover:from-brand-400 hover:to-brand-600 shadow-sm hover:shadow-lg hover:shadow-surbate/20 transform hover:-translate-y-0.5 transition-all duration-200"
              >
                메모 남기기
              </button>
            </div>
          ) : (
            <>
              {notes.map((note) => (
                <StickyNote
                  key={note.id}
                  note={note}
                  onUpdatePosition={handleUpdatePosition}
                  onDelete={handleDeleteNote}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}