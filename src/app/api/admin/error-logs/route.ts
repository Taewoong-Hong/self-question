import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ErrorLog from '@/models/ErrorLog';
import { verifyAdminToken } from '@/lib/auth';

// 에러 로그 조회
export async function GET(request: NextRequest) {
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

    // 쿼리 파라미터
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const severity = searchParams.get('severity');
    const resolved = searchParams.get('resolved');
    const type = searchParams.get('type');

    // 필터 조건
    const filter: any = {};
    if (severity) filter.severity = severity;
    if (resolved !== null) filter.resolved = resolved === 'true';
    if (type) filter.type = type;

    // 전체 개수
    const total = await ErrorLog.countDocuments(filter);

    // 에러 로그 조회
    const logs = await ErrorLog.find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching error logs:', error);
    return NextResponse.json(
      { error: '에러 로그 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// 에러 로그 생성 (클라이언트에서 보고)
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const {
      message,
      stack,
      url,
      userAgent,
      severity = 'medium',
      metadata
    } = body;

    // 에러 로그 생성
    const errorLog = await ErrorLog.create({
      message,
      stack,
      url,
      userAgent,
      type: 'client',
      severity,
      metadata
    });

    return NextResponse.json({
      message: '에러 로그가 기록되었습니다.',
      id: errorLog.id
    });
  } catch (error) {
    console.error('Error creating error log:', error);
    return NextResponse.json(
      { error: '에러 로그 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}