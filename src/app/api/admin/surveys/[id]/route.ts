import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Survey from '@/models/Survey';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

// GET /api/admin/surveys/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    // 관리자 인증 확인
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    try {
      jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (error) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다' }, { status: 401 });
    }
    
    const survey = await Survey.findOne({ id: params.id }).populate('questions');
    
    if (!survey) {
      return NextResponse.json({ error: '설문을 찾을 수 없습니다' }, { status: 404 });
    }
    
    return NextResponse.json(survey);
  } catch (error) {
    console.error('설문 조회 오류:', error);
    return NextResponse.json(
      { error: '설문 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}