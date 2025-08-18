import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Debate from '@/models/Debate';
import Survey from '@/models/Survey';
import Response from '@/models/Response';
import { checkAdminAuth } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // 관리자 인증 확인
  if (!checkAdminAuth(request)) {
    return NextResponse.json(
      { error: '인증이 필요합니다' },
      { status: 401 }
    );
  }

  try {
    await connectDB();
    
    // 현재 시간 기준
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // 총 투표 수
    const totalDebates = await Debate.countDocuments({ is_deleted: false });
    const activeDebates = await Debate.countDocuments({ 
      is_deleted: false,
      status: 'active'
    });
    
    // 총 설문 수
    const totalSurveys = await Survey.countDocuments({ is_deleted: false });
    const activeSurveys = await Survey.countDocuments({ 
      is_deleted: false,
      status: 'open'
    });
    
    // 총 참여자 수 (고유 IP 기준)
    const debateVoters = await Debate.distinct('voters.ip_address');
    const surveyResponders = await Response.distinct('ip_address');
    const allUniqueIps = new Set([...debateVoters, ...surveyResponders]);
    const totalUsers = allUniqueIps.size;
    
    // 오늘 참여자 수
    const todayDebateVoters = await Debate.distinct('voters.ip_address', {
      'voters.voted_at': { $gte: todayStart }
    });
    const todaySurveyResponders = await Response.distinct('ip_address', {
      created_at: { $gte: todayStart }
    });
    const todayUniqueIps = new Set([...todayDebateVoters, ...todaySurveyResponders]);
    const todayUsers = todayUniqueIps.size;
    
    // 월간 활성 사용자 (MAU)
    const monthDebateVoters = await Debate.distinct('voters.ip_address', {
      'voters.voted_at': { $gte: monthStart }
    });
    const monthSurveyResponders = await Response.distinct('ip_address', {
      created_at: { $gte: monthStart }
    });
    const monthUniqueIps = new Set([...monthDebateVoters, ...monthSurveyResponders]);
    const monthlyActiveUsers = monthUniqueIps.size;
    
    // 최근 에러 수 (ErrorLog 모델이 있다면)
    // const recentErrors = await ErrorLog.countDocuments({
    //   created_at: { $gte: dayAgo },
    //   resolved: false
    // });
    const recentErrors = 0; // 임시값
    
    // 추가 통계
    const totalVotes = await Debate.aggregate([
      { $match: { is_deleted: false } },
      { $group: { _id: null, total: { $sum: '$stats.total_votes' } } }
    ]);
    
    const totalResponses = await Response.countDocuments();
    
    return NextResponse.json({
      totalDebates,
      activeDebates,
      totalSurveys,
      activeSurveys,
      totalUsers,
      todayUsers,
      monthlyActiveUsers,
      recentErrors,
      totalVotes: totalVotes[0]?.total || 0,
      totalResponses,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}