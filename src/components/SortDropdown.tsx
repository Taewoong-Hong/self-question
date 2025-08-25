'use client';

import { useState, useRef, useEffect } from 'react';

interface SortOption {
  value: string;
  label: string;
  sortBy: 'date' | 'popular';
  sortOrder: 'desc' | 'asc';
}

interface SortDropdownProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const sortOptions: SortOption[] = [
  { value: 'latest', label: '최신순', sortBy: 'date', sortOrder: 'desc' },
  { value: 'oldest', label: '오래된순', sortBy: 'date', sortOrder: 'asc' },
  { value: 'popular', label: '인기순', sortBy: 'popular', sortOrder: 'desc' },
  { value: 'unpopular', label: '인기낮은순', sortBy: 'popular', sortOrder: 'asc' },
];

export default function SortDropdown({ value, onChange, className }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const currentOption = sortOptions.find(opt => opt.value === value) || sortOptions[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 bg-gray-100 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 rounded-lg text-xs text-zinc-700 dark:text-zinc-100 hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2"
      >
        <span>{currentOption.label}</span>
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg shadow-lg overflow-hidden z-50">
          <div className="text-xs text-zinc-600 dark:text-zinc-500 px-3 py-2 border-b border-gray-200 dark:border-zinc-800">
            정렬 기준
          </div>
          
          {/* 날짜 정렬 */}
          <div className="border-b border-gray-200 dark:border-zinc-800">
            <div className="text-xs text-zinc-500 dark:text-zinc-400 px-3 py-1.5 bg-gray-100 dark:bg-zinc-800/50">날짜</div>
            <button
              onClick={() => {
                onChange('latest');
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between ${
                value === 'latest' ? 'text-brand-600 dark:text-brand-400 bg-gray-100 dark:bg-zinc-800/50' : 'text-zinc-700 dark:text-zinc-100'
              }`}
            >
              <span>최신순</span>
              <span className="text-zinc-600 dark:text-zinc-500">↓</span>
            </button>
            <button
              onClick={() => {
                onChange('oldest');
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between ${
                value === 'oldest' ? 'text-brand-600 dark:text-brand-400 bg-gray-100 dark:bg-zinc-800/50' : 'text-zinc-700 dark:text-zinc-100'
              }`}
            >
              <span>오래된순</span>
              <span className="text-zinc-600 dark:text-zinc-500">↑</span>
            </button>
          </div>

          {/* 인기 정렬 */}
          <div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 px-3 py-1.5 bg-gray-100 dark:bg-zinc-800/50">참여</div>
            <button
              onClick={() => {
                onChange('popular');
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between ${
                value === 'popular' ? 'text-brand-600 dark:text-brand-400 bg-gray-100 dark:bg-zinc-800/50' : 'text-zinc-700 dark:text-zinc-100'
              }`}
            >
              <span>인기순</span>
              <span className="text-zinc-600 dark:text-zinc-500">↓</span>
            </button>
            <button
              onClick={() => {
                onChange('unpopular');
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between ${
                value === 'unpopular' ? 'text-brand-600 dark:text-brand-400 bg-gray-100 dark:bg-zinc-800/50' : 'text-zinc-700 dark:text-zinc-100'
              }`}
            >
              <span>인기낮은순</span>
              <span className="text-zinc-600 dark:text-zinc-500">↑</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}