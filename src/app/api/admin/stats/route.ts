import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Debate from '@/lib/models/Debate';
import Survey from '@/lib/models/Survey';
import { verifyAdminAuth } from '@/lib/adminAuthUtils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  // 슈퍼 관리자 인증 확인 (헤더 또는 쿠키에서)
  const adminUser = await verifyAdminAuth(request);
  
  if (!adminUser) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }
  
  if (!adminUser.isAdmin) {
    return NextResponse.json({ error: '슈퍼 관리자 권한이 필요합니다' }, { status: 403 });
  }

  try {
    await dbConnect();
    
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
    // Debate 모델에서 voter_ips 배열의 ip_hash 필드에서 고유값 추출
    const debates = await Debate.find({ is_deleted: false });
    const debateVoterIps = new Set();
    debates.forEach(debate => {
      if (debate.voter_ips && Array.isArray(debate.voter_ips)) {
        debate.voter_ips.forEach((voterIp: any) => {
          if (voterIp.ip_hash) {
            debateVoterIps.add(voterIp.ip_hash);
          }
        });
      }
    });
    
    // Survey는 응답자 IP를 저장하지 않으므로 임시로 0 사용
    const totalUsers = debateVoterIps.size;
    
    // 오늘 참여자 수
    const todayDebates = await Debate.find({ is_deleted: false });
    const todayDebateVoterIps = new Set();
    todayDebates.forEach(debate => {
      if (debate.voter_ips && Array.isArray(debate.voter_ips)) {
        debate.voter_ips.forEach((voterIp: any) => {
          if (voterIp.ip_hash && voterIp.last_vote_at && new Date(voterIp.last_vote_at) >= todayStart) {
            todayDebateVoterIps.add(voterIp.ip_hash);
          }
        });
      }
    });
    const todayUsers = todayDebateVoterIps.size;
    
    // 월간 활성 사용자 (MAU)
    const monthDebates = await Debate.find({ is_deleted: false });
    const monthDebateVoterIps = new Set();
    monthDebates.forEach(debate => {
      if (debate.voter_ips && Array.isArray(debate.voter_ips)) {
        debate.voter_ips.forEach((voterIp: any) => {
          if (voterIp.ip_hash && voterIp.last_vote_at && new Date(voterIp.last_vote_at) >= monthStart) {
            monthDebateVoterIps.add(voterIp.ip_hash);
          }
        });
      }
    });
    const monthlyActiveUsers = monthDebateVoterIps.size;
    
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
    
    // Survey는 응답 수를 stats에 저장
    const surveys = await Survey.find({ is_deleted: false });
    let totalResponses = 0;
    surveys.forEach(survey => {
      if (survey.stats && survey.stats.response_count) {
        totalResponses += survey.stats.response_count;
      }
    });
    
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