import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Debate from '@/models/Debate';
import Survey from '@/models/Survey';
import { checkAdminAuth } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// 개별 콘텐츠 숨기기/보이기 토글
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json(
      { error: '인증이 필요합니다' },
      { status: 401 }
    );
  }

  try {
    await connectDB();
    
    const { id } = params;
    const body = await request.json();
    const { action } = body;
    
    if (!['hide', 'show'].includes(action)) {
      return NextResponse.json(
        { error: '유효하지 않은 액션입니다' },
        { status: 400 }
      );
    }
    
    // 먼저 투표에서 찾기
    let content = await Debate.findOne({ id });
    let type = 'debate';
    
    // 투표에 없으면 설문에서 찾기
    if (!content) {
      content = await Survey.findOne({ id });
      type = 'survey';
    }
    
    if (!content) {
      return NextResponse.json(
        { error: '콘텐츠를 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    
    // 숨김 상태 토글
    content.is_hidden = action === 'hide';
    await content.save();
    
    return NextResponse.json({
      message: `${type === 'debate' ? '투표' : '설문'}가 ${action === 'hide' ? '숨김' : '공개'} 처리되었습니다`,
      content: {
        id: content.id,
        title: content.title,
        type,
        is_hidden: content.is_hidden
      }
    });
    
  } catch (error: any) {
    console.error('Admin content update error:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// 개별 콘텐츠 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json(
      { error: '인증이 필요합니다' },
      { status: 401 }
    );
  }

  try {
    await connectDB();
    
    const { id } = params;
    
    // 먼저 투표에서 찾기
    let content = await Debate.findOne({ id });
    let type = 'debate';
    
    // 투표에 없으면 설문에서 찾기
    if (!content) {
      content = await Survey.findOne({ id });
      type = 'survey';
    }
    
    if (!content) {
      return NextResponse.json(
        { error: '콘텐츠를 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    
    // 소프트 삭제
    content.is_deleted = true;
    await content.save();
    
    return NextResponse.json({
      message: `${type === 'debate' ? '투표' : '설문'}가 삭제되었습니다`,
      content: {
        id: content.id,
        title: content.title,
        type
      }
    });
    
  } catch (error: any) {
    console.error('Admin content delete error:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}