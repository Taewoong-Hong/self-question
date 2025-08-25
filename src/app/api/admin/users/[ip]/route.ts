import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { verifyAdminToken } from '@/lib/auth';
import Debate from '@/models/Debate';
import Survey from '@/models/Survey';
import Request from '@/models/Request';
import Guestbook from '@/models/Guestbook';

export async function GET(
  request: NextRequest,
  { params }: { params: { ip: string } }
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

    const ip = decodeURIComponent(params.ip);

    // 각 콘텐츠 타입별로 해당 IP의 활동 조회
    const debates = await Debate.find({ author_ip: ip })
      .select('title created_at status author_nickname admin_password_hash')
      .sort({ created_at: -1 })
      .lean();

    const surveys = await Survey.find({ author_ip: ip })
      .select('title created_at status author_nickname admin_password_hash')
      .sort({ created_at: -1 })
      .lean();

    const requests = await Request.find({ author_ip: ip })
      .select('title created_at status author_password')
      .sort({ created_at: -1 })
      .lean();

    const guestbook = await Guestbook.find({ ip: ip })
      .select('name message created_at')
      .sort({ created_at: -1 })
      .lean();


    // 활동 요약
    const activity = {
      _id: ip,
      ip: ip,
      totalDebates: debates.length,
      totalSurveys: surveys.length,
      totalRequests: requests.length,
      totalGuestbook: guestbook.length,
      lastActivity: new Date(Math.max(
        ...[
          ...debates.map(d => new Date(d.created_at).getTime()),
          ...surveys.map(s => new Date(s.created_at).getTime()),
          ...requests.map(r => new Date(r.created_at).getTime()),
          ...guestbook.map((g: any) => new Date(g.created_at).getTime())
        ].filter(time => !isNaN(time))
      ) || Date.now()),
      firstSeen: new Date(Math.min(
        ...[
          ...debates.map(d => new Date(d.created_at).getTime()),
          ...surveys.map(s => new Date(s.created_at).getTime()),
          ...requests.map(r => new Date(r.created_at).getTime()),
          ...guestbook.map((g: any) => new Date(g.created_at).getTime())
        ].filter(time => !isNaN(time))
      ) || Date.now())
    };

    // 각 콘텐츠 타입별로 사용된 비밀번호 해시 수집
    const credentials = {
      debates: debates
        .filter((d: any) => d.admin_password_hash)
        .map((d: any) => ({
          id: d._id,
          title: d.title,
          hashedPassword: d.admin_password_hash
        })),
      surveys: surveys
        .filter((s: any) => s.admin_password_hash)
        .map((s: any) => ({
          id: s._id,
          title: s.title,
          hashedPassword: s.admin_password_hash
        })),
      requests: requests
        .filter((r: any) => r.author_password)
        .map((r: any) => ({
          id: r._id,
          title: r.title,
          hashedPassword: r.author_password
        }))
    };

    return NextResponse.json({
      ip,
      activity,
      contents: {
        debates,
        surveys,
        requests,
        guestbook
      },
      credentials
    });
  } catch (error) {
    console.error('Error fetching user detail:', error);
    return NextResponse.json(
      { error: '사용자 상세 정보 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}