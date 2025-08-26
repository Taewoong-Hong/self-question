import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 보호된 API 경로 패턴
const protectedApi = [
  /^\/api\/surveys\/[^/]+\/export$/,
  /^\/api\/debates\/[^/]+\/export$/,
  /^\/api\/admin(\/|$)/,
];

export const config = { 
  matcher: [
    '/admin/:path*',
    '/api/:path*'
  ] 
};

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  
  // 관리자 페이지 처리
  if (pathname.startsWith('/admin')) {
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
  }
  
  // API 경로 처리
  if (pathname.startsWith('/api')) {
    // 보호된 API인지 확인
    const isProtected = protectedApi.some((re) => re.test(pathname));
    
    if (isProtected) {
      // 디버깅 로그
      const sid = req.cookies.get('admin_token')?.value;
      console.log('[MW] path=', pathname, 'admin_token?', !!sid);
      
      // 개별 콘텐츠 작성자 토큰도 확인 (export 라우트)
      if (pathname.includes('/export')) {
        // survey_author_[id] 또는 debate_author_[id] 형태의 쿠키 확인
        const cookies = req.cookies.getAll();
        const hasAuthorCookie = cookies.some(cookie => 
          cookie.name.startsWith('survey_author_') || 
          cookie.name.startsWith('debate_author_')
        );
        
        if (hasAuthorCookie || sid) {
          return NextResponse.next();
        }
      } else if (sid) {
        // 일반 관리자 API는 admin_token만 있으면 통과
        return NextResponse.next();
      }
      
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
  }
  
  return NextResponse.next();
}