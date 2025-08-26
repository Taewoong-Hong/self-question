import { NextRequest, NextResponse } from 'next/server';
import { validateAdminCredentials, generateAdminTokens } from '@/lib/middleware/adminAuth';

// Admin 로그인
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;
    
    if (!username || !password) {
      return NextResponse.json(
        { error: '아이디와 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }
    
    // 관리자 인증 확인
    const isValid = validateAdminCredentials(username, password);
    
    if (!isValid) {
      return NextResponse.json(
        { error: '아이디 또는 비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }
    
    // JWT 토큰 생성
    const { accessToken, refreshToken } = generateAdminTokens();
    
    const response = NextResponse.json({
      success: true,
      token: accessToken, // 기존 호환성 유지
      accessToken,
      username
    });
    
    // Access Token도 httpOnly 쿠키로 설정 (middleware가 확인하는 쿠키)
    response.cookies.set('admin_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 24시간
    });
    
    // Refresh Token은 httpOnly 쿠키로 설정
    response.cookies.set('admin_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7일
    });
    
    return response;
    
  } catch (error) {
    console.error('Admin 로그인 오류:', error);
    return NextResponse.json(
      { error: '로그인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}