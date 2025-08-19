import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Survey from '@/models/Survey';
import { verifyJwt } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

// PUT /api/admin/surveys/[id]/results
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
    
    const { admin_results, response_count, created_at, first_response_at, close_at, start_at, end_at } = await request.json();
    
    const survey = await Survey.findOne({ id: params.id });
    
    if (!survey) {
      return NextResponse.json({ error: '설문을 찾을 수 없습니다' }, { status: 404 });
    }
    
    // 관리자 결과 데이터 업데이트
    survey.admin_results = admin_results;
    survey.stats.response_count = response_count;
    
    // 날짜 업데이트
    if (created_at) {
      survey.created_at = new Date(created_at);
    }
    if (first_response_at) {
      survey.first_response_at = new Date(first_response_at);
      survey.is_editable = false;
    }
    if (close_at !== undefined) {
      if (!survey.settings) {
        survey.settings = {} as any;
      }
      survey.settings.close_at = close_at ? new Date(close_at) : undefined;
    }
    if (start_at !== undefined) {
      survey.start_at = start_at ? new Date(start_at) : undefined;
    }
    if (end_at !== undefined) {
      survey.end_at = end_at ? new Date(end_at) : undefined;
    }
    
    // 설문 종료 날짜 확인 및 상태 자동 업데이트
    // 우선순위: end_at > close_at
    const now = new Date();
    const endDate = survey.end_at || survey.settings?.close_at;
    const startDate = survey.start_at;
    
    if (endDate && now > new Date(endDate)) {
      survey.status = 'closed';
    } else if (startDate && now < new Date(startDate)) {
      survey.status = 'scheduled';
    } else {
      survey.status = 'open';
    }
    
    await survey.save();
    
    return NextResponse.json({ 
      message: '결과가 성공적으로 저장되었습니다',
      survey: survey
    });
  } catch (error) {
    console.error('결과 저장 오류:', error);
    return NextResponse.json(
      { error: '결과 저장 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}