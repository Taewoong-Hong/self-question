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
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Hash the IP for privacy
    const crypto = require('crypto');
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
    
    const hasVoted = debate.voter_ips.some((voterRecord: any) => voterRecord.ip_hash === ipHash);
    
    // 결과 공개 여부 확인 - 작성자만 결과를 볼 수 있거나, public_results가 true이거나, 투표한 경우
    const canViewResults = (debate as any).public_results || hasVoted;
    
    if (canViewResults) {
      // Get vote counts from vote_options
      const voteStats = debate.vote_options.map((option: any) => ({
        id: option.id,
        label: option.label,
        vote_count: option.vote_count || 0,
        percentage: option.percentage || 0
      }));
      
      // 찬성/반대 투표 수 계산 (첫 번째가 찬성, 두 번째가 반대)
      const agreeOption = debate.vote_options.find((opt: any) => opt.label === '찬성') || debate.vote_options[0];
      const disagreeOption = debate.vote_options.find((opt: any) => opt.label === '반대') || debate.vote_options[1];
      
      return NextResponse.json({
        vote_options: voteStats,
        agree_count: agreeOption?.vote_count || 0,
        disagree_count: disagreeOption?.vote_count || 0,
        total_votes: debate.stats.total_votes || 0,
        unique_voters: debate.stats.unique_voters || 0,
        has_voted: hasVoted,
        last_updated: new Date()
      });
    } else {
      // 결과 비공개일 때는 통계만 제공
      return NextResponse.json({
        total_votes: debate.stats.total_votes || 0,
        unique_voters: debate.stats.unique_voters || 0,
        has_voted: hasVoted,
        agree_count: 0,
        disagree_count: 0,
        last_updated: new Date()
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