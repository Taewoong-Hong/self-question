'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { requestApi } from '@/lib/api';
import { RequestPost } from '@/types/request';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function RequestDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [request, setRequest] = useState<RequestPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: '',
    content: '',
    is_public: true,
    password: ''
  });

  useEffect(() => {
    fetchRequest();
  }, [params.id]);

  const fetchRequest = async () => {
    try {
      setLoading(true);
      const data = await requestApi.get(params.id);
      setRequest(data);
      setEditData({
        title: data.title,
        content: data.content,
        is_public: data.is_public,
        password: ''
      });
    } catch (error) {
      console.error('요청 조회 실패:', error);
      router.push('/requests');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editData.password) {
      alert('비밀번호를 입력해주세요.');
      return;
    }

    try {
      const updated = await requestApi.update(params.id, editData);
      setRequest(updated);
      setIsEditing(false);
      setEditData({ ...editData, password: '' });
    } catch (error: any) {
      alert(error.response?.data?.error || '수정에 실패했습니다.');
    }
  };

  const handleDelete = async () => {
    const password = prompt('비밀번호를 입력하세요:');
    if (!password) return;

    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await requestApi.delete(params.id, password);
      router.push('/requests');
    } catch (error: any) {
      alert(error.response?.data?.error || '삭제에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-100"></div>
      </div>
    );
  }

  if (!request) {
    return null;
  }

  return (
    <div className="min-h-screen max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/requests"
            className="p-2 rounded-lg hover:bg-zinc-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  수정
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-red-400 hover:text-red-300 transition-colors"
                >
                  삭제
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditData({
                      title: request.title,
                      content: request.content,
                      is_public: request.is_public,
                      password: ''
                    });
                  }}
                  className="px-4 py-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 bg-gradient-to-r from-surbate to-brand-600 text-zinc-900 font-semibold rounded-lg hover:from-brand-400 hover:to-brand-600 transition-all duration-200"
                >
                  저장
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 내용 */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-8">
        {isEditing ? (
          // 수정 모드
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                제목
              </label>
              <input
                type="text"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                내용
              </label>
              <textarea
                value={editData.content}
                onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                rows={12}
                maxLength={2000}
              />
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editData.is_public}
                  onChange={(e) => setEditData({ ...editData, is_public: e.target.checked })}
                  className="w-4 h-4 bg-zinc-800 border-zinc-600 rounded text-brand-500 focus:ring-brand-500 focus:ring-offset-0"
                />
                <span className="text-sm text-zinc-300">공개 게시</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                비밀번호 <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={editData.password}
                onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                placeholder="수정하려면 비밀번호를 입력하세요"
                className="w-full max-w-xs px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
          </div>
        ) : (
          // 보기 모드
          <>
            <div className="mb-6 pb-6 border-b border-zinc-800">
              <h1 className="text-2xl font-bold mb-4">{request.title}</h1>
              <div className="flex items-center gap-4 text-sm text-zinc-500">
                <span>작성자: {request.author_nickname}</span>
                <span>•</span>
                <span>조회 {request.views}</span>
                <span>•</span>
                <span>
                  {formatDistanceToNow(new Date(request.created_at), {
                    addSuffix: true,
                    locale: ko
                  })}
                </span>
                {!request.is_public && (
                  <>
                    <span>•</span>
                    <span className="text-zinc-400">🔒 비공개</span>
                  </>
                )}
              </div>
            </div>

            <div className="prose prose-invert max-w-none">
              <p className="text-zinc-300 whitespace-pre-wrap">{request.content}</p>
            </div>

            {/* 관리자 답글 */}
            {request.admin_reply && (
              <div className="mt-8 pt-8 border-t border-zinc-800">
                <div className="bg-zinc-800/50 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-brand-500/20 text-brand-400">
                      관리자 답글
                    </span>
                    <span className="text-xs text-zinc-500">
                      {request.admin_reply.replied_by} • {' '}
                      {formatDistanceToNow(new Date(request.admin_reply.replied_at), {
                        addSuffix: true,
                        locale: ko
                      })}
                    </span>
                  </div>
                  <p className="text-zinc-300 whitespace-pre-wrap">{request.admin_reply.content}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}