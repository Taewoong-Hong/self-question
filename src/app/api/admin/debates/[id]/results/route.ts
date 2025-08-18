import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Debate from '@/models/Debate';
import { verifyJwt } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

// PUT /api/admin/debates/[id]/results
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    // 슈퍼 관리자 인증 확인
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    try {
      const decoded = verifyJwt(token) as any;
      // 슈퍼 관리자인지 확인
      if (!decoded.isAdmin) {
        return NextResponse.json({ error: '슈퍼 관리자 권한이 필요합니다' }, { status: 403 });
      }
    } catch (error) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다' }, { status: 401 });
    }
    
    const { admin_results, created_at, start_at, end_at } = await request.json();
    
    const debate = await Debate.findOne({ id: params.id });
    
    if (!debate) {
      return NextResponse.json({ error: '투표를 찾을 수 없습니다' }, { status: 404 });
    }
    
    // 관리자 결과 데이터 업데이트
    if (admin_results) {
      debate.admin_results = admin_results;
      debate.stats.total_votes = admin_results.agree_count + admin_results.disagree_count;
      debate.stats.agree_count = admin_results.agree_count;
      debate.stats.disagree_count = admin_results.disagree_count;
      debate.stats.opinion_count = admin_results.opinions?.length || 0;
    }
    
    // 날짜 업데이트
    if (created_at) {
      debate.created_at = new Date(created_at);
    }
    if (start_at) {
      debate.start_at = new Date(start_at);
    }
    if (end_at) {
      debate.end_at = new Date(end_at);
    }
    
    // 종료 날짜 확인 및 상태 자동 업데이트
    if (debate.end_at && new Date() > new Date(debate.end_at)) {
      debate.status = 'ended';
    } else if (debate.start_at && new Date() < new Date(debate.start_at)) {
      debate.status = 'scheduled';
    } else {
      debate.status = 'active';
    }
    
    await debate.save();
    
    return NextResponse.json({ 
      message: '결과가 성공적으로 저장되었습니다',
      debate: debate
    });
  } catch (error) {
    console.error('결과 저장 오류:', error);
    return NextResponse.json(
      { error: '결과 저장 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}