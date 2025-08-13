import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { debateApi } from '@/lib/api';
import { Debate, VoteOption } from '@/types/debate';
import { 
  formatDate,
  formatTimeRemaining,
  getCategoryLabel,
  getStatusBadgeStyle,
  getStatusText,
  formatNumber,
  getPercentageColor,
  cn
} from '@/lib/utils';
import toast from 'react-hot-toast';

export default function DebateDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [debate, setDebate] = useState<Debate | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [userNickname, setUserNickname] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  
  // 의견 작성
  const [showOpinionForm, setShowOpinionForm] = useState(false);
  const [opinionContent, setOpinionContent] = useState('');
  const [opinionNickname, setOpinionNickname] = useState('');
  const [opinionAnonymous, setOpinionAnonymous] = useState(true);
  const [submittingOpinion, setSubmittingOpinion] = useState(false);

  useEffect(() => {
    if (id) {
      fetchDebate();
    }
  }, [id]);

  const fetchDebate = async () => {
    try {
      setLoading(true);
      const data = await debateApi.get(id as string);
      setDebate(data);
      setHasVoted(!data.can_vote && data.stats.unique_voters > 0);
    } catch (error) {
      toast.error('투표를 불러오는데 실패했습니다');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (optionId: string) => {
    if (!debate || hasVoted || !debate.can_vote) return;

    if (debate.settings.allow_multiple_choice) {
      setSelectedOptions(prev => 
        prev.includes(optionId) 
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      );
    } else {
      setSelectedOptions([optionId]);
    }
  };

  const handleVote = async () => {
    if (!debate || selectedOptions.length === 0) {
      toast.error('투표할 옵션을 선택해주세요');
      return;
    }

    if (!isAnonymous && !userNickname.trim()) {
      toast.error('닉네임을 입력해주세요');
      return;
    }

    try {
      setVoting(true);
      const result = await debateApi.vote(debate.id, {
        option_ids: selectedOptions,
        user_nickname: isAnonymous ? undefined : userNickname.trim(),
        is_anonymous: isAnonymous
      });
      
      toast.success(result.message);
      setHasVoted(true);
      fetchDebate(); // 결과 업데이트
    } catch (error: any) {
      toast.error(error.message || '투표에 실패했습니다');
    } finally {
      setVoting(false);
    }
  };

  const handleSubmitOpinion = async () => {
    if (!debate || !opinionContent.trim()) {
      toast.error('의견을 입력해주세요');
      return;
    }

    if (!opinionAnonymous && !opinionNickname.trim()) {
      toast.error('닉네임을 입력해주세요');
      return;
    }

    try {
      setSubmittingOpinion(true);
      await debateApi.addOpinion(debate.id, {
        author_nickname: opinionAnonymous ? '익명' : opinionNickname.trim(),
        selected_option_id: selectedOptions[0],
        content: opinionContent.trim(),
        is_anonymous: opinionAnonymous
      });
      
      toast.success('의견이 등록되었습니다');
      setOpinionContent('');
      setOpinionNickname('');
      setShowOpinionForm(false);
      fetchDebate(); // 의견 목록 업데이트
    } catch (error: any) {
      toast.error(error.message || '의견 작성에 실패했습니다');
    } finally {
      setSubmittingOpinion(false);
    }
  };

  const VoteOptionItem = ({ option }: { option: VoteOption }) => {
    const isSelected = selectedOptions.includes(option.id);
    const showResults = debate?.results || (debate?.settings.show_results_before_end && hasVoted);
    
    return (
      <div
        onClick={() => handleOptionSelect(option.id)}
        className={cn(
          'relative border rounded-lg p-4 transition-all',
          debate?.can_vote && !hasVoted && 'cursor-pointer hover:border-primary',
          isSelected && 'border-primary bg-primary/5',
          !debate?.can_vote && 'cursor-default'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {debate?.can_vote && !hasVoted && (
              <div className={cn(
                'w-5 h-5 rounded border-2 flex items-center justify-center',
                debate.settings.allow_multiple_choice ? 'rounded' : 'rounded-full',
                isSelected ? 'border-primary bg-primary' : 'border-gray-300'
              )}>
                {isSelected && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            )}
            <span className="font-medium">{option.label}</span>
          </div>
          
          {showResults && (
            <div className="flex items-center space-x-2">
              <span className={cn('font-semibold', getPercentageColor(option.percentage || 0))}>
                {option.percentage || 0}%
              </span>
              <span className="text-sm text-gray-500">
                ({formatNumber(option.vote_count || 0)}표)
              </span>
            </div>
          )}
        </div>
        
        {showResults && (
          <div className="mt-3">
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${option.percentage || 0}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!debate) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">투표를 찾을 수 없습니다</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* 투표 정보 */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <span className={cn('px-2 py-1 text-xs rounded-full', getStatusBadgeStyle(debate.status))}>
                {getStatusText(debate.status)}
              </span>
              <span className="text-sm text-gray-500">
                {getCategoryLabel(debate.category)}
              </span>
              {debate.tags.map(tag => (
                <span key={tag} className="text-sm text-gray-400">
                  #{tag}
                </span>
              ))}
            </div>
            {debate.is_active && (
              <span className="text-primary font-medium">
                {formatTimeRemaining(debate.time_remaining)}
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold mb-3">{debate.title}</h1>
          
          {debate.description && (
            <p className="text-gray-600 mb-4 whitespace-pre-wrap">
              {debate.description}
            </p>
          )}

          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <span>작성자: {debate.author_nickname}</span>
              <span>시작: {formatDate(debate.start_at)}</span>
              <span>종료: {formatDate(debate.end_at)}</span>
            </div>
            <div className="flex items-center space-x-3">
              <span>👥 {formatNumber(debate.stats.unique_voters)}명</span>
              <span>💬 {formatNumber(debate.stats.opinion_count)}개</span>
              <span>👁 {formatNumber(debate.stats.view_count)}회</span>
            </div>
          </div>
        </div>

        {/* 투표 옵션 */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">
            투표 옵션
            {debate.settings.allow_multiple_choice && (
              <span className="text-sm text-gray-500 ml-2">(복수 선택 가능)</span>
            )}
          </h2>
          
          <div className="space-y-3">
            {debate.vote_options.map(option => (
              <VoteOptionItem key={option.id} option={option} />
            ))}
          </div>

          {debate.can_vote && !hasVoted && (
            <div className="mt-6 space-y-4">
              {!debate.settings.allow_anonymous_vote || !isAnonymous ? (
                <div>
                  <label className="block text-sm font-medium mb-1">닉네임</label>
                  <input
                    type="text"
                    value={userNickname}
                    onChange={(e) => setUserNickname(e.target.value)}
                    className="input"
                    placeholder="투표에 사용할 닉네임"
                    maxLength={50}
                  />
                </div>
              ) : (
                debate.settings.allow_anonymous_vote && (
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="w-4 h-4 text-primary"
                    />
                    <span>익명으로 투표</span>
                  </label>
                )
              )}
              
              <button
                onClick={handleVote}
                disabled={voting || selectedOptions.length === 0}
                className="btn btn-primary w-full"
              >
                {voting ? '투표 중...' : '투표하기'}
              </button>
            </div>
          )}

          {hasVoted && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">✅ 투표가 완료되었습니다</p>
            </div>
          )}

          {debate.status === 'scheduled' && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800">⏰ 아직 투표가 시작되지 않았습니다</p>
            </div>
          )}

          {debate.status === 'ended' && (
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-gray-800">🏁 투표가 종료되었습니다</p>
            </div>
          )}
        </div>

        {/* 의견 섹션 */}
        {debate.settings.allow_opinion && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                의견 ({formatNumber(debate.stats.opinion_count)})
              </h2>
              {debate.status !== 'scheduled' && (
                <button
                  onClick={() => setShowOpinionForm(!showOpinionForm)}
                  className="btn btn-secondary"
                >
                  의견 작성
                </button>
              )}
            </div>

            {showOpinionForm && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-3">
                  {!opinionAnonymous && (
                    <input
                      type="text"
                      value={opinionNickname}
                      onChange={(e) => setOpinionNickname(e.target.value)}
                      className="input"
                      placeholder="닉네임"
                      maxLength={50}
                    />
                  )}
                  
                  <textarea
                    value={opinionContent}
                    onChange={(e) => setOpinionContent(e.target.value)}
                    className="input min-h-[100px]"
                    placeholder="의견을 작성해주세요"
                    maxLength={1000}
                  />
                  
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={opinionAnonymous}
                        onChange={(e) => setOpinionAnonymous(e.target.checked)}
                        className="w-4 h-4 text-primary"
                      />
                      <span>익명으로 작성</span>
                    </label>
                    
                    <div className="space-x-2">
                      <button
                        onClick={() => {
                          setShowOpinionForm(false);
                          setOpinionContent('');
                          setOpinionNickname('');
                        }}
                        className="btn btn-secondary"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleSubmitOpinion}
                        disabled={submittingOpinion || !opinionContent.trim()}
                        className="btn btn-primary"
                      >
                        {submittingOpinion ? '등록 중...' : '등록'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 의견 목록 */}
            <div className="space-y-4">
              {debate.opinions && debate.opinions.length > 0 ? (
                debate.opinions.map(opinion => (
                  <div key={opinion.id} className="border-b border-gray-100 pb-4 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{opinion.author_nickname}</span>
                        {opinion.selected_option_id && (
                          <span className="text-xs text-gray-500">
                            • {debate.vote_options.find(opt => opt.id === opinion.selected_option_id)?.label}
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-400">
                        {formatDate(opinion.created_at)}
                      </span>
                    </div>
                    <p className="text-gray-700">{opinion.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">
                  아직 작성된 의견이 없습니다
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}