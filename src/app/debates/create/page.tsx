'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { debateApi } from '@/lib/api';
import { CreateDebateDto } from '@/types/debate';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ko } from 'date-fns/locale';
import toast from 'react-hot-toast';
import TagInput from '@/components/TagInput';

export default function CreateDebatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [voteType, setVoteType] = useState<'yesno' | 'multiple'>('yesno');
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

    if (formData.vote_options.length < 2) {
      toast.error('최소 2개의 투표 선택지가 필요합니다.');
      return;
    }

    // 빈 선택지 검증
    const emptyOptions = formData.vote_options.filter(opt => !opt.label.trim());
    if (emptyOptions.length > 0) {
      toast.error('모든 투표 선택지를 입력해주세요.');
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
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">찬성과 반대 의견을 수집하는 투표를 만들어보세요</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm dark:shadow-none">
          <h2 className="text-lg font-semibold mb-4">기본 정보</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                투표 제목 *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 ring-surbate focus:border-transparent"
                placeholder="예: 회사 야유회 장소를 제주도로 할까요?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                설명
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 ring-surbate focus:border-transparent"
                rows={3}
                placeholder="투표에 대한 상세한 설명을 입력하세요"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                작성자 닉네임 *
              </label>
              <input
                type="text"
                required
                value={formData.author_nickname}
                onChange={(e) => setFormData({ ...formData, author_nickname: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 ring-surbate focus:border-transparent"
                placeholder="투표 작성자 닉네임"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                태그
              </label>
              <TagInput
                tags={formData.tags || []}
                onChange={(tags) => setFormData({ ...formData, tags })}
                placeholder="태그 입력 후 Enter 또는 쉼표"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
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
                  className="w-full px-2 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 ring-surbate focus:border-transparent"
                  wrapperClassName="w-full"
                  withPortal
                  portalId="root-portal"
                  minDate={new Date()}
                />
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
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
                  className="w-full px-2 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 ring-surbate focus:border-transparent"
                  wrapperClassName="w-full"
                  withPortal
                  portalId="root-portal"
                  minDate={formData.start_at ? new Date(formData.start_at) : new Date()}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 투표 선택지 */}
        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm dark:shadow-none">
          <h2 className="text-lg font-semibold mb-4">투표 선택지</h2>
          
          {/* 투표 유형 선택 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              투표 유형
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="yesno"
                  checked={voteType === 'yesno'}
                  onChange={(e) => {
                    setVoteType('yesno');
                    setFormData({
                      ...formData,
                      vote_options: [
                        { label: '찬성' },
                        { label: '반대' }
                      ],
                      settings: {
                        ...formData.settings!,
                        allow_multiple_choice: false
                      }
                    });
                  }}
                  className="mr-2 text-surbate focus:ring-2 focus:ring-surbate"
                />
                <span>찬성/반대 투표</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="multiple"
                  checked={voteType === 'multiple'}
                  onChange={(e) => {
                    setVoteType('multiple');
                    setFormData({
                      ...formData,
                      vote_options: [
                        { label: '선택지 1' },
                        { label: '선택지 2' }
                      ]
                    });
                  }}
                  className="mr-2 text-surbate focus:ring-2 focus:ring-surbate"
                />
                <span>다중 선택 투표</span>
              </label>
            </div>
          </div>
          
          <div className="space-y-3">
            {formData.vote_options.map((option, index) => (
              <div key={index} className="flex gap-3">
                <input
                  type="text"
                  value={option.label}
                  onChange={(e) => {
                    const newOptions = [...formData.vote_options];
                    newOptions[index] = { label: e.target.value };
                    setFormData({ ...formData, vote_options: newOptions });
                  }}
                  readOnly={voteType === 'yesno'}
                  className={`flex-1 px-4 py-2 border rounded-lg text-zinc-900 dark:text-zinc-100 ${
                    voteType === 'yesno' 
                      ? 'bg-gray-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-800' 
                      : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-surbate'
                  }`}
                  placeholder={`선택지 ${index + 1}`}
                />
                {voteType === 'multiple' && formData.vote_options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newOptions = formData.vote_options.filter((_, i) => i !== index);
                      setFormData({ ...formData, vote_options: newOptions });
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          
          {voteType === 'multiple' && formData.vote_options.length < 10 && (
            <button
              type="button"
              onClick={() => {
                const newOptions = [...formData.vote_options, { label: `선택지 ${formData.vote_options.length + 1}` }];
                setFormData({ ...formData, vote_options: newOptions });
              }}
              className="mt-3 w-full py-2 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-400 hover:border-surbate hover:text-surbate transition-colors"
            >
              + 선택지 추가
            </button>
          )}
          
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-500">
            {voteType === 'yesno' 
              ? '찬성/반대 투표는 선택지를 수정할 수 없습니다.' 
              : '최소 2개, 최대 10개의 선택지를 만들 수 있습니다.'}
          </p>
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
                  className="rounded text-surbate bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 focus:ring-2 ring-surbate"
                />
                <span>익명 투표 허용</span>
              </label>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-500 ml-7">
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
                  className="rounded text-surbate bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 focus:ring-2 ring-surbate"
                />
                <span>의견 작성 허용</span>
              </label>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-500 ml-7">
                참여자가 투표와 함께 의견을 남길 수 있습니다
              </p>
            </div>

            <div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.public_results || false}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    public_results: e.target.checked
                  })}
                  className="rounded text-surbate bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 focus:ring-2 ring-surbate"
                />
                <span>결과 공개</span>
              </label>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-500 ml-7">
                모든 사람이 투표 결과를 볼 수 있습니다 (체크하지 않으면 작성자만 볼 수 있습니다)
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
                  className="rounded text-surbate bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 focus:ring-2 ring-surbate"
                />
                <span>투표 종료 전 결과 공개</span>
              </label>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-500 ml-7">
                참여자가 투표 결과를 실시간으로 볼 수 있습니다
              </p>
            </div>

            {voteType === 'multiple' && (
              <div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.settings?.allow_multiple_choice || false}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      settings: { ...formData.settings!, allow_multiple_choice: e.target.checked } 
                    })}
                    className="rounded text-surbate bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 focus:ring-2 ring-surbate"
                  />
                  <span>중복 선택 허용</span>
                </label>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-500 ml-7">
                  참여자가 여러 개의 선택지를 선택할 수 있습니다
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 작성자 설정 */}
        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm dark:shadow-none">
          <h2 className="text-lg font-semibold mb-4">작성자 설정</h2>
          
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              작성자 비밀번호 *
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={formData.admin_password}
              onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
              className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 ring-surbate focus:border-transparent"
              placeholder="8자 이상의 비밀번호"
            />
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-500">
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
            className="px-6 py-3 bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}