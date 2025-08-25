import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ErrorLog from '@/models/ErrorLog';
import { verifyAdminToken } from '@/lib/auth';

// 에러 로그 상태 업데이트
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 관리자 인증 확인
    const isAdmin = await verifyAdminToken(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 401 }
      );
    }

    await dbConnect();

    const body = await request.json();
    const { resolved } = body;

    // 에러 로그 업데이트
    const errorLog = await ErrorLog.findOneAndUpdate(
      { id: params.id },
      { resolved },
      { new: true }
    );

    if (!errorLog) {
      return NextResponse.json(
        { error: '에러 로그를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: '상태가 업데이트되었습니다.',
      errorLog
    });
  } catch (error) {
    console.error('Error updating error log:', error);
    return NextResponse.json(
      { error: '에러 로그 업데이트에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// 에러 로그 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 관리자 인증 확인
    const isAdmin = await verifyAdminToken(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 401 }
      );
    }

    await dbConnect();

    // 에러 로그 삭제
    const errorLog = await ErrorLog.findOneAndDelete({ id: params.id });

    if (!errorLog) {
      return NextResponse.json(
        { error: '에러 로그를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: '에러 로그가 삭제되었습니다.'
    });
  } catch (error) {
    console.error('Error deleting error log:', error);
    return NextResponse.json(
      { error: '에러 로그 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}