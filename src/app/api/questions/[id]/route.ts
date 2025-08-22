import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Question from '@/lib/models/Question';

// 질문 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const { id } = params;
    
    // 질문 조회 및 조회수 증가
    const question = await Question.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true }
    ).select('-password -ipAddress');
    
    if (!question || question.isDeleted) {
      return NextResponse.json(
        { error: '존재하지 않는 질문입니다.' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      question
    });
    
  } catch (error) {
    console.error('질문 조회 오류:', error);
    return NextResponse.json(
      { error: '질문 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 질문 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const { id } = params;
    const body = await request.json();
    const { password, title, content, category, tags } = body;
    
    if (!password) {
      return NextResponse.json(
        { error: '비밀번호를 입력해주세요.' },
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
    
    // 답변이 달린 질문은 수정 불가
    if (question.status === 'answered') {
      return NextResponse.json(
        { error: '답변이 달린 질문은 수정할 수 없습니다.' },
        { status: 400 }
      );
    }
    
    // 비밀번호 확인
    const isPasswordValid = await question.comparePassword(password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: '비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }
    
    // 질문 수정
    if (title) question.title = title.trim();
    if (content) question.content = content.trim();
    if (category !== undefined) question.category = category;
    if (tags !== undefined) question.tags = tags;
    
    await question.save();
    
    // 비밀번호 제외하고 반환
    const responseQuestion = question.toObject();
    delete responseQuestion.password;
    delete responseQuestion.ipAddress;
    
    return NextResponse.json({
      success: true,
      question: responseQuestion
    });
    
  } catch (error) {
    console.error('질문 수정 오류:', error);
    return NextResponse.json(
      { error: '질문 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 질문 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const { id } = params;
    const body = await request.json();
    const { password } = body;
    
    if (!password) {
      return NextResponse.json(
        { error: '비밀번호를 입력해주세요.' },
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
    
    // 비밀번호 확인
    const isPasswordValid = await question.comparePassword(password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: '비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }
    
    // Soft delete
    question.isDeleted = true;
    await question.save();
    
    return NextResponse.json({
      success: true,
      message: '질문이 삭제되었습니다.'
    });
    
  } catch (error) {
    console.error('질문 삭제 오류:', error);
    return NextResponse.json(
      { error: '질문 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}