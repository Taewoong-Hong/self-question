'use client';

import { useState, useRef, useEffect } from 'react';
import { GuestbookNote } from '@/types/guestbook';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface StickyNoteProps {
  note: GuestbookNote;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
}

export default function StickyNote({ note, onUpdatePosition, onDelete }: StickyNoteProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(note.position);
  const [showActions, setShowActions] = useState(false);
  const noteRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setPosition(note.position);
  }, [note.position]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.note-actions')) return;
    
    setIsDragging(true);
    const rect = noteRef.current?.parentElement?.getBoundingClientRect();
    if (rect) {
      dragStartPos.current = {
        x: e.clientX - (rect.width * position.x / 100),
        y: e.clientY - (rect.height * position.y / 100),
      };
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !noteRef.current) return;

    const rect = noteRef.current.parentElement?.getBoundingClientRect();
    if (!rect) return;

    const newX = ((e.clientX - dragStartPos.current.x) / rect.width) * 100;
    const newY = ((e.clientY - dragStartPos.current.y) / rect.height) * 100;

    // 경계 체크
    const boundedX = Math.max(0, Math.min(90, newX));
    const boundedY = Math.max(0, Math.min(90, newY));

    setPosition({ x: boundedX, y: boundedY });
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      onUpdatePosition(note.id, position.x, position.y);
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, position]);

  // 터치 이벤트 핸들러
  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.note-actions')) return;
    
    setIsDragging(true);
    const rect = noteRef.current?.parentElement?.getBoundingClientRect();
    if (rect) {
      const touch = e.touches[0];
      dragStartPos.current = {
        x: touch.clientX - (rect.width * position.x / 100),
        y: touch.clientY - (rect.height * position.y / 100),
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !noteRef.current) return;

    const rect = noteRef.current.parentElement?.getBoundingClientRect();
    if (!rect) return;

    const touch = e.touches[0];
    const newX = ((touch.clientX - dragStartPos.current.x) / rect.width) * 100;
    const newY = ((touch.clientY - dragStartPos.current.y) / rect.height) * 100;

    const boundedX = Math.max(0, Math.min(90, newX));
    const boundedY = Math.max(0, Math.min(90, newY));

    setPosition({ x: boundedX, y: boundedY });
  };

  const handleTouchEnd = () => {
    if (isDragging) {
      setIsDragging(false);
      onUpdatePosition(note.id, position.x, position.y);
    }
  };

  return (
    <div
      ref={noteRef}
      className={`absolute w-48 h-48 p-4 shadow-lg rounded-sm cursor-move select-none transition-shadow ${
        isDragging ? 'shadow-2xl scale-105' : 'hover:shadow-xl'
      }`}
      style={{
        backgroundColor: note.color,
        left: `${position.x}%`,
        top: `${position.y}%`,
        zIndex: note.z_index || 0,
        transform: `rotate(${Math.sin(parseInt(note.id, 36)) * 3}deg)`,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* 삭제 버튼 */}
      <div className={`note-actions absolute -top-2 -right-2 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'}`}>
        <button
          onClick={() => onDelete(note.id)}
          className="w-6 h-6 bg-zinc-900 text-white rounded-full flex items-center justify-center hover:bg-zinc-800 transition-colors"
          title="삭제"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 내용 */}
      <div className="h-full flex flex-col">
        <p className="text-zinc-900 text-sm flex-1 break-words overflow-hidden">
          {note.content}
        </p>
        
        <div className="mt-2 text-xs text-zinc-700 space-y-1">
          {note.author_nickname && (
            <p className="font-medium">- {note.author_nickname}</p>
          )}
          <p className="opacity-70">
            {formatDistanceToNow(new Date(note.created_at), { 
              addSuffix: true, 
              locale: ko 
            })}
          </p>
        </div>
      </div>
    </div>
  );
}