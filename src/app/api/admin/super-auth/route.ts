import { NextRequest, NextResponse } from 'next/server';
import { signJwt } from '@/lib/jwt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 슈퍼 관리자 로그인
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;
    
    // 환경 변수에서 슈퍼 관리자 인증 정보 확인
    const SUPER_ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME || 'admin';
    const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'admin123!';
    
    // 디버깅을 위한 로그 (프로덕션에서는 제거해야 함)
    console.log('Login attempt:', { 
      username, 
      expectedUsername: SUPER_ADMIN_USERNAME,
      match: username === SUPER_ADMIN_USERNAME 
    });
    console.log('Env check:', {
      hasUsername: !!process.env.SUPER_ADMIN_USERNAME,
      hasPassword: !!process.env.SUPER_ADMIN_PASSWORD,
      defaultsUsed: {
        username: !process.env.SUPER_ADMIN_USERNAME,
        password: !process.env.SUPER_ADMIN_PASSWORD
      }
    });
    
    if (username !== SUPER_ADMIN_USERNAME || password !== SUPER_ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: '아이디 또는 비밀번호가 일치하지 않습니다' },
        { status: 401 }
      );
    }
    
    // JWT 토큰 생성
    let token: string;
    try {
      token = signJwt({
        username: SUPER_ADMIN_USERNAME,
        role: 'super_admin',
        isAdmin: true
      });
      console.log('JWT token created successfully');
    } catch (jwtError) {
      console.error('JWT creation error:', jwtError);
      return NextResponse.json(
        { error: 'JWT 토큰 생성 실패' },
        { status: 500 }
      );
    }
    
    // Create response with token in both body and cookie
    const response = NextResponse.json({
      message: '로그인 성공',
      token,
      user: {
        username: SUPER_ADMIN_USERNAME,
        role: 'super_admin'
      }
    });
    
    // Set HTTP-only cookie for API route authentication
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/'
    });
    
    return response;
    
  } catch (error) {
    console.error('Super admin login error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}