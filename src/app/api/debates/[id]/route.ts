import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Debate from '@/models/Debate';
import crypto from 'crypto';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const debate = await Debate.findOne({ 
      id: params.id,
      is_deleted: false 
    }).select('-admin_password_hash -voter_ips.ip_hash');
    
    if (!debate) {
      return NextResponse.json(
        { error: '투표를 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    
    // Update status
    const oldStatus = debate.status;
    debate.updateStatus();
    
    // 상태 변경 확인을 위한 로그
    if (oldStatus !== debate.status) {
      console.log('Status changed by updateStatus:', {
        id: debate.id,
        oldStatus,
        newStatus: debate.status,
        start_at: debate.start_at,
        end_at: debate.end_at,
        now: new Date()
      });
    }
    
    // Increment view count
    debate.stats.view_count += 1;
    await debate.save();
    
    // Check if user has already voted
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    let hasVoted = false;
    if (clientIp && clientIp !== 'unknown') {
      const ipHash = crypto
        .createHash('sha256')
        .update(clientIp + (process.env.IP_SALT || 'default-salt'))
        .digest('hex');
      
      hasVoted = debate.voter_ips.some((voter: any) => voter.ip_hash === ipHash);
    }
    
    // Check if user can see results
    const showResults = debate.settings.show_results_before_end || debate.status === 'ended';
    
    const response: any = debate.toObject();
    response.has_voted = hasVoted;
    
    if (!showResults) {
      // Hide vote counts if results are not shown
      response.vote_options = response.vote_options.map((opt: any) => ({
        id: opt.id,
        label: opt.label,
        order: opt.order,
        votes: [],
        vote_count: 0,
        percentage: 0
      }));
      delete response.stats.total_votes;
      delete response.stats.unique_voters;
    }
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('Debate fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    // 쿠키에서 인증 토큰 확인
    const { cookies } = await import('next/headers');
    const cookieStore = cookies();
    
    // 작성자 쿠키 확인
    const authorCookie = cookieStore.get(`debate_author_${params.id}`);
    const adminCookie = cookieStore.get('admin_token');
    
    if (!authorCookie && !adminCookie) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }
    
    // 작성자 쿠키 검증
    if (authorCookie) {
      const jwt = require('jsonwebtoken');
      let decoded;
      try {
        decoded = jwt.verify(authorCookie.value, process.env.JWT_SECRET || 'your-secret-key');
      } catch (err) {
        return NextResponse.json(
          { error: '유효하지 않은 토큰입니다' },
          { status: 401 }
        );
      }
      
      if (decoded.debate_id !== params.id || decoded.type !== 'debate_author') {
        return NextResponse.json(
          { error: '권한이 없습니다' },
          { status: 403 }
        );
      }
    }
    
    const debate = await Debate.findOne({ id: params.id });
    
    if (!debate) {
      return NextResponse.json(
        { error: '투표를 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    
    // Soft delete
    debate.is_deleted = true;
    await debate.save();
    
    return NextResponse.json({
      message: '투표가 삭제되었습니다'
    });
    
  } catch (error: any) {
    console.error('Debate delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}