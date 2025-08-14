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
    if (!body.option_ids || !Array.isArray(body.option_ids) || body.option_ids.length === 0) {
      return NextResponse.json(
        { error: '투표 옵션을 선택해주세요' },
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
    
    // Check if can vote
    if (!debate.canVote(ipHash)) {
      return NextResponse.json(
        { error: '이미 투표하셨거나 투표할 수 없는 상태입니다' },
        { status: 403 }
      );
    }
    
    // Cast vote
    try {
      await debate.castVote(body.option_ids, ipHash, {
        user_id: body.user_id,
        nickname: body.nickname,
        is_anonymous: body.is_anonymous
      });
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    // Get results if allowed
    const results = debate.getResults();
    
    return NextResponse.json({
      message: '투표가 완료되었습니다',
      results
    });
    
  } catch (error: any) {
    console.error('Vote error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}