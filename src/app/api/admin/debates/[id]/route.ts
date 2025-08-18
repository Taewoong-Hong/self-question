import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Debate from '@/models/Debate';
import { verifyJwt } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

// GET /api/admin/debates/[id]
export async function GET(
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
    
    const debate = await Debate.findOne({ id: params.id });
    
    if (!debate) {
      return NextResponse.json({ error: '투표를 찾을 수 없습니다' }, { status: 404 });
    }
    
    return NextResponse.json(debate);
  } catch (error) {
    console.error('투표 조회 오류:', error);
    return NextResponse.json(
      { error: '투표 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}