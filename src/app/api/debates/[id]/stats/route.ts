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
    }).select('stats vote_options voter_ips');
    
    if (!debate) {
      return NextResponse.json(
        { error: '투표를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // IP 체크 (중복 투표 확인)
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Hash the IP for privacy
    const crypto = require('crypto');
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
    
    const hasVoted = debate.voter_ips.some((voterRecord: any) => voterRecord.ip_hash === ipHash);
    
    // Get vote counts from vote_options
    const voteStats = debate.vote_options.map((option: any) => ({
      id: option.id,
      label: option.label,
      vote_count: option.vote_count || 0,
      percentage: option.percentage || 0
    }));
    
    return NextResponse.json({
      vote_options: voteStats,
      total_votes: debate.stats.total_votes || 0,
      unique_voters: debate.stats.unique_voters || 0,
      has_voted: hasVoted,
      last_updated: new Date()
    });
    
  } catch (error: any) {
    console.error('Debate stats error:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}