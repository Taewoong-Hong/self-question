'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { debateApi } from '@/lib/api';
import { CreateDebateDto } from '@/types/debate';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ko } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function CreateDebatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateDebateDto>({
    title: '',
    description: '',
    category: 'general',
    author_nickname: '',
    admin_password: '',
    tags: [],
    vote_options: [
      { label: '찬성' },
      { label: '반대' }
    ],
    settings: {
      allow_multiple_choice: false,
      show_results_before_end: true,
      allow_anonymous_vote: true,
      allow_opinion: true,
      max_votes_per_ip: 1
    },
    start_at: new Date().toISOString().slice(0, 16),
    end_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.admin_password || !formData.author_nickname) {
      toast.error('제목, 작성자 닉네임, 비밀번호는 필수입니다.');
      return;
    }

    if (formData.admin_password.length < 8) {
      toast.error('작성자 비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    try {
      setLoading(true);
      const submitData = {
        ...formData,
        start_at: new Date(formData.start_at).toISOString(),
        end_at: formData.end_at ? new Date(formData.end_at).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };
      
      const result = await debateApi.create(submitData);
      toast.success('투표가 성공적으로 생성되었습니다!');
      router.push(`/debates/${result.id}`);
    } catch (error: any) {
      console.error('투표 생성 실패:', error);
      toast.error(error.message || '투표 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">새 투표 만들기</h1>
        <p className="text-zinc-400 mt-1">찬성과 반대 의견을 수집하는 투표를 만들어보세요</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm dark:shadow-none">
          <h2 className="text-lg font-semibold mb-4">기본 정보</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                투표 제목 *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 ring-surbate focus:border-transparent"
                placeholder="예: 회사 야유회 장소를 제주도로 할까요?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                설명
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 ring-surbate focus:border-transparent"
                rows={3}
                placeholder="투표에 대한 상세한 설명을 입력하세요"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                작성자 닉네임 *
              </label>
              <input
                type="text"
                required
                value={formData.author_nickname}
                onChange={(e) => setFormData({ ...formData, author_nickname: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 ring-surbate focus:border-transparent"
                placeholder="투표 작성자 닉네임"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                태그
              </label>
              <input
                type="text"
                value={formData.tags?.join(', ')}
                onChange={(e) => {
                  const value = e.target.value;
                  // 마지막 문자가 쉼표인 경우를 처리하기 위해 빈 문자열도 유지
                  const tags = value.split(',').map(tag => tag.trim());
                  // 마지막 태그가 빈 문자열이 아니거나, 마지막 문자가 쉼표인 경우에만 필터링
                  const filteredTags = value.endsWith(',') 
                    ? tags.slice(0, -1).filter(tag => tag)
                    : tags.filter(tag => tag);
                  setFormData({ ...formData, tags: filteredTags });
                }}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 ring-surbate focus:border-transparent"
                placeholder="태그1, 태그2 (쉼표로 구분)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  시작일시
                </label>
                <DatePicker
                  selected={formData.start_at ? new Date(formData.start_at) : null}
                  onChange={(date) => setFormData({ ...formData, start_at: date?.toISOString() || '' })}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={1}
                  dateFormat="yyyy년 MM월 dd일 HH:mm"
                  locale={ko}
                  placeholderText="시작일시를 선택하세요"
                  className="w-full px-2 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 ring-surbate focus:border-transparent"
                  wrapperClassName="w-full"
                  withPortal
                  portalId="root-portal"
                  minDate={new Date()}
                />
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  종료일시
                </label>
                <DatePicker
                  selected={formData.end_at ? new Date(formData.end_at) : null}
                  onChange={(date) => setFormData({ ...formData, end_at: date?.toISOString() || '' })}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={1}
                  dateFormat="yyyy년 MM월 dd일 HH:mm"
                  locale={ko}
                  placeholderText="종료일시를 선택하세요"
                  className="w-full px-2 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 ring-surbate focus:border-transparent"
                  wrapperClassName="w-full"
                  withPortal
                  portalId="root-portal"
                  minDate={formData.start_at ? new Date(formData.start_at) : new Date()}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 투표 설정 */}
        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm dark:shadow-none">
          <h2 className="text-lg font-semibold mb-4">투표 설정</h2>
          
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.settings?.allow_anonymous_vote}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    settings: { ...formData.settings!, allow_anonymous_vote: e.target.checked } 
                  })}
                  className="rounded text-surbate bg-zinc-900 border-zinc-700 focus:ring-2 ring-surbate"
                />
                <span>익명 투표 허용</span>
              </label>
              <p className="mt-1 text-sm text-zinc-500 ml-7">
                참여자가 이름 없이 투표할 수 있습니다
              </p>
            </div>

            <div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.settings?.allow_opinion}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    settings: { ...formData.settings!, allow_opinion: e.target.checked } 
                  })}
                  className="rounded text-surbate bg-zinc-900 border-zinc-700 focus:ring-2 ring-surbate"
                />
                <span>의견 작성 허용</span>
              </label>
              <p className="mt-1 text-sm text-zinc-500 ml-7">
                참여자가 투표와 함께 의견을 남길 수 있습니다
              </p>
            </div>

            <div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.settings?.show_results_before_end}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    settings: { ...formData.settings!, show_results_before_end: e.target.checked } 
                  })}
                  className="rounded text-surbate bg-zinc-900 border-zinc-700 focus:ring-2 ring-surbate"
                />
                <span>투표 종료 전 결과 공개</span>
              </label>
              <p className="mt-1 text-sm text-zinc-500 ml-7">
                참여자가 투표 결과를 실시간으로 볼 수 있습니다
              </p>
            </div>
          </div>
        </div>

        {/* 작성자 설정 */}
        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm dark:shadow-none">
          <h2 className="text-lg font-semibold mb-4">작성자 설정</h2>
          
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              작성자 비밀번호 *
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={formData.admin_password}
              onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 ring-surbate focus:border-transparent"
              placeholder="8자 이상의 비밀번호"
            />
            <p className="mt-2 text-sm text-zinc-500">
              이 비밀번호로 투표를 수정하거나 결과를 확인할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-surbate to-brand-600 text-zinc-900 font-semibold rounded-lg hover:from-brand-400 hover:to-brand-600 shadow-sm hover:shadow-lg hover:shadow-surbate/20 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
          >
            {loading ? '생성 중...' : '투표 만들기'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}