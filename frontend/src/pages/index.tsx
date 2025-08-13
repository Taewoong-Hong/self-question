import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { debateApi } from '@/lib/api';
import { Debate } from '@/types/debate';
import { 
  formatRelativeTime, 
  formatTimeRemaining, 
  getCategoryLabel, 
  getStatusBadgeStyle, 
  getStatusText,
  formatNumber,
  cn
} from '@/lib/utils';
import toast from 'react-hot-toast';

export default function HomePage() {
  const router = useRouter();
  const [debates, setDebates] = useState<Debate[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('latest');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchDebates();
  }, [currentPage, category, status, sort]);

  const fetchDebates = async () => {
    try {
      setLoading(true);
      const response = await debateApi.list({
        page: currentPage,
        limit: 12,
        category: category !== 'all' ? category : undefined,
        status: status !== 'all' ? status : undefined,
        sort,
        search: search || undefined
      });
      
      setDebates(response.debates);
      setTotalPages(response.pagination.total_pages);
    } catch (error: any) {
      console.error('투표 목록 조회 실패:', error);
      // 서버 연결 실패시에는 빈 목록으로 표시
      setDebates([]);
      setTotalPages(1);
      
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        toast.error('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
      } else {
        toast.error('투표 목록을 불러오는데 실패했습니다');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchDebates();
  };

  const DebateCard = ({ debate }: { debate: Debate }) => {
    const totalVotes = debate.stats.total_votes;
    const leadingOption = debate.vote_options.reduce((max, opt) => 
      (opt.vote_count || 0) > (max.vote_count || 0) ? opt : max
    , debate.vote_options[0]);

    return (
      <Link href={`/debate/${debate.id}`} className="block">
        <div className="card hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <span className={cn('px-2 py-1 text-xs rounded-full', getStatusBadgeStyle(debate.status))}>
              {getStatusText(debate.status)}
            </span>
            <span className="text-sm text-gray-500">
              {getCategoryLabel(debate.category)}
            </span>
          </div>
          
          <h3 className="text-lg font-semibold mb-2 line-clamp-2">
            {debate.title}
          </h3>
          
          {debate.description && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {debate.description}
            </p>
          )}

          <div className="space-y-2 mb-4">
            {debate.vote_options.slice(0, 3).map((option) => (
              <div key={option.id} className="flex items-center justify-between text-sm">
                <span className="truncate mr-2">{option.label}</span>
                {debate.settings.show_results_before_end || debate.is_ended ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${option.percentage || 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-10 text-right">
                      {option.percentage || 0}%
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">투표 후 공개</span>
                )}
              </div>
            ))}
            {debate.vote_options.length > 3 && (
              <p className="text-xs text-gray-500">+{debate.vote_options.length - 3}개 더보기</p>
            )}
          </div>

          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-3">
              <span>👥 {formatNumber(debate.stats.unique_voters)}명</span>
              <span>💬 {formatNumber(debate.stats.opinion_count)}개</span>
              <span>👁 {formatNumber(debate.stats.view_count)}회</span>
            </div>
            {debate.is_active && (
              <span className="text-primary font-medium">
                {formatTimeRemaining(debate.time_remaining)}
              </span>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>{debate.author_nickname}</span>
            <span>{formatRelativeTime(debate.created_at)}</span>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">투표 게시판</h1>
        <p className="text-gray-600">다양한 주제에 대해 투표하고 의견을 나눠보세요</p>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setCurrentPage(1); }}
            className="input w-auto"
          >
            <option value="all">모든 카테고리</option>
            <option value="general">일반</option>
            <option value="tech">기술</option>
            <option value="lifestyle">라이프스타일</option>
            <option value="politics">정치</option>
            <option value="entertainment">엔터테인먼트</option>
            <option value="sports">스포츠</option>
            <option value="other">기타</option>
          </select>

          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setCurrentPage(1); }}
            className="input w-auto"
          >
            <option value="all">모든 상태</option>
            <option value="active">진행중</option>
            <option value="scheduled">예정</option>
            <option value="ended">종료</option>
          </select>

          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setCurrentPage(1); }}
            className="input w-auto"
          >
            <option value="latest">최신순</option>
            <option value="popular">인기순</option>
            <option value="views">조회순</option>
            <option value="ending_soon">마감임박순</option>
          </select>

          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="제목, 설명, 태그로 검색..."
              className="input flex-1"
            />
            <button type="submit" className="btn btn-primary">
              검색
            </button>
          </form>
        </div>
      </div>

      {/* 투표 목록 */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : debates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">아직 등록된 투표가 없습니다</p>
          <Link href="/create">
            <button className="btn btn-primary">첫 투표 만들기</button>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {debates.map((debate) => (
              <DebateCard key={debate.id} debate={debate} />
            ))}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8 space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="btn btn-secondary disabled:opacity-50"
              >
                이전
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => 
                  page === 1 || 
                  page === totalPages || 
                  Math.abs(page - currentPage) <= 2
                )
                .map((page, index, array) => (
                  <React.Fragment key={page}>
                    {index > 0 && array[index - 1] !== page - 1 && (
                      <span className="px-2">...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        'btn',
                        page === currentPage ? 'btn-primary' : 'btn-secondary'
                      )}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                ))}

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-secondary disabled:opacity-50"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}