import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Question from '@/lib/models/Question';

// 질문 생성
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { title, content, nickname, password, category, tags } = body;
    
    // 필수 필드 검증
    if (!title || !content || !nickname || !password) {
      return NextResponse.json(
        { error: '필수 정보를 모두 입력해주세요.' },
        { status: 400 }
      );
    }
    
    // 비밀번호 길이 검증
    if (password.length < 6) {
      return NextResponse.json(
        { error: '비밀번호는 최소 6자 이상이어야 합니다.' },
        { status: 400 }
      );
    }
    
    // IP 주소 추출
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    // 질문 생성
    const question = new Question({
      title: title.trim(),
      content: content.trim(),
      nickname: nickname.trim(),
      password,
      category,
      tags: tags || [],
      ipAddress
    });
    
    await question.save();
    
    // 비밀번호 제외하고 반환
    const responseQuestion = question.toObject();
    delete responseQuestion.password;
    
    return NextResponse.json({
      success: true,
      question: responseQuestion
    }, { status: 201 });
    
  } catch (error) {
    console.error('질문 생성 오류:', error);
    return NextResponse.json(
      { error: '질문 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 질문 목록 조회
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'latest';
    
    // 필터 조건 구성
    const filter: any = { isDeleted: false };
    
    if (status) {
      filter.status = status;
    }
    
    if (category) {
      filter.category = category;
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { nickname: { $regex: search, $options: 'i' } }
      ];
    }
    
    // 정렬 옵션
    let sortOption: any = {};
    switch (sort) {
      case 'latest':
        sortOption = { createdAt: -1 };
        break;
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'views':
        sortOption = { views: -1 };
        break;
      case 'answered':
        sortOption = { status: -1, createdAt: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }
    
    // 전체 개수 조회
    const total = await Question.countDocuments(filter);
    
    // 질문 목록 조회
    const questions = await Question.find(filter)
      .sort(sortOption)
      .limit(limit)
      .skip((page - 1) * limit)
      .select('-password -ipAddress')
      .lean();
    
    return NextResponse.json({
      success: true,
      questions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('질문 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '질문 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}