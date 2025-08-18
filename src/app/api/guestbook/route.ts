import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Guestbook from '@/models/Guestbook';
import { CreateGuestbookRequest } from '@/types/guestbook';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const guestbooks = await Guestbook.find({ is_deleted: false })
      .select('-author_ip -is_deleted -__v')
      .sort({ created_at: -1 })
      .limit(100) // 최대 100개의 포스트잇
      .lean()
      .exec();

    return NextResponse.json({
      notes: guestbooks,
      total: guestbooks.length,
    });
  } catch (error) {
    console.error('방명록 조회 실패:', error);
    return NextResponse.json(
      { error: '방명록을 불러올 수 없습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body: CreateGuestbookRequest = await request.json();
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // 입력값 검증
    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json(
        { error: '내용을 입력해주세요.' },
        { status: 400 }
      );
    }

    if (body.content.length > 200) {
      return NextResponse.json(
        { error: '내용은 200자 이내로 입력해주세요.' },
        { status: 400 }
      );
    }

    // IP당 일일 작성 제한 (5개)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayCount = await Guestbook.countDocuments({
      author_ip: clientIp,
      created_at: { $gte: today },
      is_deleted: false
    });

    if (todayCount >= 5) {
      return NextResponse.json(
        { error: '하루에 최대 5개까지만 작성할 수 있습니다.' },
        { status: 429 }
      );
    }

    // 랜덤 위치 생성 (입력값이 없는 경우)
    const position = body.position || {
      x: Math.random() * 80 + 10, // 10~90%
      y: Math.random() * 80 + 10  // 10~90%
    };

    // 최상위 z-index 계산
    const highestNote = await Guestbook.findOne({ is_deleted: false })
      .sort({ z_index: -1 })
      .select('z_index')
      .lean()
      .exec() as { z_index?: number } | null;
    
    const newZIndex = (highestNote?.z_index || 0) + 1;

    // 비밀번호 해싱 (제공된 경우)
    let passwordHash;
    if (body.password) {
      passwordHash = await bcrypt.hash(body.password, 10);
    }

    // 방명록 생성
    const guestbook = new Guestbook({
      content: body.content.trim(),
      color: body.color || '#FFE500',
      position,
      author_nickname: body.author_nickname?.trim(),
      author_ip: clientIp,
      password_hash: passwordHash,
      z_index: newZIndex
    });

    await guestbook.save();

    // 응답에서 민감한 정보 제거
    const response = {
      id: guestbook.id,
      content: guestbook.content,
      color: guestbook.color,
      position: guestbook.position,
      author_nickname: guestbook.author_nickname,
      created_at: guestbook.created_at,
      z_index: guestbook.z_index
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('방명록 생성 실패:', error);
    return NextResponse.json(
      { error: '방명록 작성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}