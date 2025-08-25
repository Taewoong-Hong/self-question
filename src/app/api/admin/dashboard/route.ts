import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { verifyAdminToken } from '@/lib/auth';
import Debate from '@/models/Debate';
import Survey from '@/models/Survey';
import Request from '@/models/Request';
import Guestbook from '@/models/Guestbook';

export async function GET(request: NextRequest) {
  try {
    // 관리자 인증 확인
    const isAdmin = await verifyAdminToken(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 401 }
      );
    }

    await dbConnect();

    // 각 콘텐츠 타입별 통계
    const [
      totalDebates,
      activeDebates,
      totalSurveys,
      activeSurveys,
      totalRequests,
      answeredRequests,
      totalGuestbook,
      recentDebates,
      recentSurveys,
      recentRequests
    ] = await Promise.all([
      // 투표 통계
      Debate.countDocuments({ is_deleted: false }),
      Debate.countDocuments({ is_deleted: false, status: 'active' }),
      
      // 설문 통계
      Survey.countDocuments({ is_deleted: false }),
      Survey.countDocuments({ is_deleted: false, status: 'active' }),
      
      // 요청 통계
      Request.countDocuments({ is_deleted: false }),
      Request.countDocuments({ is_deleted: false, admin_reply: { $exists: true } }),
      
      // 방명록 통계
      Guestbook.countDocuments(),
      
      // 최근 콘텐츠
      Debate.find({ is_deleted: false })
        .sort({ created_at: -1 })
        .limit(5)
        .select('title created_at status'),
      
      Survey.find({ is_deleted: false })
        .sort({ created_at: -1 })
        .limit(5)
        .select('title created_at status'),
      
      Request.find({ is_deleted: false })
        .sort({ created_at: -1 })
        .limit(5)
        .select('title created_at admin_reply')
    ]);

    // 일별 활동 통계 (최근 7일)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyStats = await Promise.all([
      Debate.aggregate([
        {
          $match: {
            created_at: { $gte: sevenDaysAgo },
            is_deleted: false
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
            count: { $sum: 1 }
          }
        }
      ]),
      Survey.aggregate([
        {
          $match: {
            created_at: { $gte: sevenDaysAgo },
            is_deleted: false
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
            count: { $sum: 1 }
          }
        }
      ]),
      Request.aggregate([
        {
          $match: {
            created_at: { $gte: sevenDaysAgo },
            is_deleted: false
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // 일별 통계 병합
    const dailyActivityMap = new Map();
    dailyStats.forEach((stats, index) => {
      const type = ['debates', 'surveys', 'requests'][index];
      stats.forEach(stat => {
        if (!dailyActivityMap.has(stat._id)) {
          dailyActivityMap.set(stat._id, { date: stat._id, debates: 0, surveys: 0, requests: 0 });
        }
        dailyActivityMap.get(stat._id)[type] = stat.count;
      });
    });

    const dailyActivity = Array.from(dailyActivityMap.values())
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      stats: {
        debates: {
          total: totalDebates,
          active: activeDebates
        },
        surveys: {
          total: totalSurveys,
          active: activeSurveys
        },
        requests: {
          total: totalRequests,
          answered: answeredRequests
        },
        guestbook: {
          total: totalGuestbook
        }
      },
      recentContents: {
        debates: recentDebates,
        surveys: recentSurveys,
        requests: recentRequests
      },
      dailyActivity
    });
  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    return NextResponse.json(
      { error: '대시보드 데이터 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}