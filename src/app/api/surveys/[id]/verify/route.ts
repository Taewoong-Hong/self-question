import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Survey from '@/models/Survey';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const body = await request.json();
    
    if (!body.password) {
      return NextResponse.json(
        { error: '비밀번호를 입력해주세요' },
        { status: 400 }
      );
    }
    
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
    
    // Validate password
    const isValid = await survey.validatePassword(body.password);
    
    if (!isValid) {
      return NextResponse.json(
        { error: '비밀번호가 일치하지 않습니다' },
        { status: 401 }
      );
    }
    
    // Generate admin token
    const adminToken = survey.generateAdminToken();
    await survey.save();
    
    return NextResponse.json({
      message: '인증에 성공했습니다',
      admin_token: adminToken,
      expires_at: survey.admin_token_expires
    });
    
  } catch (error: any) {
    console.error('Password verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}