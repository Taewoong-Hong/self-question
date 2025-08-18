import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Debate from '@/models/Debate';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    // Get admin token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }
    
    const adminToken = authHeader.substring(7);
    
    // Verify admin token
    try {
      const decoded = jwt.verify(adminToken, process.env.JWT_SECRET || 'your-secret-key') as any;
      
      if (decoded.debateId !== params.id || decoded.type !== 'debate_admin') {
        return NextResponse.json(
          { error: '권한이 없습니다' },
          { status: 403 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      );
    }
    
    // Get request body
    const body = await request.json();
    const { status } = body;
    
    if (!status || !['active', 'ended', 'scheduled'].includes(status)) {
      return NextResponse.json(
        { error: '유효하지 않은 상태값입니다' },
        { status: 400 }
      );
    }
    
    // Find and update debate
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
    
    // Update status
    debate.status = status;
    
    // If ending the debate, set end_at to now
    if (status === 'ended' && (!debate.end_at || debate.end_at > new Date())) {
      debate.end_at = new Date();
    }
    
    // If activating the debate, ensure start_at is not in the future
    if (status === 'active' && debate.start_at > new Date()) {
      debate.start_at = new Date();
    }
    
    await debate.save();
    
    return NextResponse.json({
      message: '투표 상태가 변경되었습니다',
      status: debate.status,
      debate: {
        id: debate.id,
        title: debate.title,
        status: debate.status,
        start_at: debate.start_at,
        end_at: debate.end_at
      }
    });
    
  } catch (error: any) {
    console.error('Status update error:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}