// Next.js App Router (Node 런타임)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { verifyAdminToken } from '@/lib/middleware/adminAuth';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1] || null;
  
  let tokenVerification = {
    valid: false,
    decoded: null as any,
    error: null as string | null
  };
  
  if (token) {
    try {
      const decoded = verifyAdminToken(token);
      tokenVerification = {
        valid: !!decoded,
        decoded: decoded,
        error: null
      };
    } catch (error: any) {
      tokenVerification = {
        valid: false,
        decoded: null,
        error: error.message || 'Token verification failed'
      };
    }
  }
  
  return NextResponse.json({
    // 토큰 상태
    token: {
      exists: !!token,
      valid: tokenVerification.valid,
      decoded: tokenVerification.decoded,
      error: tokenVerification.error
    },
    
    // 관리자 권한 체크
    isAdmin: tokenVerification.valid && tokenVerification.decoded?.isAdmin,
    
    // 요청 헤더
    headers: {
      authorization: authHeader || 'not-present',
      contentType: request.headers.get('content-type') || 'not-present'
    },
    
    // API 경로 정보
    api: {
      path: '/api/debug/admin-check',
      method: request.method
    }
  });
}