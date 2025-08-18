'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Debate {
  id: string;
  title: string;
  description?: string;
  vote_type: 'named' | 'anonymous';
  allow_opinion: boolean;
  admin_results?: {
    agree_count: number;
    disagree_count: number;
    opinions: Array<{
      id: string;
      content: string;
      vote_type: 'agree' | 'disagree';
      voter_name?: string;
      created_at: string;
    }>;
  };
  stats: {
    total_votes: number;
    agree_count: number;
    disagree_count: number;
    opinion_count: number;
  };
  created_at?: string;
  start_at?: string;
  end_at?: string;
}

export default function EditDebateResultsPage() {
  const router = useRouter();
  const params = useParams();
  const debateId = params?.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [debate, setDebate] = useState<Debate | null>(null);
  const [agreeCount, setAgreeCount] = useState(0);
  const [disagreeCount, setDisagreeCount] = useState(0);
  const [opinions, setOpinions] = useState<Array<{
    id: string;
    content: string;
    vote_type: 'agree' | 'disagree';
    voter_name?: string;
    created_at: string;
  }>>([]);
  const [createdAt, setCreatedAt] = useState<string>('');
  const [startAt, setStartAt] = useState<string>('');
  const [endAt, setEndAt] = useState<string>('');

  useEffect(() => {
    // 관리자 인증 확인
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/admin');
      return;
    }
    fetchDebate();
  }, [debateId, router]);

  const fetchDebate = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      
      const response = await fetch(`/api/admin/debates/${debateId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch debate');
      }
      
      const data = await response.json();
      setDebate(data);
      
      // 날짜 설정
      if (data.created_at) {
        setCreatedAt(new Date(data.created_at).toISOString().slice(0, 16));
      }
      if (data.start_at) {
        setStartAt(new Date(data.start_at).toISOString().slice(0, 16));
      }
      if (data.end_at) {
        setEndAt(new Date(data.end_at).toISOString().slice(0, 16));
      }
      
      // 투표 결과 설정
      if (data.admin_results) {
        setAgreeCount(data.admin_results.agree_count || 0);
        setDisagreeCount(data.admin_results.disagree_count || 0);
        setOpinions(data.admin_results.opinions || []);
      } else {
        setAgreeCount(data.stats?.agree_count || 0);
        setDisagreeCount(data.stats?.disagree_count || 0);
        setOpinions([]);
      }
    } catch (error) {
      console.error('Failed to fetch debate:', error);
      toast.error('투표 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOpinion = () => {
    setOpinions([...opinions, {
      id: Date.now().toString(),
      content: '',
      vote_type: 'agree',
      voter_name: debate?.vote_type === 'named' ? '' : undefined,
      created_at: new Date().toISOString()
    }]);
  };

  const handleRemoveOpinion = (id: string) => {
    setOpinions(opinions.filter(op => op.id !== id));
  };

  const handleOpinionChange = (id: string, field: string, value: any) => {
    setOpinions(opinions.map(op => 
      op.id === id ? { ...op, [field]: value } : op
    ));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('admin_token');
      
      const response = await fetch(`/api/admin/debates/${debateId}/results`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          admin_results: {
            agree_count: agreeCount,
            disagree_count: disagreeCount,
            opinions: opinions
          },
          created_at: createdAt ? new Date(createdAt).toISOString() : undefined,
          start_at: startAt ? new Date(startAt).toISOString() : undefined,
          end_at: endAt ? new Date(endAt).toISOString() : undefined
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save results');
      }
      
      toast.success('결과가 저장되었습니다.');
      router.push('/admin/contents');
    } catch (error) {
      console.error('Failed to save results:', error);
      toast.error('결과 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !debate) {
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
          <div className="flex items-center gap-3 text-zinc-400 mb-4">
            <Link href="/admin/contents" className="hover:text-zinc-100 transition-colors">
              콘텐츠 관리
            </Link>
            <span>/</span>
            <span className="text-zinc-100">투표 결과 수정</span>
          </div>
          <h2 className="text-2xl font-bold text-zinc-100">{debate.title} - 결과 수정</h2>
          <p className="text-zinc-400 mt-1">투표 결과와 의견을 직접 입력하세요.</p>
        </div>

        {/* 날짜 수정 섹션 */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-zinc-100 mb-4">투표 날짜 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">생성일시</label>
              <input
                type="datetime-local"
                value={createdAt}
                onChange={(e) => setCreatedAt(e.target.value)}
                className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-2">시작일시</label>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-2">종료일시</label>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        {/* 투표 결과 수정 섹션 */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-zinc-100 mb-4">투표 결과</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">찬성</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={agreeCount}
                  onChange={(e) => setAgreeCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-24 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <span className="text-zinc-500 text-sm">표</span>
              </div>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-2">반대</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={disagreeCount}
                  onChange={(e) => setDisagreeCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-24 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <span className="text-zinc-500 text-sm">표</span>
              </div>
            </div>
          </div>

          {debate.allow_opinion && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-md font-medium text-zinc-100">의견 목록</h4>
                <button
                  onClick={handleAddOpinion}
                  className="text-brand-400 hover:text-brand-300 text-sm"
                >
                  + 의견 추가
                </button>
              </div>
              <div className="space-y-3">
                {opinions.map((opinion) => (
                  <div key={opinion.id} className="bg-zinc-800/50 rounded-lg p-4">
                    <div className="flex gap-3 mb-3">
                      <select
                        value={opinion.vote_type}
                        onChange={(e) => handleOpinionChange(opinion.id, 'vote_type', e.target.value)}
                        className="px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-sm text-zinc-100"
                      >
                        <option value="agree">찬성</option>
                        <option value="disagree">반대</option>
                      </select>
                      {debate.vote_type === 'named' && (
                        <input
                          type="text"
                          value={opinion.voter_name || ''}
                          onChange={(e) => handleOpinionChange(opinion.id, 'voter_name', e.target.value)}
                          placeholder="투표자 이름"
                          className="px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-sm text-zinc-100"
                        />
                      )}
                      <button
                        onClick={() => handleRemoveOpinion(opinion.id)}
                        className="ml-auto text-red-400 hover:text-red-300"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <textarea
                      value={opinion.content}
                      onChange={(e) => handleOpinionChange(opinion.id, 'content', e.target.value)}
                      placeholder="의견 내용을 입력하세요"
                      className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      rows={3}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-end gap-4">
          <Link
            href="/admin/contents"
            className="px-6 py-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            취소
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </main>
    </div>
  );
}