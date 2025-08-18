import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Admin from '@/models/Admin';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

// 관리자 로그인
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { username, password } = body;
    
    if (!username || !password) {
      return NextResponse.json(
        { error: '아이디와 비밀번호를 입력해주세요' },
        { status: 400 }
      );
    }
    
    // 관리자 찾기
    const admin = await Admin.findOne({ 
      username,
      is_active: true 
    });
    
    if (!admin) {
      return NextResponse.json(
        { error: '아이디 또는 비밀번호가 일치하지 않습니다' },
        { status: 401 }
      );
    }
    
    // 비밀번호 확인
    const isValid = await admin.validatePassword(password);
    
    if (!isValid) {
      return NextResponse.json(
        { error: '아이디 또는 비밀번호가 일치하지 않습니다' },
        { status: 401 }
      );
    }
    
    // 마지막 로그인 시간 업데이트
    admin.last_login = new Date();
    await admin.save();
    
    // 토큰 생성
    const token = admin.generateAuthToken();
    
    return NextResponse.json({
      message: '로그인 성공',
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });
    
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// 관리자 생성 (초기 설정용 - 개발 환경에서만)
export async function PUT(request: NextRequest) {
  try {
    // 개발 환경에서만 허용
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: '권한이 없습니다' },
        { status: 403 }
      );
    }
    
    await connectDB();
    
    const body = await request.json();
    const { username, password, email } = body;
    
    if (!username || !password || !email) {
      return NextResponse.json(
        { error: '모든 필드를 입력해주세요' },
        { status: 400 }
      );
    }
    
    // 기존 관리자 확인
    const existingAdmin = await Admin.findOne({
      $or: [{ username }, { email }]
    });
    
    if (existingAdmin) {
      return NextResponse.json(
        { error: '이미 존재하는 관리자입니다' },
        { status: 409 }
      );
    }
    
    // 관리자 생성
    const admin = new Admin({
      username,
      password_hash: password, // pre-save hook에서 해싱됨
      email,
      role: 'super_admin'
    });
    
    await admin.save();
    
    return NextResponse.json({
      message: '관리자가 생성되었습니다',
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });
    
  } catch (error: any) {
    console.error('Admin creation error:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}