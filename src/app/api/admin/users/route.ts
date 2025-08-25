import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { verifyAdminToken } from '@/lib/auth';
import Debate from '@/models/Debate';
import Survey from '@/models/Survey';
import Request from '@/models/Request';
import Guestbook from '@/models/Guestbook';

export const dynamic = 'force-dynamic';

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

    // IP별 사용자 활동을 집계
    const debates = await Debate.aggregate([
      {
        $group: {
          _id: '$author_ip',
          count: { $sum: 1 },
          lastActivity: { $max: '$created_at' },
          firstSeen: { $min: '$created_at' }
        }
      }
    ]);

    const surveys = await Survey.aggregate([
      {
        $group: {
          _id: '$author_ip',
          count: { $sum: 1 },
          lastActivity: { $max: '$created_at' },
          firstSeen: { $min: '$created_at' }
        }
      }
    ]);

    const requests = await Request.aggregate([
      {
        $group: {
          _id: '$author_ip',
          count: { $sum: 1 },
          lastActivity: { $max: '$created_at' },
          firstSeen: { $min: '$created_at' }
        }
      }
    ]);

    const guestbook = await Guestbook.aggregate([
      {
        $group: {
          _id: '$ip',
          count: { $sum: 1 },
          lastActivity: { $max: '$created_at' },
          firstSeen: { $min: '$created_at' }
        }
      }
    ]);

    // IP별로 데이터 통합
    const ipMap = new Map();

    // 각 콘텐츠 타입별로 집계
    const processAggregation = (data: any[], type: string) => {
      data.forEach(item => {
        if (!item._id) return;
        
        const existing = ipMap.get(item._id) || {
          ip: item._id,
          totalDebates: 0,
          totalSurveys: 0,
          totalRequests: 0,
          totalGuestbook: 0,
                    lastActivity: new Date(0),
          firstSeen: new Date()
        };

        existing[`total${type}`] = item.count;
        
        if (new Date(item.lastActivity) > new Date(existing.lastActivity)) {
          existing.lastActivity = item.lastActivity;
        }
        
        if (new Date(item.firstSeen) < new Date(existing.firstSeen)) {
          existing.firstSeen = item.firstSeen;
        }

        ipMap.set(item._id, existing);
      });
    };

    processAggregation(debates, 'Debates');
    processAggregation(surveys, 'Surveys');
    processAggregation(requests, 'Requests');
    processAggregation(guestbook, 'Guestbook');
    
    // 배열로 변환하고 정렬
    const users = Array.from(ipMap.values())
      .map(user => ({
        _id: user.ip,
        ...user
      }))
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: '사용자 목록 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}