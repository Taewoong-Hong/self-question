import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Survey from '@/models/Survey';
import { cookies } from 'next/headers';
export const dynamic = 'force-dynamic';

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
    
    // Generate author token
    const authorToken = survey.generateAdminToken();  // TODO: 메소드 이름도 generateAuthorToken으로 변경 필요
    await survey.save();
    
    // 쿠키로 작성자 세션 설정
    cookies().set(`survey_author_${params.id}`, authorToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30 // 30일
    });
    
    return NextResponse.json({
      message: '인증에 성공했습니다',
      admin_token: authorToken,  // 하위 호환성 유지 (TODO: author_token으로 변경)
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