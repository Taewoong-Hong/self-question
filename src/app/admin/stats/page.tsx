'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface StatsData {
  // 활성 사용자 통계
  activeUsers: {
    dau: number[];  // 최근 30일 DAU
    wau: number[];  // 최근 12주 WAU
    mau: number[];  // 최근 12개월 MAU
    currentDAU: number;
    currentWAU: number;
    currentMAU: number;
    dauTrend: number;  // 전일 대비 %
    wauTrend: number;  // 전주 대비 %
    mauTrend: number;  // 전월 대비 %
  };
  
  // 콘텐츠 통계
  contentStats: {
    totalDebates: number;
    totalSurveys: number;
    activeDebates: number;
    activeSurveys: number;
    todayDebates: number;
    todaySurveys: number;
    weeklyContent: Array<{
      date: string;
      debates: number;
      surveys: number;
    }>;
  };
  
  // 참여율 통계
  engagementStats: {
    avgDebateParticipation: number;
    avgSurveyCompletion: number;
    totalVotes: number;
    totalResponses: number;
    hourlyActivity: Array<{
      hour: number;
      activity: number;
    }>;
  };
  
  // 트래픽 소스
  trafficSources: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
  
  // 디바이스 통계
  deviceStats: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
}

const COLORS = ['#39FF14', '#2ECC0B', '#FFD700', '#FF6B6B', '#4ECDC4'];

