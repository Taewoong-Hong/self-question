import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Debate from '@/lib/models/Debate';
import Survey from '@/lib/models/Survey';
import Question from '@/lib/models/Question';
import { verifyAdminAuth } from '@/lib/adminAuthUtils';
import mongoose from 'mongoose';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 콘텐츠 수정 (숨기기/공개)
export async function PUT(
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
    
    // ID 형식 확인 (16자리 hex string)
    if (!/^[a-f0-9]{16}$/i.test(id)) {
      console.error('Invalid ID format:', id);
      return NextResponse.json(
        { error: '잘못된 ID 형식입니다.' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { action } = body;
    
    if (!['hide', 'show'].includes(action)) {
      return NextResponse.json(
        { error: '잘못된 작업입니다.' },
        { status: 400 }
      );
    }
    
    // 투표 확인
    let content = await Debate.findOne({ id });
    if (content) {
      content.is_hidden = action === 'hide';
      await content.save();
      console.log(`Debate ${id} ${action}d successfully`);
      return NextResponse.json({ success: true, type: 'debate', id: content.id });
    }
    
    // 설문 확인
    content = await Survey.findOne({ id });
    if (content) {
      content.is_hidden = action === 'hide';
      await content.save();
      console.log(`Survey ${id} ${action}d successfully`);
      return NextResponse.json({ success: true, type: 'survey', id: content.id });
    }
    
    // 질문 확인
    const question = await Question.findOne({ id });
    if (question) {
      question.isDeleted = action === 'hide';
      await question.save();
      console.log(`Question ${id} ${action}d successfully`);
      return NextResponse.json({ success: true, type: 'question', id: question.id });
    }
    
    return NextResponse.json(
      { error: '콘텐츠를 찾을 수 없습니다.' },
      { status: 404 }
    );
    
  } catch (error) {
    console.error('콘텐츠 수정 오류:', error);
    return NextResponse.json(
      { 
        error: '콘텐츠 수정 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
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
    
    // ID 형식 확인 (16자리 hex string)
    if (!/^[a-f0-9]{16}$/i.test(id)) {
      console.error('Invalid ID format:', id);
      return NextResponse.json(
        { error: '잘못된 ID 형식입니다.' },
        { status: 400 }
      );
    }
    
    // 투표 확인
    let content = await Debate.findOne({ id });
    if (content) {
      await content.deleteOne();
      return NextResponse.json({ success: true });
    }
    
    // 설문 확인
    content = await Survey.findOne({ id });
    if (content) {
      await content.deleteOne();
      return NextResponse.json({ success: true });
    }
    
    // 질문 확인
    const question = await Question.findOne({ id });
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
      { 
        error: '콘텐츠 삭제 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}