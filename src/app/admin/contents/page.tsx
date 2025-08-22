'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface ContentItem {
  id: string;
  title: string;
  type: 'debate' | 'survey' | 'question';
  status: 'open' | 'closed' | 'scheduled' | 'pending' | 'answered';
  created_at: string;
  start_at?: string;
  end_at?: string;
  author_ip: string;
  author_nickname?: string;
  participant_count: number;
  is_reported: boolean;
  is_hidden: boolean;
  // 질문 관련 필드
  content?: string;
  adminAnswer?: {
    content: string;
    answeredAt: string;
    answeredBy: string;
  };
}

export default function AdminContentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'debate' | 'survey' | 'question' | 'reported'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<ContentItem | null>(null);
  const [answerContent, setAnswerContent] = useState('');

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
        },
        credentials: 'include'
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
        body: JSON.stringify({ action: content.is_hidden ? 'show' : 'hide' }),
        credentials: 'include'
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
        },
        credentials: 'include'
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

  const handleAnswerQuestion = async () => {
    if (!selectedQuestion || !answerContent.trim()) {
      toast.error('답변 내용을 입력해주세요.');
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      
      const response = await fetch(`/api/admin/questions/${selectedQuestion.id}/answer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: answerContent.trim() }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit answer');
      }
      
      // 상태 업데이트
      setContents(prev => prev.map(content => 
        content.id === selectedQuestion.id 
          ? { ...content, status: 'answered' as const, adminAnswer: {
              content: answerContent.trim(),
              answeredAt: new Date().toISOString(),
              answeredBy: 'Admin'
            }}
          : content
      ));
      
      setShowAnswerModal(false);
      setSelectedQuestion(null);
      setAnswerContent('');
      toast.success('답변이 등록되었습니다.');
    } catch (error) {
      console.error('Failed to submit answer:', error);
      toast.error('답변 등록에 실패했습니다.');
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
        body: JSON.stringify({ ids: selectedItems, action }),
        credentials: 'include'
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
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded p-2 mb-3">
          <div className="flex flex-col sm:flex-row gap-1.5">
            <div className="flex gap-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  filter === 'all' 
                    ? 'bg-surbate text-zinc-900' 
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setFilter('debate')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  filter === 'debate' 
                    ? 'bg-surbate text-zinc-900' 
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                }`}
              >
                투표
              </button>
              <button
                onClick={() => setFilter('survey')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  filter === 'survey' 
                    ? 'bg-surbate text-zinc-900' 
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                }`}
              >
                설문
              </button>
              <button
                onClick={() => setFilter('question')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  filter === 'question' 
                    ? 'bg-surbate text-zinc-900' 
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                }`}
              >
                질문
              </button>
              <button
                onClick={() => setFilter('reported')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  filter === 'reported' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                }`}
              >
                신고됨
              </button>
            </div>
            
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="제목으로 검색..."
                className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-surbate focus:border-transparent"
              />
            </div>

            {selectedItems.length > 0 && (
              <div className="flex gap-1">
                <button
                  onClick={() => handleBulkAction('hide')}
                  className="px-2 py-1 bg-zinc-800 text-zinc-100 rounded hover:bg-zinc-700 transition-colors text-[11px]"
                >
                  숨기기
                </button>
                <button
                  onClick={() => handleBulkAction('show')}
                  className="px-2 py-1 bg-zinc-800 text-zinc-100 rounded hover:bg-zinc-700 transition-colors text-[11px]"
                >
                  공개
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-[11px]"
                >
                  삭제
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 콘텐츠 목록 - 카드 형태로 변경 */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl overflow-hidden">
          <div className="divide-y divide-zinc-800">
            {filteredContents.map((content) => (
              <div
                key={content.id}
                className={`block p-6 hover:bg-zinc-800/30 transition-all duration-200 ${content.is_hidden ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
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
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                      content.type === 'debate' 
                        ? 'bg-blue-100/10 text-blue-400' 
                        : content.type === 'survey'
                        ? 'bg-brand-100/10 text-pink-500'
                        : 'bg-yellow-100/10 text-yellow-400'
                    }`}>
                      {content.type === 'debate' ? '📊 투표' : content.type === 'survey' ? '📝 설문' : '❓ 질문'}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                      content.status === 'open' 
                        ? 'bg-emerald-100/10 text-emerald-400' 
                        : content.status === 'closed'
                        ? 'bg-red-100/10 text-red-400'
                        : content.status === 'pending'
                        ? 'bg-yellow-100/10 text-yellow-400'
                        : content.status === 'answered'
                        ? 'bg-green-100/10 text-green-400'
                        : 'bg-yellow-100/10 text-yellow-400'
                    }`}>
                      {content.status === 'open' ? '진행중' : 
                       content.status === 'closed' ? '종료' : 
                       content.status === 'pending' ? '답변 대기' :
                       content.status === 'answered' ? '답변 완료' : '예정'}
                    </span>
                    {content.is_reported && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-red-900/50 text-red-400">
                        신고됨
                      </span>
                    )}
                    {content.is_hidden && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-zinc-700 text-zinc-400">
                        숨김
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/${content.type}s/${content.id}`}
                      className="p-1.5 text-zinc-400 hover:text-zinc-100 transition-colors"
                      title="보기"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </Link>
                    <button
                      onClick={() => handleToggleHide(content.id)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-100 transition-colors"
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
                      className="p-1.5 text-red-400 hover:text-red-300 transition-colors"
                      title="삭제"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    {content.type === 'survey' && (
                      <Link
                        href={`/admin/contents/${content.id}/edit-results`}
                        className="p-1.5 text-brand-400 hover:text-brand-300 transition-colors"
                        title="결과 수정 (슈퍼관리자 전용)"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Link>
                    )}
                    {content.type === 'debate' && (
                      <Link
                        href={`/admin/contents/${content.id}/edit-debate-results`}
                        className="p-1.5 text-blue-400 hover:text-blue-300 transition-colors"
                        title="결과 수정 (슈퍼관리자 전용)"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Link>
                    )}
                    {content.type === 'question' && content.status === 'pending' && (
                      <button
                        onClick={() => {
                          setSelectedQuestion(content);
                          setAnswerContent(content.adminAnswer?.content || '');
                          setShowAnswerModal(true);
                        }}
                        className="p-1.5 text-green-400 hover:text-green-300 transition-colors"
                        title="답변하기"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold text-zinc-100 mb-3">
                  {content.title}
                </h3>
                
                {content.type === 'question' && content.content && (
                  <p className="text-zinc-400 text-sm mb-3 line-clamp-2">
                    {content.content}
                  </p>
                )}
                
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-500">
                  <div>
                    <span>참여 {content.participant_count}명</span>
                  </div>
                  <div>
                    {content.author_nickname && (
                      <span>작성자: {content.author_nickname}</span>
                    )}
                  </div>
                  <div>
                    {content.start_at ? (
                      <span>시작: {(() => {
                        const date = new Date(content.start_at);
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const hour = String(date.getHours()).padStart(2, '0');
                        const minute = String(date.getMinutes()).padStart(2, '0');
                        return `${year}-${month}-${day} ${hour}:${minute}`;
                      })()}</span>
                    ) : (
                      <span>작성: {(() => {
                        const date = new Date(content.created_at);
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                      })()}</span>
                    )}
                  </div>
                  <div>
                    {content.end_at ? (
                      <span>종료: {(() => {
                        const date = new Date(content.end_at);
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const hour = String(date.getHours()).padStart(2, '0');
                        const minute = String(date.getMinutes()).padStart(2, '0');
                        return `${year}-${month}-${day} ${hour}:${minute}`;
                      })()}</span>
                    ) : (
                      <span>IP: {content.author_ip}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* 답변 모달 */}
      {showAnswerModal && selectedQuestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">질문 답변하기</h3>
            
            {/* 질문 내용 */}
            <div className="mb-4 bg-zinc-800/50 rounded-lg p-4">
              <h4 className="text-lg font-medium text-zinc-100 mb-2">{selectedQuestion.title}</h4>
              {selectedQuestion.content && (
                <p className="text-zinc-400 text-sm whitespace-pre-wrap">{selectedQuestion.content}</p>
              )}
              <div className="mt-2 text-xs text-zinc-500">
                작성자: {selectedQuestion.author_nickname} • {' '}
                {new Date(selectedQuestion.created_at).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                }).replace(/\. /g, '-').replace('.', '')}
              </div>
            </div>

            {/* 답변 입력 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                답변 내용
              </label>
              <textarea
                value={answerContent}
                onChange={(e) => setAnswerContent(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                placeholder="답변을 입력하세요..."
                rows={8}
              />
            </div>

            {/* 버튼 */}
            <div className="flex gap-3">
              <button
                onClick={handleAnswerQuestion}
                className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
              >
                답변 등록
              </button>
              <button
                onClick={() => {
                  setShowAnswerModal(false);
                  setSelectedQuestion(null);
                  setAnswerContent('');
                }}
                className="flex-1 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}