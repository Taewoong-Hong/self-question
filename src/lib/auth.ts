import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function verifyAdminToken(request: NextRequest): Promise<boolean> {
  try {
    const token = request.cookies.get('adminToken')?.value;
    
    if (!token) {
      return false;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // 토큰이 유효하고 관리자 권한이 있는지 확인
    if (decoded && decoded.username && decoded.isAdmin) {
      return true;
    }
    
    return false;
  } catch (error) {
    return false;
  }
}