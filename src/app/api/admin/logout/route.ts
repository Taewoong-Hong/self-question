import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 슈퍼 관리자 로그아웃
export async function POST(request: NextRequest) {
  try {
    // Create response with cleared cookie
    const response = NextResponse.json({
      message: '로그아웃 성공',
      success: true
    });
    
    // Clear HTTP-only cookie
    response.cookies.set('admin_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Expire immediately
      path: '/'
    });
    
    return response;
    
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: '로그아웃 처리 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}