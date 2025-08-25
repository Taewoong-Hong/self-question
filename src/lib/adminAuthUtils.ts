import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/jwt';

export const runtime = 'nodejs';

export async function getAdminToken(request: NextRequest | Request): Promise<string | null> {
  // 1. First check authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // 2. Then check cookies using next/headers
  try {
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('admin_token');
    if (cookieToken) {
      return cookieToken.value;
    }
  } catch (error) {
    // Fallback for non-Next.js context
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

export async function verifyAdminAuth(request: NextRequest | Request): Promise<any | null> {
  const token = await getAdminToken(request);
  
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