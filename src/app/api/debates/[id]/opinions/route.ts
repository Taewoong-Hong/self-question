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
    }).select('opinions settings.allow_opinion');
    
    if (!debate) {
      return NextResponse.json(
        { error: '투표를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    if (!debate.settings?.allow_opinion) {
      return NextResponse.json({ opinions: [] });
    }
    
    // 의견 목록 정렬 및 반환
    const opinions = debate.opinions || [];
    const sortedOpinions = opinions
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((opinion: any) => ({
        id: opinion._id,
        content: opinion.content,
        author_nickname: opinion.author_name || '익명',
        created_at: opinion.created_at
      }));
    
    return NextResponse.json({
      opinions: sortedOpinions,
      total: sortedOpinions.length,
      last_updated: new Date()
    });
    
  } catch (error: any) {
    console.error('Debate opinions error:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}