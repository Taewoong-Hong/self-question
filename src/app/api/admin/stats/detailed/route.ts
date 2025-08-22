import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { verifyAdminToken } from '@/lib/middleware/adminAuth';
import Debate from '@/lib/models/Debate';
import Survey from '@/lib/models/Survey';

export const dynamic = 'force-dynamic';

// IP를 기반으로 고유 사용자를 추적하기 위한 헬퍼 함수
function getDateRange(range: string): { start: Date; end: Date } {
  const end = new Date();
  let start = new Date();
  
  switch (range) {
    case '7d':
      start.setDate(end.getDate() - 7);
      break;
    case '30d':
      start.setDate(end.getDate() - 30);
      break;
    case '90d':
      start.setDate(end.getDate() - 90);
      break;
    default:
      start.setDate(end.getDate() - 30);
  }
  
  return { start, end };
}

// 일별 활성 사용자 수 계산
async function calculateDAU(days: number) {
  const dauData = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));
    
    // 해당 날짜에 투표한 고유 IP 수
    const debates = await Debate.find({ is_deleted: false });
    const uniqueVoters = new Set();
    debates.forEach(debate => {
      if (debate.voter_ips && Array.isArray(debate.voter_ips)) {
        debate.voter_ips.forEach((voterIp: any) => {
          if (voterIp.ip_hash && voterIp.last_vote_at && new Date(voterIp.last_vote_at) >= startOfDay && new Date(voterIp.last_vote_at) <= endOfDay) {
            uniqueVoters.add(voterIp.ip_hash);
          }
        });
      }
    });
    
    dauData.push(uniqueVoters.size);
  }
  
  return dauData;
}

// 주별 활성 사용자 수 계산
async function calculateWAU(weeks: number) {
  const wauData = [];
  const today = new Date();
  
  for (let i = 0; i < weeks; i++) {
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() - (i * 7));
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 7);
    
    const debates = await Debate.find({ is_deleted: false });
    const uniqueVoters = new Set();
    debates.forEach(debate => {
      if (debate.voter_ips && Array.isArray(debate.voter_ips)) {
        debate.voter_ips.forEach((voterIp: any) => {
          if (voterIp.ip_hash && voterIp.last_vote_at && new Date(voterIp.last_vote_at) >= weekStart && new Date(voterIp.last_vote_at) <= weekEnd) {
            uniqueVoters.add(voterIp.ip_hash);
          }
        });
      }
    });
    
    wauData.push(uniqueVoters.size);
  }
  
  return wauData;
}

// 월별 활성 사용자 수 계산
async function calculateMAU(months: number) {
  const mauData = [];
  const today = new Date();
  
  for (let i = 0; i < months; i++) {
    const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
    
    const debates = await Debate.find({ is_deleted: false });
    const uniqueVoters = new Set();
    debates.forEach(debate => {
      if (debate.voter_ips && Array.isArray(debate.voter_ips)) {
        debate.voter_ips.forEach((voterIp: any) => {
          if (voterIp.ip_hash && voterIp.last_vote_at && new Date(voterIp.last_vote_at) >= monthStart && new Date(voterIp.last_vote_at) <= monthEnd) {
            uniqueVoters.add(voterIp.ip_hash);
          }
        });
      }
    });
    
    mauData.push(uniqueVoters.size);
  }
  
  return mauData;
}

