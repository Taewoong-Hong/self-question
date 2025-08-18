// 간단한 관리자 인증 헬퍼
export function checkAdminAuth(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const token = authHeader.substring(7);
  
  try {
    // 간단한 토큰 검증 (실제로는 JWT 검증해야 함)
    const decoded = JSON.parse(atob(token));
    return decoded.username === 'admin' && decoded.role === 'super_admin';
  } catch {
    return false;
  }
}