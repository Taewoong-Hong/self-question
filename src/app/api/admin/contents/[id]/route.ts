import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Debate from '@/lib/models/Debate';
import Survey from '@/lib/models/Survey';
import Question from '@/lib/models/Question';
import { verifyAdminToken } from '@/lib/middleware/adminAuth';

// 콘텐츠 수정 (숨기기/공개)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin 인증 확인
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: '인증 토큰이 없습니다.' },
        { status: 401 }
      );
    }
    
    const adminPayload = verifyAdminToken(token);
    
    if (!adminPayload || !adminPayload.isAdmin) {
      return NextResponse.json(
        { error: '관리자 권한이 없습니다.' },
        { status: 403 }
      );
    }
    
    await dbConnect();
    
    const { id } = params;
    const body = await request.json();
    const { action } = body;
    
    if (!['hide', 'show'].includes(action)) {
      return NextResponse.json(
        { error: '잘못된 작업입니다.' },
        { status: 400 }
      );
    }
    
    // 투표 확인
    let content = await Debate.findById(id);
    if (content) {
      content.is_hidden = action === 'hide';
      await content.save();
      return NextResponse.json({ success: true });
    }
    
    // 설문 확인
    content = await Survey.findById(id);
    if (content) {
      content.is_hidden = action === 'hide';
      await content.save();
      return NextResponse.json({ success: true });
    }
    
    // 질문 확인
    const question = await Question.findById(id);
    if (question) {
      question.isDeleted = action === 'hide';
      await question.save();
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json(
      { error: '콘텐츠를 찾을 수 없습니다.' },
      { status: 404 }
    );
    
  } catch (error) {
    console.error('콘텐츠 수정 오류:', error);
    return NextResponse.json(
      { error: '콘텐츠 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 콘텐츠 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin 인증 확인
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: '인증 토큰이 없습니다.' },
        { status: 401 }
      );
    }
    
    const adminPayload = verifyAdminToken(token);
    
    if (!adminPayload || !adminPayload.isAdmin) {
      return NextResponse.json(
        { error: '관리자 권한이 없습니다.' },
        { status: 403 }
      );
    }
    
    await dbConnect();
    
    const { id } = params;
    
    // 투표 확인
    let content = await Debate.findById(id);
    if (content) {
      await content.deleteOne();
      return NextResponse.json({ success: true });
    }
    
    // 설문 확인
    content = await Survey.findById(id);
    if (content) {
      await content.deleteOne();
      return NextResponse.json({ success: true });
    }
    
    // 질문 확인
    const question = await Question.findById(id);
    if (question) {
      question.isDeleted = true;
      await question.save();
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json(
      { error: '콘텐츠를 찾을 수 없습니다.' },
      { status: 404 }
    );
    
  } catch (error) {
    console.error('콘텐츠 삭제 오류:', error);
    return NextResponse.json(
      { error: '콘텐츠 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}