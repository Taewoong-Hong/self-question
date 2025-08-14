import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Debate from '@/models/Debate';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const ipHash = require('crypto')
      .createHash('sha256')
      .update(clientIp + (process.env.IP_SALT || 'default-salt'))
      .digest('hex');
    
    // Validate required fields
    if (!body.title || !body.admin_password || !body.vote_options || body.vote_options.length < 2) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다' },
        { status: 400 }
      );
    }
    
    if (!body.start_at || !body.end_at) {
      return NextResponse.json(
        { error: '시작일과 종료일을 입력해주세요' },
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
    
    // Create debate
    const debate = new Debate({
      title: body.title,
      description: body.description,
      category: body.category || 'general',
      tags: body.tags,
      author_nickname: body.author_nickname || '익명',
      author_ip_hash: ipHash,
      admin_password_hash: body.admin_password,
      vote_options: body.vote_options.map((opt: any, index: number) => ({
        label: opt.label,
        order: index
      })),
      settings: body.settings || {},
      start_at: new Date(body.start_at),
      end_at: new Date(body.end_at)
    });
    
    // Update status
    debate.updateStatus();
    
    // Generate URLs
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
    debate.public_url = `${baseUrl}/debates/${debate.id}`;
    debate.admin_url = `${baseUrl}/debates/${debate.id}/admin`;
    
    await debate.save();
    
    // Generate admin token
    const adminToken = debate.generateAdminToken();
    
    return NextResponse.json({
      id: debate.id,
      public_url: debate.public_url,
      admin_url: debate.admin_url,
      admin_token: adminToken
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Debate creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}