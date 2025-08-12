import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { debateApi } from '@/lib/api';
import { CreateDebateDto } from '@/types/debate';
import toast from 'react-hot-toast';
import { format, addDays, addHours } from 'date-fns';

export default function CreatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // 폼 데이터
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [tags, setTags] = useState('');
  const [authorNickname, setAuthorNickname] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [voteOptions, setVoteOptions] = useState(['', '']);
  
  // 설정
  const [allowMultipleChoice, setAllowMultipleChoice] = useState(false);
  const [showResultsBeforeEnd, setShowResultsBeforeEnd] = useState(true);
  const [allowAnonymousVote, setAllowAnonymousVote] = useState(true);
  const [allowOpinion, setAllowOpinion] = useState(true);
  const [maxVotesPerIp, setMaxVotesPerIp] = useState(1);
  
  // 일정
  const [startAt, setStartAt] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [endAt, setEndAt] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd'T'HH:mm"));

  const handleAddOption = () => {
    if (voteOptions.length < 10) {
      setVoteOptions([...voteOptions, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (voteOptions.length > 2) {
      setVoteOptions(voteOptions.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...voteOptions];
    newOptions[index] = value;
    setVoteOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 유효성 검사
    if (!title.trim()) {
      toast.error('제목을 입력해주세요');
      return;
    }
    
    if (!authorNickname.trim()) {
      toast.error('작성자 닉네임을 입력해주세요');
      return;
    }
    
    if (!adminPassword.trim()) {
      toast.error('관리 비밀번호를 입력해주세요');
      return;
    }
    
    const validOptions = voteOptions.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      toast.error('최소 2개 이상의 투표 옵션을 입력해주세요');
      return;
    }
    
    if (new Date(endAt) <= new Date(startAt)) {
      toast.error('종료일은 시작일보다 늦어야 합니다');
      return;
    }

    try {
      setLoading(true);
      
      const data: CreateDebateDto = {
        title: title.trim(),
        description: description.trim(),
        category,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        author_nickname: authorNickname.trim(),
        admin_password: adminPassword,
        vote_options: validOptions.map(label => ({ label })),
        settings: {
          allow_multiple_choice: allowMultipleChoice,
          show_results_before_end: showResultsBeforeEnd,
          allow_anonymous_vote: allowAnonymousVote,
          allow_opinion: allowOpinion,
          max_votes_per_ip: maxVotesPerIp
        },
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString()
      };

      const result = await debateApi.create(data);
      toast.success('투표가 생성되었습니다!');
      
      // 생성된 투표 페이지로 이동
      router.push(`/debate/${result.id}`);
    } catch (error: any) {
      toast.error(error.message || '투표 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">새 투표 만들기</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">기본 정보</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input"
                  placeholder="투표 제목을 입력하세요"
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">설명</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input min-h-[100px]"
                  placeholder="투표에 대한 상세 설명을 입력하세요 (선택사항)"
                  maxLength={2000}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">카테고리</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="input"
                  >
                    <option value="general">일반</option>
                    <option value="tech">기술</option>
                    <option value="lifestyle">라이프스타일</option>
                    <option value="politics">정치</option>
                    <option value="entertainment">엔터테인먼트</option>
                    <option value="sports">스포츠</option>
                    <option value="other">기타</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">태그</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="input"
                    placeholder="태그1, 태그2, 태그3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    작성자 닉네임 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={authorNickname}
                    onChange={(e) => setAuthorNickname(e.target.value)}
                    className="input"
                    placeholder="닉네임"
                    maxLength={50}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    관리 비밀번호 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="input"
                    placeholder="투표 수정/삭제시 필요"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 투표 옵션 */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">
              투표 옵션 <span className="text-sm text-gray-500">최소 2개, 최대 10개</span>
            </h2>
            
            <div className="space-y-3">
              {voteOptions.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    className="input flex-1"
                    placeholder={`옵션 ${index + 1}`}
                    maxLength={200}
                  />
                  {voteOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="btn btn-secondary"
                    >
                      삭제
                    </button>
                  )}
                </div>
              ))}
              
              {voteOptions.length < 10 && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="btn btn-secondary w-full"
                >
                  + 옵션 추가
                </button>
              )}
            </div>
          </div>

          {/* 투표 설정 */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">투표 설정</h2>
            
            <div className="space-y-4">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={allowMultipleChoice}
                  onChange={(e) => setAllowMultipleChoice(e.target.checked)}
                  className="w-4 h-4 text-primary"
                />
                <span>다중 선택 허용</span>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={showResultsBeforeEnd}
                  onChange={(e) => setShowResultsBeforeEnd(e.target.checked)}
                  className="w-4 h-4 text-primary"
                />
                <span>투표 종료 전 결과 공개</span>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={allowAnonymousVote}
                  onChange={(e) => setAllowAnonymousVote(e.target.checked)}
                  className="w-4 h-4 text-primary"
                />
                <span>익명 투표 허용</span>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={allowOpinion}
                  onChange={(e) => setAllowOpinion(e.target.checked)}
                  className="w-4 h-4 text-primary"
                />
                <span>의견 작성 허용</span>
              </label>

              <div>
                <label className="block text-sm font-medium mb-1">
                  IP당 최대 투표 횟수
                </label>
                <input
                  type="number"
                  value={maxVotesPerIp}
                  onChange={(e) => setMaxVotesPerIp(Number(e.target.value))}
                  className="input w-32"
                  min="1"
                  max="10"
                />
              </div>
            </div>
          </div>

          {/* 투표 일정 */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">투표 일정</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">시작일시</label>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="input"
                  min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">종료일시</label>
                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className="input"
                  min={format(addHours(new Date(startAt), 1), "yyyy-MM-dd'T'HH:mm")}
                />
              </div>
            </div>
          </div>

          {/* 제출 버튼 */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="btn btn-secondary"
              disabled={loading}
            >
              취소
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? '생성 중...' : '투표 생성'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}