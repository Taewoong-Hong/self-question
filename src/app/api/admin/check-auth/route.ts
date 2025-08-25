import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/adminAuthUtils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 관리자 인증 상태 확인
export async function GET(request: NextRequest) {
  try {
    // Admin 인증 확인 (헤더 또는 쿠키에서)
    const adminUser = await verifyAdminAuth(request);
    
    if (!adminUser) {
      return NextResponse.json({
        authenticated: false,
        user: null
      });
    }
    
    return NextResponse.json({
      authenticated: true,
      user: {
        username: adminUser.username,
        role: adminUser.role,
        isAdmin: adminUser.isAdmin
      }
    });
    
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({
      authenticated: false,
      user: null
    });
  }
}