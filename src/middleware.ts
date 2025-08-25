import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = { 
  matcher: ['/admin/:path*'] 
};

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  
  // /admin 로그인 페이지는 제외
  if (pathname === '/admin' || pathname === '/admin/') {
    return NextResponse.next();
  }
  
  // 토큰 확인
  const token = req.cookies.get('admin_token')?.value;
  
  if (!token) {
    // 토큰이 없으면 로그인 페이지로 리다이렉트
    return NextResponse.redirect(new URL('/admin', req.url));
  }
  
  return NextResponse.next();
}