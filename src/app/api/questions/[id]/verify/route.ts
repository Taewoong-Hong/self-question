import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Question from '@/lib/models/Question';

// 질문 비밀번호 확인
export async function POST(
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
        { success: false,
          error: '비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: '비밀번호가 확인되었습니다.'
    });
    
  } catch (error) {
    console.error('비밀번호 확인 오류:', error);
    return NextResponse.json(
      { error: '비밀번호 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}