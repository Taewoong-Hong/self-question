import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Debate from '@/models/Debate';
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const body = await request.json();
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const ipHash = crypto
      .createHash('sha256')
      .update(clientIp + (process.env.IP_SALT || 'default-salt'))
      .digest('hex');
    
    // Validate request
    if (!body.content || !body.author_nickname) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다' },
        { status: 400 }
      );
    }
    
    if (body.content.length > 1000) {
      return NextResponse.json(
        { error: '의견은 1000자를 초과할 수 없습니다' },
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
    
    // Add opinion
    try {
      await debate.addOpinion({
        author_nickname: body.author_nickname,
        selected_option_id: body.selected_option_id,
        content: body.content,
        is_anonymous: body.is_anonymous
      }, ipHash);
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      message: '의견이 등록되었습니다'
    });
    
  } catch (error: any) {
    console.error('Opinion error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}