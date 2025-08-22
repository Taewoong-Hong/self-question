import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123!@#';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AdminTokenPayload {
  isAdmin: boolean;
  username: string;
}

export function generateAdminToken(): string {
  const payload: AdminTokenPayload = {
    isAdmin: true,
    username: ADMIN_USERNAME
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminTokenPayload;
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