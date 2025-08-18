import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Request from '@/models/Request';
import { UpdateRequestDto } from '@/types/request';
import bcrypt from 'bcryptjs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const requestPost = await Request.findOne({
      id: params.id,
      is_deleted: false,
      is_public: true
    })
    .select('-password_hash -author_ip -is_deleted -__v')
    .lean()
    .exec();

    if (!requestPost) {
      return NextResponse.json(
        { error: '요청을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 조회수 증가
    await Request.updateOne(
      { id: params.id },
      { $inc: { views: 1 } }
    );

    return NextResponse.json({
      ...requestPost,
      views: requestPost.views + 1
    });
  } catch (error) {
    console.error('요청 조회 실패:', error);
    return NextResponse.json(
      { error: '요청을 불러올 수 없습니다.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const body = await request.json();
    const { password, ...updateData }: { password: string } & UpdateRequestDto = body;

    // 요청 찾기
    const requestPost = await Request.findOne({
      id: params.id,
      is_deleted: false
    });

    if (!requestPost) {
      return NextResponse.json(
        { error: '요청을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 비밀번호 확인
    if (!password) {
      return NextResponse.json(
        { error: '비밀번호를 입력해주세요.' },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, requestPost.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: '비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }

    // 업데이트
    if (updateData.title) requestPost.title = updateData.title.trim();
    if (updateData.content) requestPost.content = updateData.content.trim();
    if (typeof updateData.is_public !== 'undefined') requestPost.is_public = updateData.is_public;
    requestPost.updated_at = new Date();

    await requestPost.save();

    return NextResponse.json({
      id: requestPost.id,
      title: requestPost.title,
      content: requestPost.content,
      author_nickname: requestPost.author_nickname,
      is_public: requestPost.is_public,
      views: requestPost.views,
      created_at: requestPost.created_at,
      updated_at: requestPost.updated_at
    });
  } catch (error) {
    console.error('요청 수정 실패:', error);
    return NextResponse.json(
      { error: '요청 수정 중 오류가 발생했습니다.' },
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

    const body = await request.json();
    const { password } = body;

    // 요청 찾기
    const requestPost = await Request.findOne({
      id: params.id,
      is_deleted: false
    });

    if (!requestPost) {
      return NextResponse.json(
        { error: '요청을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 비밀번호 확인
    if (!password) {
      return NextResponse.json(
        { error: '비밀번호를 입력해주세요.' },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, requestPost.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: '비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }

    // 소프트 삭제
    requestPost.is_deleted = true;
    await requestPost.save();

    return NextResponse.json({ message: '요청이 삭제되었습니다.' });
  } catch (error) {
    console.error('요청 삭제 실패:', error);
    return NextResponse.json(
      { error: '삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}