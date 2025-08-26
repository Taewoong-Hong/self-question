'use client';

import { useState, KeyboardEvent } from 'react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}

export default function TagInput({ tags, onChange, placeholder = "태그 입력 후 Enter", className = "" }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      // 입력값이 없을 때 백스페이스를 누르면 마지막 태그 삭제
      removeTag(tags.length - 1);
    }
  };

  const addTag = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !tags.includes(trimmedValue)) {
      onChange([...tags, trimmedValue]);
      setInputValue('');
    }
  };

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, index) => index !== indexToRemove));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 쉼표가 입력되면 태그로 추가
    if (value.includes(',')) {
      const parts = value.split(',');
      const newTag = parts[0].trim();
      if (newTag && !tags.includes(newTag)) {
        onChange([...tags, newTag]);
      }
      setInputValue(parts.slice(1).join(','));
    } else {
      setInputValue(value);
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 p-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-transparent ${className}`}>
      {tags.map((tag, index) => (
        <span
          key={index}
          className="inline-flex items-center gap-1 px-3 py-1 bg-brand-100 dark:bg-brand-900/30 text-brand-800 dark:text-brand-200 rounded-full text-sm"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(index)}
            className="ml-1 text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-200"
          >
            ✕
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-500"
      />
    </div>
  );
}