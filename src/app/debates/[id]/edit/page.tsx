'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { debateApi } from '@/lib/api';
import { VoteOption } from '@/types/debate';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ko } from 'date-fns/locale';
import toast from 'react-hot-toast';
import TagInput from '@/components/TagInput';

interface DebateEditData {
  title: string;
  description: string;
  start_at?: string;
  end_at?: string;
  author_nickname: string;
  is_anonymous: boolean;
  allow_comments: boolean;
  vote_options: VoteOption[];
  tags?: string[];
  public_results?: boolean;
  show_results_before_end?: boolean;
  settings?: {
    allow_multiple_choice: boolean;
    max_votes_per_ip: number;
  };
}

export default function EditDebatePage() {
  const params = useParams();
  const router = useRouter();
  const debateId = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [authenticating, setAuthenticating] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [formData, setFormData] = useState<DebateEditData | null>(null);

  useEffect(() => {
    checkEditability();
  }, [debateId]);

  const checkEditability = async () => {
    try {
      // 관리자 권한 확인
      const adminToken = localStorage.getItem('admin_token');
      const isAdmin = !!adminToken;
      
      // localStorage에서 작성자 토큰 확인
      const savedToken = localStorage.getItem(`debate_author_${debateId}`);
      
      // 관리자도 작성자도 아니면 리다이렉트
      if (!savedToken && !isAdmin) {
        toast.error('작성자 인증이 필요합니다.');
        router.push(`/debates/${debateId}/admin`);
        return;
      }

      // 투표 데이터 가져오기
      const debate = await debateApi.get(debateId);

      // 관리자가 아닌 경우에만 투표 수 체크
      const hasVotes = debate.stats?.total_votes > 0;
      if (!isAdmin && hasVotes) {
        toast.error('투표가 시작된 후에는 수정할 수 없습니다.');
        router.push(`/debates/${debateId}/admin`);
        return;
      }

      // 수정 가능한 경우 폼 데이터 설정
      setCanEdit(true);
      setFormData({
        title: debate.title,
        description: debate.description || '',
        start_at: debate.start_at ? new Date(debate.start_at).toISOString() : undefined,
        end_at: debate.end_at ? new Date(debate.end_at).toISOString() : undefined,
        author_nickname: debate.author_nickname || '',
        is_anonymous: debate.settings?.allow_anonymous_vote || true,
        allow_comments: debate.settings?.allow_opinion || false,
        vote_options: debate.vote_options,
        tags: debate.tags || [],
        public_results: false, // 공개 설정은 별도로 관리될 수 있음
        show_results_before_end: debate.settings?.show_results_before_end || false,
        settings: {
          allow_multiple_choice: debate.settings?.allow_multiple_choice || false,
          max_votes_per_ip: debate.settings?.max_votes_per_ip || 1
        }
      });
    } catch (error) {
      console.error('투표 조회 실패:', error);
      toast.error('투표를 불러올 수 없습니다.');
      router.push(`/debates/${debateId}`);
    } finally {
      setAuthenticating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 이미 처리 중이면 무시
    if (loading) {
      return;
    }
    
    if (!formData) return;

    if (!formData.title) {
      toast.error('제목은 필수입니다.');
      return;
    }

    // 관리자가 아닌 경우 기본 선택지가 최소 2개 있는지 확인
    const adminToken = localStorage.getItem('admin_token');
    const isAdmin = !!adminToken;
    
    if (!isAdmin && (!formData.settings?.allow_multiple_choice && formData.vote_options.filter(opt => opt.label).length < 2)) {
      toast.error('기본 투표는 최소 2개의 선택지가 필요합니다.');
      return;
    }

    try {
      setLoading(true);
      
      // localStorage에서 토큰 가져오기
      const authorToken = localStorage.getItem(`debate_author_${debateId}`) || adminToken || '';
      
      // settings에 값들을 포함시켜서 전송
      const updateData = {
        ...formData,
        settings: {
          ...formData.settings,
          allow_anonymous_vote: formData.is_anonymous,
          allow_opinion: formData.allow_comments,
          show_results_before_end: formData.show_results_before_end || false
        }
      };
      
      console.log('Updating debate with:', {
        debateId,
        updateData,
        token: authorToken ? 'exists' : 'missing',
        isAdmin: !!localStorage.getItem('admin_token')
      });
      
      await debateApi.update(debateId, updateData, authorToken);
      
      toast.success('투표가 수정되었습니다!');
      
      // 잠시 대기 후 이동 (DB 반영 시간 고려)
      setTimeout(() => {
        router.push(`/debates/${debateId}`);
      }, 500);
    } catch (error: any) {
      console.error('투표 수정 실패:', error);
      toast.error(error.message || '투표 수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOption = () => {
    if (!formData) return;
    setFormData({
      ...formData,
      vote_options: [...formData.vote_options, { 
        id: `option-${Date.now()}`, 
        label: '', 
        vote_count: 0,
        order: formData.vote_options.length 
      }]
    });
  };

  const handleRemoveOption = (index: number) => {
    if (!formData) return;
    setFormData({
      ...formData,
      vote_options: formData.vote_options.filter((_, i) => i !== index)
    });
  };

  const handleOptionChange = (index: number, value: string) => {
    if (!formData) return;
    const newOptions = [...formData.vote_options];
    newOptions[index] = { ...newOptions[index], label: value, order: index };
    setFormData({ ...formData, vote_options: newOptions });
  };

  if (authenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-100"></div>
      </div>
    );
  }

  if (!canEdit || !formData) {
    return null;
  }

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8 text-zinc-900 dark:text-zinc-100">투표 수정</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 제목 */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            제목 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-surbate focus:border-transparent"
            placeholder="투표 제목을 입력하세요"
            required
          />
        </div>

        {/* 설명 */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            설명
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-surbate focus:border-transparent resize-none"
            placeholder="투표에 대한 설명을 입력하세요 (선택사항)"
            rows={4}
          />
        </div>

        {/* 투표 유형 */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            투표 유형
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.settings?.allow_multiple_choice || false}
                onChange={(e) => setFormData({
                  ...formData,
                  settings: {
                    ...formData.settings!,
                    allow_multiple_choice: e.target.checked
                  }
                })}
                className="rounded text-surbate bg-gray-50 dark:bg-zinc-900 border-gray-300 dark:border-zinc-700 focus:ring-surbate"
              />
              <span className="ml-2 text-zinc-700 dark:text-zinc-300">복수 선택 허용</span>
            </label>
          </div>
        </div>

        {/* 투표 선택지 */}
        {formData.settings?.allow_multiple_choice && (
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              투표 선택지
            </label>
            <div className="space-y-2">
              {formData.vote_options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={option.label}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    className="flex-1 px-4 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-surbate focus:border-transparent"
                    placeholder={`선택지 ${index + 1}`}
                  />
                  {formData.vote_options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      삭제
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddOption}
                className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-400 hover:border-surbate hover:text-surbate transition-colors"
              >
                + 선택지 추가
              </button>
            </div>
          </div>
        )}

        {/* 익명 투표 */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_anonymous}
              onChange={(e) => setFormData({ ...formData, is_anonymous: e.target.checked })}
              className="rounded text-surbate bg-gray-50 dark:bg-zinc-900 border-gray-300 dark:border-zinc-700 focus:ring-surbate"
            />
            <span className="ml-2 text-zinc-700 dark:text-zinc-300">익명 투표</span>
          </label>
        </div>

        {/* 의견 작성 허용 */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.allow_comments}
              onChange={(e) => setFormData({ ...formData, allow_comments: e.target.checked })}
              className="rounded text-surbate bg-gray-50 dark:bg-zinc-900 border-gray-300 dark:border-zinc-700 focus:ring-surbate"
            />
            <span className="ml-2 text-zinc-700 dark:text-zinc-300">의견 작성 허용</span>
          </label>
        </div>

        {/* 결과 공개 설정 */}
        <div className="space-y-2">
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.public_results || false}
                onChange={(e) => setFormData({ ...formData, public_results: e.target.checked })}
                className="rounded text-surbate bg-gray-50 dark:bg-zinc-900 border-gray-300 dark:border-zinc-700 focus:ring-surbate"
              />
              <span className="ml-2 text-zinc-700 dark:text-zinc-300">결과 공개 (미체크시 작성자만 결과 확인 가능)</span>
            </label>
          </div>
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.show_results_before_end || false}
                onChange={(e) => setFormData({ ...formData, show_results_before_end: e.target.checked })}
                className="rounded text-surbate bg-gray-50 dark:bg-zinc-900 border-gray-300 dark:border-zinc-700 focus:ring-surbate"
              />
              <span className="ml-2 text-zinc-700 dark:text-zinc-300">투표 종료 전 결과 공개 (투표한 사람만 중간 결과 확인 가능)</span>
            </label>
          </div>
        </div>

        {/* 시작/종료 시간 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              시작 시간
            </label>
            <DatePicker
              selected={formData.start_at ? new Date(formData.start_at) : null}
              onChange={(date) => setFormData({ ...formData, start_at: date?.toISOString() })}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              dateFormat="yyyy-MM-dd HH:mm"
              locale={ko}
              placeholderText="시작 시간을 선택하세요"
              className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-surbate focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              종료 시간
            </label>
            <DatePicker
              selected={formData.end_at ? new Date(formData.end_at) : null}
              onChange={(date) => setFormData({ ...formData, end_at: date?.toISOString() })}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              dateFormat="yyyy-MM-dd HH:mm"
              locale={ko}
              placeholderText="종료 시간을 선택하세요"
              className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-surbate focus:border-transparent"
              minDate={formData.start_at ? new Date(formData.start_at) : new Date()}
            />
          </div>
        </div>

        {/* 태그 */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            태그
          </label>
          <TagInput
            tags={formData.tags || []}
            onChange={(tags) => setFormData({ ...formData, tags })}
            placeholder="태그를 입력하고 Enter를 누르세요"
          />
        </div>

        {/* 작성자 닉네임 */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            작성자 닉네임
          </label>
          <input
            type="text"
            value={formData.author_nickname}
            onChange={(e) => setFormData({ ...formData, author_nickname: e.target.value })}
            className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-surbate focus:border-transparent"
            placeholder="닉네임을 입력하세요 (선택사항)"
          />
        </div>

        {/* 제출 버튼 */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-surbate to-brand-600 text-zinc-900 font-semibold rounded-lg hover:from-brand-400 hover:to-brand-600 shadow-sm hover:shadow-lg hover:shadow-surbate/20 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
          >
            {loading ? '수정 중...' : '수정하기'}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/debates/${debateId}/admin`)}
            disabled={loading}
            className="px-6 py-3 bg-gray-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}