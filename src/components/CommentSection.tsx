'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface Comment {
  _id: string;
  nickname: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  parentId?: string;
  replies?: Comment[];
}

interface CommentSectionProps {
  contentType: 'debate' | 'question';
  contentId: string;
}

export default function CommentSection({ contentType, contentId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nickname: '',
    password: '',
    content: ''
  });
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    password: '',
    content: ''
  });

  useEffect(() => {
    fetchComments();
  }, [contentType, contentId]);

  const fetchComments = async () => {
    try {
      const response = await axios.get('/api/comments', {
        params: { contentType, contentId }
      });
      setComments(response.data.comments);
    } catch (error) {
      console.error('댓글 로딩 실패:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nickname.trim() || !formData.password || !formData.content.trim()) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    if (formData.password.length < 4) {
      alert('비밀번호는 최소 4자 이상이어야 합니다.');
      return;
    }

    try {
      setLoading(true);
      await axios.post('/api/comments', {
        contentType,
        contentId,
        nickname: formData.nickname.trim(),
        password: formData.password,
        content: formData.content.trim(),
        parentId: replyTo
      });

      // 폼 초기화
      setFormData({ nickname: '', password: '', content: '' });
      setReplyTo(null);
      
      // 댓글 목록 새로고침
      await fetchComments();
    } catch (error: any) {
      alert(error.response?.data?.error || '댓글 작성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (commentId: string) => {
    if (!editFormData.password || !editFormData.content.trim()) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      await axios.put(`/api/comments/${commentId}`, {
        password: editFormData.password,
        content: editFormData.content.trim()
      });

      setEditingComment(null);
      setEditFormData({ password: '', content: '' });
      await fetchComments();
    } catch (error: any) {
      alert(error.response?.data?.error || '댓글 수정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    const password = prompt('댓글 비밀번호를 입력하세요:');
    if (!password) return;

    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      setLoading(true);
      await axios.delete(`/api/comments/${commentId}`, {
        data: { password }
      });

      await fetchComments();
    } catch (error: any) {
      alert(error.response?.data?.error || '댓글 삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const isEditing = editingComment === comment._id;

    return (
      <div key={comment._id} className={`${isReply ? 'ml-8' : ''} mb-4`}>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-zinc-100">{comment.nickname}</span>
              <span className="text-xs text-zinc-500">
                {new Date(comment.createdAt).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                }).replace(/\. /g, '-').replace('.', '')}
              </span>
              {comment.updatedAt !== comment.createdAt && (
                <span className="text-xs text-zinc-600">(수정됨)</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isReply && (
                <button
                  onClick={() => {
                    setReplyTo(comment._id);
                    setShowForm(true);
                  }}
                  className="text-xs text-zinc-400 hover:text-zinc-300"
                >
                  답글
                </button>
              )}
              <button
                onClick={() => {
                  setEditingComment(comment._id);
                  setEditFormData({ password: '', content: comment.content });
                }}
                className="text-xs text-zinc-400 hover:text-zinc-300"
              >
                수정
              </button>
              <button
                onClick={() => handleDelete(comment._id)}
                className="text-xs text-zinc-400 hover:text-red-400"
              >
                삭제
              </button>
            </div>
          </div>

          {isEditing ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={editFormData.content}
                onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                rows={3}
              />
              <input
                type="password"
                placeholder="비밀번호"
                value={editFormData.password}
                onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(comment._id)}
                  disabled={loading}
                  className="px-3 py-1 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  수정
                </button>
                <button
                  onClick={() => {
                    setEditingComment(null);
                    setEditFormData({ password: '', content: '' });
                  }}
                  className="px-3 py-1 bg-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-600 text-sm"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <p className="text-zinc-300 whitespace-pre-wrap">{comment.content}</p>
          )}
        </div>

        {/* 대댓글 렌더링 */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2">
            {comment.replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-8">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-zinc-100">
          댓글 {comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)}
        </h3>
      </div>

      {/* 댓글 작성 폼 - 항상 표시 */}
      <form onSubmit={handleSubmit} className="mb-6 bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          {replyTo && (
            <div className="mb-2 text-sm text-zinc-400">
              답글 작성 중... 
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="ml-2 text-zinc-500 hover:text-zinc-300"
              >
                취소
              </button>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input
              type="text"
              placeholder="닉네임"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              maxLength={20}
            />
            <input
              type="password"
              placeholder="비밀번호 (수정/삭제 시 필요)"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          
          <textarea
            placeholder="댓글을 입력하세요..."
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none mb-3"
            rows={4}
            maxLength={500}
          />
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              {formData.content.length}/500
            </span>
            <button
              type="submit"
              disabled={loading || !formData.nickname.trim() || !formData.password || !formData.content.trim()}
              className="p-2 bg-brand-500 text-white rounded-full hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              title="댓글 작성"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
        </form>

      {/* 댓글 목록 */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-center text-zinc-500 py-8">
            아직 댓글이 없습니다. 첫 번째 댓글을 작성해보세요!
          </p>
        ) : (
          comments.map(comment => renderComment(comment))
        )}
      </div>
    </div>
  );
}