'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface ContentItem {
  id: string;
  title: string;
  type: 'debate' | 'survey';
  status: 'open' | 'closed' | 'scheduled';
  created_at: string;
  author_ip: string;
  author_nickname?: string;
  participant_count: number;
  is_reported: boolean;
  is_hidden: boolean;
}

export default function AdminContentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'debate' | 'survey' | 'reported'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  useEffect(() => {
    fetchContents();
  }, [filter, searchQuery]);

  const fetchContents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      
      const response = await fetch(`/api/admin/contents?filter=${filter}&search=${searchQuery}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch contents');
      }
      
      const data = await response.json();
      setContents(data.contents || []);
    } catch (error) {
      console.error('Failed to fetch contents:', error);
      setContents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleHide = async (contentId: string) => {
    try {
      const token = localStorage.getItem('admin_token');
      const content = contents.find(c => c.id === contentId);
      if (!content) return;
      
      const response = await fetch(`/api/admin/contents/${contentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: content.is_hidden ? 'show' : 'hide' })
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle hide');
      }
      
      // 상태 업데이트
      setContents(prev => prev.map(content => 
        content.id === contentId 
          ? { ...content, is_hidden: !content.is_hidden }
          : content
      ));
    } catch (error) {
      console.error('Failed to toggle hide:', error);
      toast.error('숨김 처리에 실패했습니다.');
    }
  };

  const handleDelete = async (contentId: string) => {
    if (!window.confirm('정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      
      const response = await fetch(`/api/admin/contents/${contentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete');
      }
      
      // 목록에서 제거
      setContents(prev => prev.filter(content => content.id !== contentId));
    } catch (error) {
      console.error('Failed to delete:', error);
      toast.error('삭제에 실패했습니다.');
    }
  };


  const handleBulkAction = async (action: 'hide' | 'show' | 'delete') => {
    if (selectedItems.length === 0) {
      toast.error('선택된 항목이 없습니다.');
      return;
    }

    if (action === 'delete' && !window.confirm(`선택한 ${selectedItems.length}개 항목을 정말로 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      
      const response = await fetch('/api/admin/contents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: selectedItems, action })
      });
      
      if (!response.ok) {
        throw new Error('Failed to perform bulk action');
      }

      if (action === 'delete') {
        setContents(prev => prev.filter(content => !selectedItems.includes(content.id)));
      } else {
        setContents(prev => prev.map(content => 
          selectedItems.includes(content.id)
            ? { ...content, is_hidden: action === 'hide' }
            : content
        ));
      }
      
      setSelectedItems([]);
    } catch (error) {
      console.error('Failed to perform bulk action:', error);
      toast.error('작업 처리에 실패했습니다.');
    }
  };

  const filteredContents = contents.filter(content => {
    if (filter === 'reported') return content.is_reported;
    if (filter !== 'all' && content.type !== filter) return false;
    if (searchQuery && !content.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-100"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-zinc-100">콘텐츠 관리</h2>
          <p className="text-zinc-400 mt-1">투표와 설문을 관리하고 신고된 콘텐츠를 확인하세요</p>
        </div>

        {/* 필터 및 검색 */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all' 
                    ? 'bg-surbate text-zinc-900' 
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setFilter('debate')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'debate' 
                    ? 'bg-surbate text-zinc-900' 
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                }`}
              >
                투표
              </button>
              <button
                onClick={() => setFilter('survey')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'survey' 
                    ? 'bg-surbate text-zinc-900' 
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                }`}
              >
                설문
              </button>
              <button
                onClick={() => setFilter('reported')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'reported' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                }`}
              >
                신고됨
              </button>
            </div>
            
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="제목으로 검색..."
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-surbate focus:border-transparent"
              />
            </div>

            {selectedItems.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkAction('hide')}
                  className="px-4 py-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors text-sm"
                >
                  숨기기
                </button>
                <button
                  onClick={() => handleBulkAction('show')}
                  className="px-4 py-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors text-sm"
                >
                  공개
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  삭제
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 콘텐츠 목록 - 모바일에서는 카드, 데스크톱에서는 테이블 */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl overflow-hidden">
          {/* 데스크톱 테이블 뷰 */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-3 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === filteredContents.length && filteredContents.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems(filteredContents.map(c => c.id));
                        } else {
                          setSelectedItems([]);
                        }
                      }}
                      className="rounded text-surbate bg-zinc-900 border-zinc-700"
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider min-w-[200px]">
                    제목
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    유형
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    작성자
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    참여자
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    생성일
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredContents.map((content) => (
                  <tr key={content.id} className={content.is_hidden ? 'opacity-50' : ''}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(content.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems([...selectedItems, content.id]);
                          } else {
                            setSelectedItems(selectedItems.filter(id => id !== content.id));
                          }
                        }}
                        className="rounded text-surbate bg-zinc-900 border-zinc-700"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-100">{content.title}</span>
                        {content.is_reported && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-red-900/50 text-red-400">
                            신고됨
                          </span>
                        )}
                        {content.is_hidden && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-zinc-700 text-zinc-400">
                            숨김
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${
                        content.type === 'debate' 
                          ? 'bg-blue-100/10 text-blue-400' 
                          : 'bg-brand-100/10 text-brand-400'
                      }`}>
                        {content.type === 'debate' ? '투표' : '설문'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${
                        content.status === 'open' 
                          ? 'bg-green-100/10 text-green-400' 
                          : content.status === 'closed'
                          ? 'bg-red-100/10 text-red-400'
                          : 'bg-yellow-100/10 text-yellow-400'
                      }`}>
                        {content.status === 'open' ? '진행중' : content.status === 'closed' ? '종료' : '예정'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-xs">
                        <div className="text-zinc-100 text-sm">{content.author_nickname || '익명'}</div>
                        <div className="text-zinc-500 text-[10px] truncate max-w-[120px]" title={content.author_ip}>
                          {content.author_ip}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-zinc-400 text-center text-sm">
                      {content.participant_count}명
                    </td>
                    <td className="px-3 py-2 text-zinc-400 text-xs">
                      {formatDistanceToNow(new Date(content.created_at), { 
                        addSuffix: true, 
                        locale: ko 
                      })}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <Link
                          href={`/${content.type}s/${content.id}`}
                          className="text-zinc-400 hover:text-zinc-100 transition-colors"
                          title="보기"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => handleToggleHide(content.id)}
                          className="text-zinc-400 hover:text-zinc-100 transition-colors"
                          title={content.is_hidden ? '공개' : '숨기기'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {content.is_hidden ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            )}
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(content.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="삭제"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        {content.type === 'survey' && (
                          <Link
                            href={`/admin/contents/${content.id}/edit-results`}
                            className="text-brand-400 hover:text-brand-300 transition-colors"
                            title="결과 수정"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일 카드 뷰 */}
          <div className="lg:hidden">
            {filteredContents.map((content) => (
              <div key={content.id} className={`p-4 border-b border-zinc-800 ${content.is_hidden ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(content.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedItems([...selectedItems, content.id]);
                      } else {
                        setSelectedItems(selectedItems.filter(id => id !== content.id));
                      }
                    }}
                    className="rounded text-surbate bg-zinc-900 border-zinc-700 mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-zinc-100 font-medium pr-2">{content.title}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            content.type === 'debate' 
                              ? 'bg-blue-100/10 text-blue-400' 
                              : 'bg-brand-100/10 text-brand-400'
                          }`}>
                            {content.type === 'debate' ? '투표' : '설문'}
                          </span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            content.status === 'open' 
                              ? 'bg-green-100/10 text-green-400' 
                              : content.status === 'closed'
                              ? 'bg-red-100/10 text-red-400'
                              : 'bg-yellow-100/10 text-yellow-400'
                          }`}>
                            {content.status === 'open' ? '진행중' : content.status === 'closed' ? '종료' : '예정'}
                          </span>
                          {content.is_reported && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-red-900/50 text-red-400">
                              신고됨
                            </span>
                          )}
                          {content.is_hidden && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-zinc-700 text-zinc-400">
                              숨김
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 items-center">
                        <Link
                          href={`/${content.type}s/${content.id}`}
                          className="p-1.5 text-zinc-400 hover:text-zinc-100 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => handleToggleHide(content.id)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-100 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {content.is_hidden ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            )}
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(content.id)}
                          className="p-1.5 text-red-400 hover:text-red-300 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        {content.type === 'survey' && (
                          <Link
                            href={`/admin/contents/${content.id}/edit-results`}
                            className="p-1.5 text-brand-400 hover:text-brand-300 transition-colors"
                            title="결과 수정"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-400 space-y-0.5">
                      <div className="flex items-center gap-1">
                        <span>{content.author_nickname || '익명'}</span>
                        <span>•</span>
                        <span className="truncate max-w-[120px]" title={content.author_ip}>{content.author_ip}</span>
                      </div>
                      <div>참여자 {content.participant_count}명 • {formatDistanceToNow(new Date(content.created_at), { addSuffix: true, locale: ko })}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}