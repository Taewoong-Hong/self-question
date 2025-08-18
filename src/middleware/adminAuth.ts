import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export interface AdminAuthPayload {
  adminId: string;
  username: string;
  role: 'super_admin' | 'admin';
  type: 'admin_auth';
}

export async function verifyAdminAuth(request: NextRequest): Promise<AdminAuthPayload | null> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as AdminAuthPayload;
    
    if (decoded.type !== 'admin_auth') {
      return null;
    }
    
    return decoded;
  } catch (error) {
    return null;
  }
}

export function requireSuperAdmin(adminAuth: AdminAuthPayload | null): NextResponse | null {
  if (!adminAuth) {
    return NextResponse.json(
      { error: '인증이 필요합니다' },
      { status: 401 }
    );
  }
  
  if (adminAuth.role !== 'super_admin') {
    return NextResponse.json(
      { error: '슈퍼 관리자 권한이 필요합니다' },
      { status: 403 }
    );
  }
  
  return null;
}

export function requireAdmin(adminAuth: AdminAuthPayload | null): NextResponse | null {
  if (!adminAuth) {
    return NextResponse.json(
      { error: '인증이 필요합니다' },
      { status: 401 }
    );
  }
  
  return null;
}