export async function GET(request: NextRequest) {
  try {
    // 관리자 인증
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = verifyAdminToken(token);
      if (!decoded || !decoded.isAdmin) {
        return NextResponse.json({ error: '슈퍼 관리자 권한이 필요합니다' }, { status: 403 });
      }
    } catch (error) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다' }, { status: 401 });
    }

    await dbConnect();

    const range = request.nextUrl.searchParams.get('range') || '30d';
    const { start, end } = getDateRange(range);

    // 활성 사용자 통계
    const dauData = await calculateDAU(30);
    const wauData = await calculateWAU(12);
    const mauData = await calculateMAU(12);

    // 현재 DAU, WAU, MAU
    const today = new Date();
    const yesterday = new Date(today.setDate(today.getDate() - 1));
    const lastWeek = new Date(today.setDate(today.getDate() - 7));
    const lastMonth = new Date(today.setMonth(today.getMonth() - 1));

    // 트렌드 계산
    const currentDAU = dauData[0];
    const previousDAU = dauData[1] || 1;
    const dauTrend = ((currentDAU - previousDAU) / previousDAU * 100).toFixed(1);

    const currentWAU = wauData[0];
    const previousWAU = wauData[1] || 1;
    const wauTrend = ((currentWAU - previousWAU) / previousWAU * 100).toFixed(1);

    const currentMAU = mauData[0];
    const previousMAU = mauData[1] || 1;
    const mauTrend = ((currentMAU - previousMAU) / previousMAU * 100).toFixed(1);

    // 콘텐츠 통계
    const totalDebates = await Debate.countDocuments({ is_deleted: false });
    const totalSurveys = await Survey.countDocuments({ is_deleted: false });
    const activeDebates = await Debate.countDocuments({ 
      is_deleted: false,
      status: 'open' 
    });
    const activeSurveys = await Survey.countDocuments({ 
      is_deleted: false,
      status: 'open' 
    });

    // 오늘 생성된 콘텐츠
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayDebates = await Debate.countDocuments({
      created_at: { $gte: todayStart }
    });
    const todaySurveys = await Survey.countDocuments({
      created_at: { $gte: todayStart }
    });

    // 주간 콘텐츠 생성 추이
    const weeklyContent = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const debates = await Debate.countDocuments({
        created_at: { $gte: dayStart, $lte: dayEnd }
      });
      const surveys = await Survey.countDocuments({
        created_at: { $gte: dayStart, $lte: dayEnd }
      });

      weeklyContent.push({
        date: date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
        debates,
        surveys
      });
    }

    // 참여율 통계
    const totalVotes = await Debate.aggregate([
      { $match: { is_deleted: false } },
      { $group: { _id: null, total: { $sum: '$stats.total_votes' } } }
    ]);
    
    const surveys = await Survey.find({ is_deleted: false });
    let totalResponses = 0;
    surveys.forEach(survey => {
      if (survey.stats && survey.stats.response_count) {
        totalResponses += survey.stats.response_count;
      }
    });

    // 평균 참여율 계산
    const debatesWithVotes = await Debate.find({ 
      'stats.total_votes': { $gt: 0 } 
    }).select('stats.total_votes');
    
    const avgDebateParticipation = debatesWithVotes.length > 0
      ? Math.round(debatesWithVotes.reduce((sum, d) => sum + (d.stats?.total_votes || 0), 0) / debatesWithVotes.length)
      : 0;

    const surveysWithResponses = await Survey.find({
      'stats.response_count': { $gt: 0 }
    }).select('stats.response_count stats.completion_rate');

    const avgSurveyCompletion = surveysWithResponses.length > 0
      ? Math.round(surveysWithResponses.reduce((sum, s) => sum + (s.stats?.completion_rate || 0), 0) / surveysWithResponses.length)
      : 0;

    // 시간별 활동 패턴 (임시 데이터)
    const hourlyActivity = [];
    for (let hour = 0; hour < 24; hour++) {
      hourlyActivity.push({
        hour,
        activity: Math.floor(Math.random() * 100) // 임시 데이터
      });
    }

    // 트래픽 소스 (예시 데이터 - 실제로는 referrer 데이터 분석 필요)
    const trafficSources = [
      { source: '직접 방문', count: 450, percentage: 45 },
      { source: '소셜 미디어', count: 250, percentage: 25 },
      { source: '검색 엔진', count: 200, percentage: 20 },
      { source: '외부 링크', count: 100, percentage: 10 }
    ];

    // 디바이스 통계 (예시 데이터 - 실제로는 user agent 분석 필요)
    const deviceStats = [
      { type: '모바일', count: 600, percentage: 60 },
      { type: '데스크톱', count: 350, percentage: 35 },
      { type: '태블릿', count: 50, percentage: 5 }
    ];

    return NextResponse.json({
      activeUsers: {
        dau: dauData,
        wau: wauData,
        mau: mauData,
        currentDAU,
        currentWAU,
        currentMAU,
        dauTrend: parseFloat(dauTrend),
        wauTrend: parseFloat(wauTrend),
        mauTrend: parseFloat(mauTrend)
      },
      contentStats: {
        totalDebates,
        totalSurveys,
        activeDebates,
        activeSurveys,
        todayDebates,
        todaySurveys,
        weeklyContent
      },
      engagementStats: {
        avgDebateParticipation,
        avgSurveyCompletion,
        totalVotes: totalVotes[0]?.total || 0,
        totalResponses,
        hourlyActivity
      },
      trafficSources,
      deviceStats
    });

  } catch (error: any) {
    console.error('Admin detailed stats error:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}