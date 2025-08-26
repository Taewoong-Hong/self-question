import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Debate from '@/models/Debate';

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
    }).select('stats vote_options voter_ips public_results');
    
    if (!debate) {
      return NextResponse.json(
        { error: '투표를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // IP 체크 (중복 투표 확인)
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    // Hash the IP for privacy
    const crypto = require('crypto');
    const ipHash = crypto
      .createHash('sha256')
      .update(clientIp + (process.env.IP_SALT || 'default-salt'))
      .digest('hex');
    
    const hasVoted = debate.voter_ips.some((voterRecord: any) => voterRecord.ip_hash === ipHash);
    
    // 디버깅을 위한 로그
    console.log('Stats API debug:', {
      debateId: params.id,
      clientIp,
      ipHash,
      hasVoted,
      voter_ips_count: debate.voter_ips.length,
      public_results: (debate as any).public_results
    });
    
    // 결과 공개 여부 확인 - 작성자만 결과를 볼 수 있거나, public_results가 true이거나, 투표한 경우
    const canViewResults = (debate as any).public_results || hasVoted;
    
    if (canViewResults) {
      // Get vote counts from vote_options
      const optionStats = debate.vote_options.map((option: any) => ({
        option_id: option.id,
        label: option.label,
        count: option.vote_count || 0
      }));
      
      return NextResponse.json({
        option_stats: optionStats,
        total_votes: debate.stats.total_votes || 0,
        has_voted: hasVoted
      });
    } else {
      // 결과 비공개일 때는 통계만 제공
      return NextResponse.json({
        option_stats: [],
        total_votes: debate.stats.total_votes || 0,
        has_voted: hasVoted
      });
    }
    
  } catch (error: any) {
    console.error('Debate stats error:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}