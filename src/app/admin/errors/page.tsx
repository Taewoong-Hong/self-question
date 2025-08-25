'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface ErrorLog {
  _id: string;
  id: string;
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  timestamp: string;
  type: 'client' | 'server';
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  metadata?: any;
}

interface APIEndpoint {
  name: string;
  url: string;
  method: string;
}

const API_ENDPOINTS: APIEndpoint[] = [
  { name: '투표 목록', url: '/api/debates', method: 'GET' },
  { name: '설문 목록', url: '/api/surveys', method: 'GET' },
  { name: '요청 목록', url: '/api/requests', method: 'GET' },
  { name: '방명록 목록', url: '/api/guestbook', method: 'GET' },
  { name: 'Admin 대시보드', url: '/api/admin/dashboard', method: 'GET' },
  { name: 'Admin 사용자 목록', url: '/api/admin/users', method: 'GET' },
  { name: 'Admin 콘텐츠 목록', url: '/api/admin/contents', method: 'GET' },
];

export default function AdminErrorsPage() {
  const { isAdminLoggedIn } = useAdminAuth();
  const router = useRouter();
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    severity: '',
    type: '',
    resolved: ''
  });
  const [apiTestResults, setApiTestResults] = useState<Record<string, 'pending' | 'success' | 'error'>>({});

  useEffect(() => {
    if (!isAdminLoggedIn) {
      router.push('/admin/login');
      return;
    }
    fetchErrors();
  }, [isAdminLoggedIn, filter]);

  const fetchErrors = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.severity) params.append('severity', filter.severity);
      if (filter.type) params.append('type', filter.type);
      if (filter.resolved) params.append('resolved', filter.resolved);

      const response = await axios.get(`/api/admin/error-logs?${params}`, {
        withCredentials: true
      });
      setErrors(response.data.logs);
    } catch (error) {
      console.error('에러 로그 조회 실패:', error);
      toast.error('에러 로그를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const testAPI = async (endpoint: APIEndpoint) => {
    setApiTestResults(prev => ({ ...prev, [endpoint.name]: 'pending' }));
    
    try {
      await axios({
        method: endpoint.method,
        url: endpoint.url,
        timeout: 5000,
        withCredentials: true
      });
      setApiTestResults(prev => ({ ...prev, [endpoint.name]: 'success' }));
      toast.success(`${endpoint.name} API 정상 작동`);
    } catch (error) {
      setApiTestResults(prev => ({ ...prev, [endpoint.name]: 'error' }));
      toast.error(`${endpoint.name} API 오류`);
      console.error(`API 테스트 실패 - ${endpoint.name}:`, error);
    }
  };

  const testAllAPIs = async () => {
    for (const endpoint of API_ENDPOINTS) {
      await testAPI(endpoint);
      await new Promise(resolve => setTimeout(resolve, 500)); // 0.5초 딜레이
    }
  };

  const toggleResolved = async (errorId: string, currentStatus: boolean) => {
    try {
      await axios.patch(`/api/admin/error-logs/${errorId}`, {
        resolved: !currentStatus
      }, {
        withCredentials: true
      });
      toast.success('상태가 업데이트되었습니다.');
      fetchErrors();
    } catch (error) {
      toast.error('상태 업데이트에 실패했습니다.');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-500/10';
      case 'high': return 'text-orange-500 bg-orange-500/10';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10';
      case 'low': return 'text-green-500 bg-green-500/10';
      default: return 'text-zinc-500 bg-zinc-500/10';
    }
  };

  if (!isAdminLoggedIn) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-700 dark:border-zinc-100"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">에러 로그</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">시스템 에러 로그 및 API 상태 모니터링</p>
      </div>

      {/* API 테스트 섹션 */}
      <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-6 mb-8 shadow-sm dark:shadow-none">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">API 상태 테스트</h2>
          <button
            onClick={testAllAPIs}
            className="px-4 py-2 bg-gradient-to-r from-surbate to-brand-600 text-zinc-900 font-semibold rounded-lg hover:from-brand-400 hover:to-brand-600 transition-all duration-200"
          >
            전체 테스트
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {API_ENDPOINTS.map((endpoint) => (
            <div
              key={endpoint.name}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg"
            >
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{endpoint.name}</span>
              <button
                onClick={() => testAPI(endpoint)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  apiTestResults[endpoint.name] === 'pending'
                    ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                    : apiTestResults[endpoint.name] === 'success'
                    ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                    : apiTestResults[endpoint.name] === 'error'
                    ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                    : 'bg-gray-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-gray-300 dark:hover:bg-zinc-600'
                }`}
                disabled={apiTestResults[endpoint.name] === 'pending'}
              >
                {apiTestResults[endpoint.name] === 'pending' ? '테스트 중...' : '테스트'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 필터 */}
      <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl p-6 mb-8 shadow-sm dark:shadow-none">
        <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">필터</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-2">
              심각도
            </label>
            <select
              value={filter.severity}
              onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
            >
              <option value="">전체</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-2">
              타입
            </label>
            <select
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
            >
              <option value="">전체</option>
              <option value="client">Client</option>
              <option value="server">Server</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-2">
              상태
            </label>
            <select
              value={filter.resolved}
              onChange={(e) => setFilter({ ...filter, resolved: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
            >
              <option value="">전체</option>
              <option value="false">미해결</option>
              <option value="true">해결됨</option>
            </select>
          </div>
        </div>
      </div>

      {/* 에러 로그 목록 */}
      <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm dark:shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  시간
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  심각도
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  타입
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  메시지
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  상태
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
              {errors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    에러 로그가 없습니다.
                  </td>
                </tr>
              ) : (
                errors.map((error) => (
                  <tr key={error._id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-400">
                      {formatDistanceToNow(new Date(error.timestamp), {
                        addSuffix: true,
                        locale: ko
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(error.severity)}`}>
                        {error.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-400">
                      {error.type}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-900 dark:text-zinc-100">
                      <div className="max-w-xs truncate" title={error.message}>
                        {error.message}
                      </div>
                      {error.stack && (
                        <details className="mt-1">
                          <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300">
                            스택 트레이스 보기
                          </summary>
                          <pre className="mt-2 text-xs bg-gray-100 dark:bg-zinc-800 p-2 rounded overflow-x-auto">
                            {error.stack}
                          </pre>
                        </details>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                      {error.url && (
                        <div className="max-w-xs truncate" title={error.url}>
                          {error.url}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleResolved(error.id, error.resolved)}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          error.resolved
                            ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                            : 'bg-red-500/20 text-red-600 dark:text-red-400'
                        }`}
                      >
                        {error.resolved ? '해결됨' : '미해결'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}