import { NextApiRequest, NextApiResponse } from 'next';
import { signJwt, verifyJwt } from '../jwt';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123!@#';

export interface AdminTokenPayload {
  isAdmin: boolean;
  username: string;
}

export function generateAdminToken(): string {
  const payload: AdminTokenPayload = {
    isAdmin: true,
    username: ADMIN_USERNAME
  };
  
  return signJwt(payload, '7d'); // 7일로 연장
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    return verifyJwt(token) as AdminTokenPayload;
  } catch (error) {
    return null;
  }
}

export function validateAdminCredentials(username: string, password: string): boolean {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

export function withAdminAuth(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: '인증 토큰이 없습니다.' });
    }
    
    const payload = verifyAdminToken(token);
    
    if (!payload || !payload.isAdmin) {
      return res.status(403).json({ error: '관리자 권한이 없습니다.' });
    }
    
    // req 객체에 admin 정보 추가
    (req as any).admin = payload;
    
    return handler(req, res);
  };
}