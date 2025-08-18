import jwt from 'jsonwebtoken';

// JWT_SECRET 환경 변수가 없을 때 사용할 기본값
// 프로덕션에서는 반드시 환경 변수로 설정해야 함
const DEFAULT_JWT_SECRET = 'selfquestion-jwt-secret-key-2025';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
  
  // 프로덕션에서 기본 비밀키 사용 시 경고
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    console.warn('⚠️  WARNING: JWT_SECRET is not set in production environment!');
  }
  
  return secret;
}

export function signJwt(payload: any, expiresIn: string = '24h'): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn } as jwt.SignOptions);
}

export function verifyJwt(token: string): any {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (error) {
    console.error('JWT Verification Failed:', {
      error: error instanceof Error ? error.message : String(error),
      hasSecret: !!process.env.JWT_SECRET,
      secretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
      defaultUsed: !process.env.JWT_SECRET
    });
    throw error;
  }
}