import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

// Extract client IP
export function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0];
  }
  
  if (typeof realIp === 'string') {
    return realIp;
  }
  
  return req.socket.remoteAddress || '';
}

// Hash IP for privacy
export function hashIp(ip: string): string {
  return crypto
    .createHash('sha256')
    .update(ip + (process.env.IP_SALT || 'default-salt'))
    .digest('hex');
}

// Error handler wrapper
export function withErrorHandler(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (error: any) {
      console.error('API Error:', error);
      
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Internal Server Error';
      
      res.status(statusCode).json({
        error: {
          message,
          ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        }
      });
    }
  };
}

// Method validation
export function validateMethod(
  methods: string[],
  req: NextApiRequest,
  res: NextApiResponse
): boolean {
  if (!methods.includes(req.method || '')) {
    res.status(405).json({ error: 'Method not allowed' });
    return false;
  }
  return true;
}

// Rate limiting in-memory store (for development)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  max: number = 100
) {
  return (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    const ip = getClientIp(req);
    const now = Date.now();
    
    const record = rateLimitStore.get(ip);
    
    if (!record || now > record.resetTime) {
      rateLimitStore.set(ip, {
        count: 1,
        resetTime: now + windowMs
      });
      next();
      return;
    }
    
    if (record.count >= max) {
      res.status(429).json({
        error: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.'
      });
      return;
    }
    
    record.count++;
    next();
  };
}