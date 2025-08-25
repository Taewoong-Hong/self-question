import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Question from '@/lib/models/Question';
import { verifyAdminAuth } from '@/lib/adminAuthUtils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Admin 답변 작성/수정
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin 인증 확인 (헤더 또는 쿠키에서)
    const adminUser = await verifyAdminAuth(request);
    
    if (!adminUser) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }
    
    if (!adminUser.isAdmin) {
      return NextResponse.json(
        { error: '관리자 권한이 없습니다.' },
        { status: 403 }
      );
    }
    
    await dbConnect();
    
    const { id } = params;
    const body = await request.json();
    const { content } = body;
    
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: '답변 내용을 입력해주세요.' },
        { status: 400 }
      );
    }
    
    // 질문 찾기
    const question = await Question.findById(id);
    
    if (!question || question.isDeleted) {
      return NextResponse.json(
        { error: '존재하지 않는 질문입니다.' },
        { status: 404 }
      );
    }
    
    // 답변 작성/수정
    question.adminAnswer = {
      content: content.trim(),
      answeredAt: new Date(),
      answeredBy: adminUser.username
    };
    question.status = 'answered';
    
    await question.save();
    
    return NextResponse.json({
      success: true,
      question
    });
    
  } catch (error) {
    console.error('Admin 답변 작성 오류:', error);
    return NextResponse.json(
      { error: '답변 작성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// Admin 답변 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin 인증 확인 (헤더 또는 쿠키에서)
    const adminUser = await verifyAdminAuth(request);
    
    if (!adminUser) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }
    
    if (!adminUser.isAdmin) {
      return NextResponse.json(
        { error: '관리자 권한이 없습니다.' },
        { status: 403 }
      );
    }
    
    await dbConnect();
    
    const { id } = params;
    
    // 질문 찾기
    const question = await Question.findById(id);
    
    if (!question || question.isDeleted) {
      return NextResponse.json(
        { error: '존재하지 않는 질문입니다.' },
        { status: 404 }
      );
    }
    
    // 답변 삭제
    question.adminAnswer = undefined;
    question.status = 'pending';
    
    await question.save();
    
    return NextResponse.json({
      success: true,
      message: '답변이 삭제되었습니다.'
    });
    
  } catch (error) {
    console.error('Admin 답변 삭제 오류:', error);
    return NextResponse.json(
      { error: '답변 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}