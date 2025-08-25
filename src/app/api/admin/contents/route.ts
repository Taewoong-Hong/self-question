import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Debate from '@/models/Debate';
import Survey from '@/models/Survey';
import Request from '@/models/Request';
import { verifyAdminToken } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 콘텐츠 목록 조회
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
    
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const search = searchParams.get('search') || '';
    
    let contents: any[] = [];
    
    // 투표 데이터 조회
    if (filter === 'all' || filter === 'debate') {
      const debates = await Debate.find(
        search ? { title: { $regex: search, $options: 'i' } } : {}
      )
      .sort({ created_at: -1 })
      .lean();
      
      contents.push(...debates.map((debate: any) => ({
        id: debate.id || debate._id.toString(),
        title: debate.title,
        type: 'debate',
        status: debate.status === 'active' ? 'open' : debate.status === 'ended' ? 'closed' : 'scheduled',
        created_at: debate.created_at,
        start_at: debate.start_at,
        end_at: debate.end_at,
        author_ip: debate.author_ip_hash || 'unknown',
        author_nickname: debate.author_nickname,
        participant_count: debate.stats?.unique_voters || 0,
        is_reported: false, // TODO: 신고 기능 구현
        is_hidden: debate.is_hidden || false
      })));
    }
    
    // 설문 데이터 조회
    if (filter === 'all' || filter === 'survey') {
      const surveys = await Survey.find(
        search ? { title: { $regex: search, $options: 'i' } } : {}
      )
      .sort({ created_at: -1 })
      .lean();
      
      contents.push(...surveys.map((survey: any) => ({
        id: survey.id || survey._id.toString(),
        title: survey.title,
        type: 'survey',
        status: survey.status,
        created_at: survey.created_at,
        start_at: survey.start_at || null,
        end_at: survey.end_at || null,
        author_ip: survey.creator_ip || 'unknown',
        author_nickname: survey.author_nickname,
        participant_count: survey.stats?.response_count || 0,
        is_reported: false, // TODO: 신고 기능 구현
        is_hidden: survey.is_hidden || false
      })));
    }
    
    // 요청 데이터 조회
    if (filter === 'all' || filter === 'request') {
      const queryCondition: any = { is_deleted: false };
      if (search) {
        queryCondition.title = { $regex: search, $options: 'i' };
      }
      
      const requests = await Request.find(queryCondition)
      .sort({ created_at: -1 })
      .lean();
      
      contents.push(...requests.map((request: any) => ({
        id: request.id || request._id.toString(),
        title: request.title,
        type: 'request',
        status: request.admin_reply ? 'answered' : 'open', // 답글이 있으면 답변 완료 상태
        created_at: request.created_at,
        start_at: null, // 요청은 시작 시간이 없음
        end_at: null, // 요청은 종료 시간이 없음
        author_ip: request.author_ip || 'unknown',
        author_nickname: request.author_nickname,
        participant_count: request.views || 0, // 조회수를 참여자로 표시
        is_reported: false, // TODO: 신고 기능 구현
        is_hidden: request.is_deleted || !request.is_public || false,
        content: request.content,
        adminAnswer: request.admin_reply ? {
          content: request.admin_reply.content,
          answeredAt: request.admin_reply.replied_at,
          answeredBy: request.admin_reply.replied_by
        } : undefined
      })));
    }
    
    
    // 신고된 콘텐츠 필터
    if (filter === 'reported') {
      contents = contents.filter(content => content.is_reported);
    }
    
    // 날짜순 정렬
    contents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return NextResponse.json({
      success: true,
      contents
    });
    
  } catch (error) {
    console.error('콘텐츠 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '콘텐츠 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 콘텐츠 일괄 처리
export async function POST(request: NextRequest) {
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
    const { ids, action } = body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: '처리할 콘텐츠가 없습니다.' },
        { status: 400 }
      );
    }
    
    if (!['hide', 'show', 'delete'].includes(action)) {
      return NextResponse.json(
        { error: '잘못된 작업입니다.' },
        { status: 400 }
      );
    }
    
    // 각 ID에 대해 타입 확인 후 처리
    for (const id of ids) {
      // 투표 확인
      const debate = await Debate.findOne({ $or: [{ _id: id }, { id: id }] });
      if (debate) {
        if (action === 'delete') {
          await debate.deleteOne();
        } else {
          debate.is_hidden = action === 'hide';
          await debate.save();
        }
        continue;
      }
      
      // 설문 확인
      const survey = await Survey.findOne({ $or: [{ _id: id }, { id: id }] });
      if (survey) {
        if (action === 'delete') {
          await survey.deleteOne();
        } else {
          survey.is_hidden = action === 'hide';
          await survey.save();
        }
        continue;
      }
      
      // 요청 확인
      const request = await Request.findOne({ $or: [{ _id: id }, { id: id }] });
      if (request) {
        if (action === 'delete') {
          request.is_deleted = true;
          await request.save();
        } else {
          request.is_deleted = action === 'hide';
          await request.save();
        }
        continue;
      }
      
    }
    
    return NextResponse.json({
      success: true,
      message: `${ids.length}개 콘텐츠 처리 완료`
    });
    
  } catch (error) {
    console.error('콘텐츠 일괄 처리 오류:', error);
    return NextResponse.json(
      { error: '콘텐츠 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}