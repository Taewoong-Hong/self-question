import { NextRequest } from 'next/server';
import { verifyJwt } from './jwt';

export async function verifyAdminToken(request: NextRequest): Promise<boolean> {
  try {
    const token = request.cookies.get('admin_token')?.value;
    
    console.log('Admin token verification - Token exists:', !!token);
    
    if (!token) {
      console.log('Admin token verification - No token found in cookies');
      return false;
    }

    const decoded = verifyJwt(token) as any;
    
    console.log('Admin token verification - Decoded:', { 
      username: decoded?.username, 
      isAdmin: decoded?.isAdmin,
      exp: decoded?.exp,
      iat: decoded?.iat
    });
    
    // 토큰이 유효하고 관리자 권한이 있는지 확인
    if (decoded && decoded.username && decoded.isAdmin) {
      return true;
    }
    
    console.log('Admin token verification - Invalid token structure');
    return false;
  } catch (error) {
    console.error('Admin token verification - Error:', error);
    return false;
  }
}