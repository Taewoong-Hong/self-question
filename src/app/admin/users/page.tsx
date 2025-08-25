'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface UserActivity {
  _id: string;
  ip: string;
  nickname?: string;
  lastActivity: string;
  totalDebates: number;
  totalSurveys: number;
  totalRequests: number;
  totalGuestbook: number;
  totalQuestions: number;
  firstSeen: string;
}

interface UserDetail {
  ip: string;
  activity: UserActivity;
  contents: {
    debates: any[];
    surveys: any[];
    requests: any[];
    guestbook: any[];
    questions: any[];
  };
  credentials: {
    debates: { id: string; title: string; hashedPassword: string }[];
    surveys: { id: string; title: string; hashedPassword: string }[];
    requests: { id: string; title: string; hashedPassword: string }[];
  };
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { isAdminLoggedIn, isLoading: authLoading } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserActivity[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [sortBy, setSortBy] = useState<'lastActivity' | 'totalContents'>('lastActivity');

  useEffect(() => {
    if (!authLoading && !isAdminLoggedIn) {
      router.push('/admin');
      return;
    }
    
    if (isAdminLoggedIn) {
      fetchUsers();
    }
  }, [router, isAdminLoggedIn, authLoading]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/users', {
        withCredentials: true
      });
      setUsers(response.data.users);
    } catch (error) {
      console.error('회원 목록 조회 실패:', error);
      toast.error('회원 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetail = async (ip: string) => {
    try {
      const response = await axios.get(`/api/admin/users/${encodeURIComponent(ip)}`, {
        withCredentials: true
      });
      setSelectedUser(response.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('회원 상세 정보 조회 실패:', error);
      toast.error('회원 정보를 불러오는데 실패했습니다.');
    }
  };

  const getTotalContents = (user: UserActivity) => {
    return user.totalDebates + user.totalSurveys + user.totalRequests + 
           user.totalGuestbook + user.totalQuestions;
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (sortBy === 'lastActivity') {
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    } else {
      return getTotalContents(b) - getTotalContents(a);
    }
  });

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-700 dark:border-zinc-100"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">회원 관리</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">IP 기반 사용자 활동 모니터링</p>
      </div>

      {/* 정렬 옵션 */}
      <div className="mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('lastActivity')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              sortBy === 'lastActivity'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900'
                : 'bg-gray-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            최근 활동순
          </button>
          <button
            onClick={() => setSortBy('totalContents')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              sortBy === 'totalContents'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900'
                : 'bg-gray-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            게시글 많은순
          </button>
        </div>
      </div>

      {/* 회원 목록 */}
      <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm dark:shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  IP 주소
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  최근 활동
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  첫 방문
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  투표
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  설문
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  요청
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  방명록
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  질문
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  총 게시글
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  상세
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
              {sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-zinc-500">
                    활동 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                sortedUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-zinc-900 dark:text-zinc-100">
                      {user.ip}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-400">
                      {formatDistanceToNow(new Date(user.lastActivity), {
                        addSuffix: true,
                        locale: ko
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-400">
                      {formatDistanceToNow(new Date(user.firstSeen), {
                        addSuffix: true,
                        locale: ko
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-zinc-900 dark:text-zinc-100">
                      {user.totalDebates}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-zinc-900 dark:text-zinc-100">
                      {user.totalSurveys}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-zinc-900 dark:text-zinc-100">
                      {user.totalRequests}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-zinc-900 dark:text-zinc-100">
                      {user.totalGuestbook}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-zinc-900 dark:text-zinc-100">
                      {user.totalQuestions}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-semibold text-zinc-900 dark:text-zinc-100">
                      {getTotalContents(user)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => fetchUserDetail(user.ip)}
                        className="px-3 py-1 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors text-xs"
                      >
                        보기
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 상세 정보 모달 */}
      {showDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-700 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  사용자 상세 정보: {selectedUser.ip}
                </h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* 작성한 콘텐츠 목록 */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">작성한 콘텐츠</h3>
                
                {/* 투표 */}
                {selectedUser.contents.debates.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">투표 ({selectedUser.contents.debates.length})</h4>
                    <div className="space-y-2">
                      {selectedUser.contents.debates.map((debate: any) => (
                        <div key={debate._id} className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-zinc-900 dark:text-zinc-100">{debate.title}</p>
                              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                작성자: {debate.author_nickname || '익명'} | {' '}
                                {formatDistanceToNow(new Date(debate.created_at), {
                                  addSuffix: true,
                                  locale: ko
                                })}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs ${
                              debate.status === 'active' 
                                ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                                : 'bg-red-500/20 text-red-600 dark:text-red-400'
                            }`}>
                              {debate.status === 'active' ? '진행중' : '종료'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 설문 */}
                {selectedUser.contents.surveys.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">설문 ({selectedUser.contents.surveys.length})</h4>
                    <div className="space-y-2">
                      {selectedUser.contents.surveys.map((survey: any) => (
                        <div key={survey._id} className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-zinc-900 dark:text-zinc-100">{survey.title}</p>
                              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                작성자: {survey.author_nickname || '익명'} | {' '}
                                {formatDistanceToNow(new Date(survey.created_at), {
                                  addSuffix: true,
                                  locale: ko
                                })}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs ${
                              survey.status === 'active' 
                                ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                                : 'bg-red-500/20 text-red-600 dark:text-red-400'
                            }`}>
                              {survey.status === 'active' ? '진행중' : '종료'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 요청 */}
                {selectedUser.contents.requests.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">요청 ({selectedUser.contents.requests.length})</h4>
                    <div className="space-y-2">
                      {selectedUser.contents.requests.map((request: any) => (
                        <div key={request._id} className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg">
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">{request.title}</p>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400">
                            {formatDistanceToNow(new Date(request.created_at), {
                              addSuffix: true,
                              locale: ko
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 비밀번호 정보 */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">비밀번호 정보 (해시값)</h3>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    ⚠️ 보안을 위해 비밀번호는 해시 처리되어 저장됩니다. 원본 비밀번호는 확인할 수 없습니다.
                  </p>
                </div>
                
                {selectedUser.credentials.debates.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">투표 비밀번호</h4>
                    <div className="space-y-1">
                      {selectedUser.credentials.debates.map((item) => (
                        <div key={item.id} className="text-xs">
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">{item.title}:</span>
                          <span className="font-mono text-zinc-600 dark:text-zinc-400 ml-2 break-all">{item.hashedPassword}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedUser.credentials.surveys.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">설문 비밀번호</h4>
                    <div className="space-y-1">
                      {selectedUser.credentials.surveys.map((item) => (
                        <div key={item.id} className="text-xs">
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">{item.title}:</span>
                          <span className="font-mono text-zinc-600 dark:text-zinc-400 ml-2 break-all">{item.hashedPassword}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedUser.credentials.requests.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">요청 비밀번호</h4>
                    <div className="space-y-1">
                      {selectedUser.credentials.requests.map((item) => (
                        <div key={item.id} className="text-xs">
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">{item.title}:</span>
                          <span className="font-mono text-zinc-600 dark:text-zinc-400 ml-2 break-all">{item.hashedPassword}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}