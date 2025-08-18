import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Survey from '@/models/Survey';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    // Get admin token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }
    
    const adminToken = authHeader.substring(7);
    
    // Verify admin token
    try {
      const decoded = jwt.verify(adminToken, process.env.JWT_SECRET || 'your-secret-key') as any;
      
      if (decoded.surveyId !== params.id || decoded.type !== 'survey_admin') {
        return NextResponse.json(
          { error: '권한이 없습니다' },
          { status: 403 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      );
    }
    
    // Get request body
    const body = await request.json();
    const { status } = body;
    
    if (!status || !['draft', 'open', 'closed'].includes(status)) {
      return NextResponse.json(
        { error: '유효하지 않은 상태값입니다' },
        { status: 400 }
      );
    }
    
    // Find and update survey
    const survey = await Survey.findOne({ 
      id: params.id,
      is_deleted: false 
    });
    
    if (!survey) {
      return NextResponse.json(
        { error: '설문을 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    
    // Update status
    survey.status = status;
    
    await survey.save();
    
    return NextResponse.json({
      message: '설문 상태가 변경되었습니다',
      status: survey.status,
      survey: {
        id: survey.id,
        title: survey.title,
        status: survey.status
      }
    });
    
  } catch (error: any) {
    console.error('Status update error:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}