export default function AdminStatsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [dateRange, setDateRange] = useState('7d'); // 7d, 30d, 90d
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/admin');
      return;
    }
    
    fetchStats();
    
    // 5분마다 자동 새로고침
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [dateRange]);

  const fetchStats = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem('admin_token');
      
      const response = await fetch(`/api/admin/stats/detailed?range=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-100"></div>
      </div>
    );
  }

  // DAU 차트 데이터 준비
  const dauChartData = stats.activeUsers.dau.map((value, index) => ({
    day: `${30 - index}일 전`,
    users: value
  })).reverse();

  // 시간별 활동 차트 데이터
  const hourlyData = stats.engagementStats.hourlyActivity.map(item => ({
    hour: `${item.hour}시`,
    activity: item.activity
  }));

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* 헤더 */}
      <header className="bg-zinc-900/50 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin/dashboard" className="text-zinc-400 hover:text-zinc-100">
                ← 대시보드
              </Link>
              <h1 className="text-xl font-semibold text-zinc-100">통계 분석</h1>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-surbate"
              >
                <option value="7d">최근 7일</option>
                <option value="30d">최근 30일</option>
                <option value="90d">최근 90일</option>
              </select>
              <button
                onClick={fetchStats}
                disabled={refreshing}
                className={`px-3 py-1.5 bg-zinc-800 text-zinc-100 rounded-lg text-sm hover:bg-zinc-700 transition-colors ${
                  refreshing ? 'opacity-50' : ''
                }`}
              >
                {refreshing ? '새로고침 중...' : '새로고침'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 활성 사용자 섹션 */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-zinc-100 mb-4">활성 사용자</h2>
          
          {/* 핵심 지표 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-zinc-400 text-sm">DAU (일간 활성 사용자)</h3>
                <span className={`text-sm ${stats.activeUsers.dauTrend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.activeUsers.dauTrend >= 0 ? '+' : ''}{stats.activeUsers.dauTrend}%
                </span>
              </div>
              <div className="text-3xl font-bold text-zinc-100">
                {stats.activeUsers.currentDAU.toLocaleString()}
              </div>
              <p className="text-zinc-500 text-sm mt-1">전일 대비</p>
            </div>

            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-zinc-400 text-sm">WAU (주간 활성 사용자)</h3>
                <span className={`text-sm ${stats.activeUsers.wauTrend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.activeUsers.wauTrend >= 0 ? '+' : ''}{stats.activeUsers.wauTrend}%
                </span>
              </div>
              <div className="text-3xl font-bold text-zinc-100">
                {stats.activeUsers.currentWAU.toLocaleString()}
              </div>
              <p className="text-zinc-500 text-sm mt-1">전주 대비</p>
            </div>

            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-zinc-400 text-sm">MAU (월간 활성 사용자)</h3>
                <span className={`text-sm ${stats.activeUsers.mauTrend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.activeUsers.mauTrend >= 0 ? '+' : ''}{stats.activeUsers.mauTrend}%
                </span>
              </div>
              <div className="text-3xl font-bold text-zinc-100">
                {stats.activeUsers.currentMAU.toLocaleString()}
              </div>
              <p className="text-zinc-500 text-sm mt-1">전월 대비</p>
            </div>
          </div>

          {/* DAU 트렌드 차트 */}
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">DAU 트렌드 (최근 30일)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dauChartData}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#39FF14" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#39FF14" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="day" stroke="#a1a1aa" />
                  <YAxis stroke="#a1a1aa" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                    labelStyle={{ color: '#e4e4e7' }}
                  />
                  <Area type="monotone" dataKey="users" stroke="#39FF14" fillOpacity={1} fill="url(#colorUsers)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* 콘텐츠 통계 섹션 */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-zinc-100 mb-4">콘텐츠 통계</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 콘텐츠 현황 */}
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-zinc-100 mb-4">콘텐츠 현황</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">총 투표수</span>
                  <span className="text-zinc-100 font-semibold">{stats.contentStats.totalDebates}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">총 설문수</span>
                  <span className="text-zinc-100 font-semibold">{stats.contentStats.totalSurveys}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">진행중인 투표</span>
                  <span className="text-zinc-100 font-semibold">{stats.contentStats.activeDebates}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">진행중인 설문</span>
                  <span className="text-zinc-100 font-semibold">{stats.contentStats.activeSurveys}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">오늘 생성된 투표</span>
                  <span className="text-zinc-100 font-semibold">{stats.contentStats.todayDebates}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">오늘 생성된 설문</span>
                  <span className="text-zinc-100 font-semibold">{stats.contentStats.todaySurveys}</span>
                </div>
              </div>
            </div>

            {/* 주간 콘텐츠 생성 추이 */}
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-zinc-100 mb-4">주간 콘텐츠 생성 추이</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.contentStats.weeklyContent}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis dataKey="date" stroke="#a1a1aa" />
                    <YAxis stroke="#a1a1aa" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                      labelStyle={{ color: '#e4e4e7' }}
                    />
                    <Legend />
                    <Bar dataKey="debates" fill="#4ECDC4" name="투표" />
                    <Bar dataKey="surveys" fill="#FFD700" name="설문" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* 참여율 및 활동 패턴 */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-zinc-100 mb-4">참여율 및 활동 패턴</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 참여율 지표 */}
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-zinc-100 mb-4">참여율 지표</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-zinc-400 text-sm">평균 투표 참여율</span>
                    <span className="text-zinc-100 text-sm font-semibold">
                      {stats.engagementStats.avgDebateParticipation}%
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-surbate to-brand-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${stats.engagementStats.avgDebateParticipation}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-zinc-400 text-sm">평균 설문 완료율</span>
                    <span className="text-zinc-100 text-sm font-semibold">
                      {stats.engagementStats.avgSurveyCompletion}%
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-brand-400 to-brand-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${stats.engagementStats.avgSurveyCompletion}%` }}
                    />
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">총 투표 수</span>
                    <span className="text-zinc-100 font-semibold">
                      {stats.engagementStats.totalVotes.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">총 설문 응답 수</span>
                    <span className="text-zinc-100 font-semibold">
                      {stats.engagementStats.totalResponses.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 시간별 활동 패턴 */}
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-zinc-100 mb-4">시간별 활동 패턴</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis dataKey="hour" stroke="#a1a1aa" />
                    <YAxis stroke="#a1a1aa" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                      labelStyle={{ color: '#e4e4e7' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="activity" 
                      stroke="#39FF14" 
                      strokeWidth={2}
                      dot={{ fill: '#39FF14' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* 트래픽 및 디바이스 분석 */}
        <section>
          <h2 className="text-xl font-bold text-zinc-100 mb-4">트래픽 및 디바이스 분석</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 트래픽 소스 */}
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-zinc-100 mb-4">트래픽 소스</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.trafficSources}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ source, percentage }) => `${source} (${percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {stats.trafficSources.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                      labelStyle={{ color: '#e4e4e7' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 디바이스 통계 */}
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-zinc-100 mb-4">디바이스 통계</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.deviceStats} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis type="number" stroke="#a1a1aa" />
                    <YAxis type="category" dataKey="type" stroke="#a1a1aa" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                      labelStyle={{ color: '#e4e4e7' }}
                    />
                    <Bar dataKey="percentage" fill="#39FF14">
                      {stats.deviceStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}