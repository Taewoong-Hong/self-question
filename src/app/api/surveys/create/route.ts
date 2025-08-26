import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Survey from '@/models/Survey';
export const dynamic = 'force-dynamic';
import { getClientIp, hashIp, rateLimit } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    // Validate required fields
    if (!body.title || !body.admin_password || !body.questions || body.questions.length === 0) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다' },
        { status: 400 }
      );
    }
    
    // Validate password length
    if (body.admin_password.length < 8) {
      return NextResponse.json(
        { error: '비밀번호는 8자 이상이어야 합니다' },
        { status: 400 }
      );
    }
    
    // Create survey
    const survey = new Survey({
      title: body.title,
      description: body.description,
      tags: body.tags,
      author_nickname: body.author_nickname,
      admin_password_hash: body.admin_password,
      questions: body.questions.map((q: any, index: number) => ({
        ...q,
        order: index
      })),
      welcome_screen: body.welcome_screen,
      thankyou_screen: body.thankyou_screen,
      settings: body.settings,
      creator_ip: clientIp,
      public_results: body.public_results || false  // 결과 공개 여부 (기본값: 비공개)
    });
    
    // Generate URLs
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
    survey.public_url = `${baseUrl}/surveys/${survey.id}`;
    survey.admin_url = `${baseUrl}/surveys/${survey.id}/admin`;
    
    await survey.save();
    
    // Generate admin token
    const adminToken = survey.generateAdminToken();
    await survey.save();
    
    return NextResponse.json({
      id: survey.id,
      public_url: survey.public_url,
      admin_url: survey.admin_url,
      admin_token: adminToken
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Survey creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}