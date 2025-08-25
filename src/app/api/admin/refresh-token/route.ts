import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, generateAdminToken } from '@/lib/middleware/adminAuth';

export const runtime = 'nodejs';

// 토큰 갱신 API
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: '인증 토큰이 없습니다.' },
        { status: 401 }
      );
    }
    
    // 현재 토큰 검증
    const decoded = verifyAdminToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      );
    }
    
    // 새로운 토큰 생성
    const newToken = generateAdminToken();
    
    const response = NextResponse.json({
      success: true,
      token: newToken,
      username: decoded.username
    });
    
    // 쿠키에 새 토큰 설정
    response.cookies.set('admin_token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7일
    });
    
    return response;
    
  } catch (error) {
    console.error('토큰 갱신 오류:', error);
    return NextResponse.json(
      { error: '토큰 갱신 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}