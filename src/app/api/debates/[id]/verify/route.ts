import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Debate from '@/models/Debate';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const body = await request.json();
    
    if (!body.password) {
      return NextResponse.json(
        { error: '비밀번호를 입력해주세요' },
        { status: 400 }
      );
    }
    
    // ID 형식 검증 (16자리 hex)
    if (!/^[a-f0-9]{16}$/i.test(params.id)) {
      return NextResponse.json(
        { error: '잘못된 투표 ID 형식입니다' },
        { status: 400 }
      );
    }
    
    const debate = await Debate.findOne({ 
      id: params.id,
      is_deleted: false 
    });
    
    if (!debate) {
      return NextResponse.json(
        { error: '투표를 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    
    // Validate password
    const isValid = await debate.validatePassword(body.password);
    
    if (!isValid) {
      return NextResponse.json(
        { error: '비밀번호가 일치하지 않습니다' },
        { status: 401 }
      );
    }
    
    // Generate author token
    const authorToken = debate.generateAdminToken();  // TODO: 메소드 이름도 generateAuthorToken으로 변경 필요
    
    // 쿠키로 작성자 세션 설정
    const sessionData = {
      debate_id: params.id,
      type: 'debate_author',
      created_at: new Date()
    };
    
    const sessionToken = jwt.sign(sessionData, JWT_SECRET, {
      expiresIn: '30d'
    });
    
    // 쿠키 설정
    cookies().set(`debate_author_${params.id}`, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30 // 30일
    });
    
    return NextResponse.json({
      message: '인증에 성공했습니다',
      admin_token: authorToken // 하위 호환성을 위해 유지 (TODO: author_token으로 변경)
    });
    
  } catch (error: any) {
    console.error('Password verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}