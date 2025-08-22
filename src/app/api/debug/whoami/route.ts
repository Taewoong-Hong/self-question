// Next.js App Router (Node 런타임)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // 헤더에서 Authorization 토큰 확인
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1] || null;
  
  // 쿠키 확인
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split('; ').map(c => {
      const [key, value] = c.split('=');
      return [key, value];
    })
  );
  
  // localStorage에서 저장된 admin_token 확인 (클라이언트에서 전달된 경우)
  const hasAdminToken = !!token;
  
  // 환경변수 확인
  const adminUsername = process.env.ADMIN_USERNAME || 'not-set';
  const adminPasswordSet = !!process.env.ADMIN_PASSWORD;
  const jwtSecretSet = !!process.env.JWT_SECRET;
  
  return NextResponse.json({
    // 요청 정보
    request: {
      hasAuthHeader: !!authHeader,
      hasToken: hasAdminToken,
      tokenPreview: token ? token.substring(0, 20) + '...' : null,
      cookies: Object.keys(cookies),
      hasCookies: Object.keys(cookies).length > 0
    },
    
    // 환경변수 상태
    environment: {
      adminUsername,
      adminPasswordSet,
      jwtSecretSet,
      nodeEnv: process.env.NODE_ENV
    },
    
    // 디버그 정보
    debug: {
      timestamp: new Date().toISOString(),
      headers: {
        authorization: authHeader || 'not-present',
        cookie: cookieHeader ? 'present' : 'not-present'
      }
    }
  });
}