'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import CommentSection from '@/components/CommentSection';

interface Question {
  _id: string;
  title: string;
  content: string;
  nickname: string;
  category?: string;
  tags?: string[];
  views: number;
  status: 'pending' | 'answered' | 'closed';
  adminAnswer?: {
    content: string;
    answeredAt: string;
    answeredBy: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function QuestionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [password, setPassword] = useState('');

  useEffect(() => {
    fetchQuestion();
  }, [params.id]);

  const fetchQuestion = async () => {
    try {
      const response = await axios.get(`/api/questions/${params.id}`);
      setQuestion(response.data.question);
    } catch (error) {
      console.error('질문 로딩 실패:', error);
      router.push('/questions');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!password) {
      alert('비밀번호를 입력해주세요.');
      return;
    }

    try {
      await axios.delete(`/api/questions/${params.id}`, {
        data: { password }
      });
      alert('질문이 삭제되었습니다.');
      router.push('/questions');
    } catch (error: any) {
      alert(error.response?.data?.error || '삭제 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-100"></div>
      </div>
    );
  }

  if (!question) {
    return null;
  }

  return (
    <div className="min-h-screen max-w-4xl mx-auto p-4">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold text-zinc-100">{question.title}</h1>
          <div className="flex gap-2">
            <Link
              href="/questions"
              className="p-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700"
              title="목록으로"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
            </Link>
            {question.status === 'pending' && (
              <button
                onClick={() => setShowEditModal(true)}
                className="p-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700"
                title="수정"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l9.932-9.931ZM19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
              </button>
            )}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-2 bg-red-900 text-red-100 rounded-lg hover:bg-red-800"
              title="삭제"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          </div>
        </div>

        {/* 메타 정보 */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
          <span className={`px-2.5 py-0.5 rounded text-xs font-medium ${
            question.status === 'answered'
              ? 'bg-green-100/10 text-green-400'
              : question.status === 'closed'
              ? 'bg-red-100/10 text-red-400'
              : 'bg-yellow-100/10 text-yellow-400'
          }`}>
            {question.status === 'answered' ? '답변 완료' : 
             question.status === 'closed' ? '종료' : '답변 대기'}
          </span>
          <span>{question.nickname}</span>
          <span>•</span>
          <span>조회 {question.views}</span>
          <span>•</span>
          <span>
            {new Date(question.createdAt).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            }).replace(/\. /g, '-').replace('.', '')}
          </span>
          {question.category && (
            <>
              <span>•</span>
              <span className="text-zinc-400">{question.category}</span>
            </>
          )}
        </div>

        {/* 태그 */}
        {question.tags && question.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {question.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-1 rounded text-xs bg-zinc-800 text-zinc-400"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 질문 내용 */}
      <div className="bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-lg p-6 mb-6 shadow-sm dark:shadow-none">
        <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{question.content}</p>
      </div>

      {/* Admin 답변 (있는 경우에만 표시) */}
      {question.adminAnswer && (
        <div className="bg-green-900/20 border border-green-800/50 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-green-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
            </svg>
            <h3 className="text-lg font-semibold text-green-400">관리자 답변</h3>
          </div>
          <p className="text-zinc-800 dark:text-zinc-300 whitespace-pre-wrap mb-3">{question.adminAnswer.content}</p>
          <div className="text-xs text-zinc-500">
            {question.adminAnswer.answeredBy} • {' '}
            {new Date(question.adminAnswer.answeredAt).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            }).replace(/\. /g, '-').replace('.', '')}
          </div>
        </div>
      )}

      {/* 댓글 섹션 */}
      <CommentSection contentType="question" contentId={question._id} />

      {/* 수정 모달 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">질문 수정</h3>
            <p className="text-zinc-400 text-sm mb-4">
              답변이 달리지 않은 질문만 수정할 수 있습니다.
            </p>
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  try {
                    const response = await axios.post(`/api/questions/${params.id}/verify`, { password });
                    if (response.data.success) {
                      router.push(`/questions/${params.id}/edit`);
                    }
                  } catch (error: any) {
                    alert(error.response?.data?.error || '비밀번호 확인 실패');
                  }
                }}
                className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
              >
                확인
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setPassword('');
                }}
                className="flex-1 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">질문 삭제</h3>
            <p className="text-zinc-400 text-sm mb-4">
              삭제된 질문은 복구할 수 없습니다. 정말 삭제하시겠습니까?
            </p>
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                삭제
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setPassword('');
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