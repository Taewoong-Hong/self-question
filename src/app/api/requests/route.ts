import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Request from '@/models/Request';
import { CreateRequestDto } from '@/types/request';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const searchParams = request.nextUrl.searchParams;
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    // Search
    const search = searchParams.get('search');
    
    // Build query
    const query: any = {
      is_deleted: false,
      is_public: true
    };
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { author_nickname: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Get total count
    const total = await Request.countDocuments(query);
    
    // Get requests
    const requests = await Request.find(query)
      .select('-password_hash -author_ip -is_deleted -__v')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();
    
    return NextResponse.json({
      requests,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('요청 목록 조회 실패:', error);
    return NextResponse.json(
      { error: '요청 목록을 불러올 수 없습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body: CreateRequestDto = await request.json();
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // 입력값 검증
    if (!body.title || body.title.trim().length === 0) {
      return NextResponse.json(
        { error: '제목을 입력해주세요.' },
        { status: 400 }
      );
    }

    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json(
        { error: '내용을 입력해주세요.' },
        { status: 400 }
      );
    }

    if (!body.author_nickname || body.author_nickname.trim().length === 0) {
      return NextResponse.json(
        { error: '닉네임을 입력해주세요.' },
        { status: 400 }
      );
    }

    if (!body.password || body.password.length < 4) {
      return NextResponse.json(
        { error: '비밀번호는 4자 이상 입력해주세요.' },
        { status: 400 }
      );
    }

    // IP당 일일 작성 제한 (10개)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayCount = await Request.countDocuments({
      author_ip: clientIp,
      created_at: { $gte: today },
      is_deleted: false
    });

    if (todayCount >= 10) {
      return NextResponse.json(
        { error: '하루에 최대 10개까지만 작성할 수 있습니다.' },
        { status: 429 }
      );
    }

    // 비밀번호 해싱
    const passwordHash = await bcrypt.hash(body.password, 10);

    // 요청 생성
    const newRequest = new Request({
      title: body.title.trim(),
      content: body.content.trim(),
      author_nickname: body.author_nickname.trim(),
      author_ip: clientIp,
      password_hash: passwordHash,
      is_public: body.is_public !== false // 기본값 true
    });

    await newRequest.save();

    // 응답에서 민감한 정보 제거
    const response = {
      id: newRequest.id,
      title: newRequest.title,
      content: newRequest.content,
      author_nickname: newRequest.author_nickname,
      is_public: newRequest.is_public,
      views: newRequest.views,
      created_at: newRequest.created_at,
      updated_at: newRequest.updated_at
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('요청 생성 실패:', error);
    return NextResponse.json(
      { error: '요청 작성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}