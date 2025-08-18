import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Guestbook from '@/models/Guestbook';
import { UpdateGuestbookPositionRequest } from '@/types/guestbook';
import bcrypt from 'bcryptjs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const body: UpdateGuestbookPositionRequest = await request.json();
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // 작성자 본인 확인
    const guestbook = await Guestbook.findOne({
      id: params.id,
      is_deleted: false
    });

    if (!guestbook) {
      return NextResponse.json(
        { error: '방명록을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // IP 확인 (작성 후 24시간 동안만 이동 가능)
    const hoursSinceCreation = (Date.now() - guestbook.created_at.getTime()) / (1000 * 60 * 60);
    if (guestbook.author_ip !== clientIp || hoursSinceCreation > 24) {
      return NextResponse.json(
        { error: '본인이 작성한 방명록만 이동할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 위치 업데이트
    if (body.position) {
      guestbook.position = {
        x: Math.max(0, Math.min(100, body.position.x)),
        y: Math.max(0, Math.min(100, body.position.y))
      };
    }

    // z-index 업데이트 (최상위로)
    if (body.z_index !== undefined) {
      const highestNote = await Guestbook.findOne({ is_deleted: false })
        .sort({ z_index: -1 })
        .select('z_index')
        .lean()
        .exec() as { z_index?: number } | null;
      
      guestbook.z_index = (highestNote?.z_index || 0) + 1;
    }

    await guestbook.save();

    return NextResponse.json({
      id: guestbook.id,
      position: guestbook.position,
      z_index: guestbook.z_index
    });
  } catch (error) {
    console.error('방명록 위치 업데이트 실패:', error);
    return NextResponse.json(
      { error: '위치 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    // 요청 본문에서 비밀번호 가져오기
    const body = await request.json();
    const { password } = body;

    // 작성자 본인 확인
    const guestbook = await Guestbook.findOne({
      id: params.id,
      is_deleted: false
    });

    if (!guestbook) {
      return NextResponse.json(
        { error: '방명록을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 비밀번호가 설정된 경우 비밀번호 확인
    if (guestbook.password_hash) {
      if (!password) {
        return NextResponse.json(
          { error: '비밀번호를 입력해주세요.' },
          { status: 401 }
        );
      }

      const isPasswordValid = await bcrypt.compare(password, guestbook.password_hash);
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: '비밀번호가 일치하지 않습니다.' },
          { status: 401 }
        );
      }
    } else {
      // 비밀번호가 없는 메모는 IP로만 확인 (기존 로직)
      const clientIp = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'unknown';
      
      const hoursSinceCreation = (Date.now() - guestbook.created_at.getTime()) / (1000 * 60 * 60);
      if (guestbook.author_ip !== clientIp || hoursSinceCreation > 1) {
        return NextResponse.json(
          { error: '본인이 작성한 방명록만 삭제할 수 있습니다.' },
          { status: 403 }
        );
      }
    }

    // 소프트 삭제
    guestbook.is_deleted = true;
    await guestbook.save();

    return NextResponse.json({ message: '방명록이 삭제되었습니다.' });
  } catch (error) {
    console.error('방명록 삭제 실패:', error);
    return NextResponse.json(
      { error: '삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}