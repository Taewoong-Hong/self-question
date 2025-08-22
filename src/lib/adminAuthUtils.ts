import { NextRequest } from 'next/server';
import { verifyJwt } from '@/lib/jwt';

export const runtime = 'nodejs';

export function getAdminToken(request: NextRequest | Request): string | null {
  // 1. First check authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // 2. Then check cookies (for NextRequest)
  if ('cookies' in request && request.cookies) {
    const cookieToken = request.cookies.get('admin_token');
    if (cookieToken) {
      return cookieToken.value;
    }
  }
  
  // 3. For regular Request, parse cookie header manually
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split('; ').reduce((acc, cookie) => {
      const [key, value] = cookie.split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    if (cookies.admin_token) {
      return cookies.admin_token;
    }
  }
  
  return null;
}

export function verifyAdminAuth(request: NextRequest | Request): any | null {
  const token = getAdminToken(request);
  
  if (!token) {
    return null;
  }
  
  try {
    const decoded = verifyJwt(token);
    if (decoded && decoded.isAdmin) {
      return decoded;
    }
    return null;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}