import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, generateAdminTokens } from '@/lib/middleware/adminAuth';

export const runtime = 'nodejs';

// 토큰 갱신 API - Refresh Token으로 새로운 Access Token 발급
export async function POST(request: NextRequest) {
  try {
    // Refresh Token은 쿠키에서만 가져옴
    const refreshToken = request.cookies.get('admin_refresh_token')?.value;
    
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh 토큰이 없습니다.' },
        { status: 401 }
      );
    }
    
    // Refresh Token 검증
    const decoded = verifyAdminToken(refreshToken);
    
    if (!decoded || decoded.type !== 'refresh') {
      return NextResponse.json(
        { error: '유효하지 않은 Refresh 토큰입니다.' },
        { status: 401 }
      );
    }
    
    // 새로운 토큰 쌍 생성 (RT 회전)
    const { accessToken, refreshToken: newRefreshToken } = generateAdminTokens();
    
    const response = NextResponse.json({
      success: true,
      token: accessToken,
      accessToken,
      username: decoded.username
    });
    
    // 새로운 Refresh Token으로 교체 (회전)
    response.cookies.set('admin_refresh_token', newRefreshToken, {
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