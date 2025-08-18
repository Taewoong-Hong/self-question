import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Debate from '@/models/Debate';
import Survey from '@/models/Survey';
import { verifyJwt } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

// 콘텐츠 아이템 인터페이스
interface ContentItem {
  id: string;
  _id: any;
  title: string;
  description?: string;
  type: 'debate' | 'survey';
  status: string;
  created_at: Date;
  author_ip?: string;
  author_nickname?: string;
  participant_count: number;
  is_reported: boolean;
  is_hidden: boolean;
  tags?: string[];
}

// 콘텐츠 목록 조회
export async function GET(request: NextRequest) {
  // 슈퍼 관리자 인증 확인
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyJwt(token) as any;
    // 슈퍼 관리자인지 확인
    if (!decoded.isAdmin) {
      return NextResponse.json({ error: '슈퍼 관리자 권한이 필요합니다' }, { status: 403 });
    }
  } catch (error) {
    return NextResponse.json({ error: '유효하지 않은 토큰입니다' }, { status: 401 });
  }

  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    // 검색 조건 구성
    const searchQuery = search ? {
      $or: [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    } : {};
    
    // 기본 쿼리
    const baseQuery = {
      ...searchQuery,
      is_deleted: false
    };
    
    let contents: ContentItem[] = [];
    
    if (filter === 'all' || filter === 'debate') {
      // 투표 데이터 조회
      const debates = await Debate.find(baseQuery)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
        
      const debateContents = debates.map(debate => ({
        id: debate.id,
        _id: debate._id,
        title: debate.title,
        description: debate.description,
        type: 'debate' as const,
        status: debate.status,
        created_at: debate.created_at,
        author_ip: debate.author_ip_hash,
        author_nickname: debate.author_nickname,
        participant_count: debate.stats?.unique_voters || 0,
        is_reported: false, // Debate doesn't have is_reported field
        is_hidden: debate.is_hidden || false,
        tags: debate.tags
      }));
      
      contents = [...contents, ...debateContents];
    }
    
    if (filter === 'all' || filter === 'survey') {
      // 설문 데이터 조회
      const surveys = await Survey.find(baseQuery)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
        
      const surveyContents = surveys.map(survey => ({
        id: survey.id,
        _id: survey._id,
        title: survey.title,
        description: survey.description,
        type: 'survey' as const,
        status: survey.status,
        created_at: survey.created_at,
        author_ip: undefined, // Survey doesn't have author_ip
        author_nickname: survey.author_nickname,
        participant_count: survey.stats?.response_count || 0,
        is_reported: false, // Survey doesn't have is_reported field
        is_hidden: survey.is_hidden || false,
        tags: survey.tags
      }));
      
      contents = [...contents, ...surveyContents];
    }
    
    // 신고된 콘텐츠 필터
    if (filter === 'reported') {
      contents = contents.filter(content => content.is_reported);
    }
    
    // 정렬
    contents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    // 페이지네이션 적용
    const total = contents.length;
    contents = contents.slice(0, limit);
    
    return NextResponse.json({
      contents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
    
  } catch (error: any) {
    console.error('Admin contents error:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// 벌크 액션 처리
export async function POST(request: NextRequest) {
  // 슈퍼 관리자 인증 확인
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyJwt(token) as any;
    // 슈퍼 관리자인지 확인
    if (!decoded.isAdmin) {
      return NextResponse.json({ error: '슈퍼 관리자 권한이 필요합니다' }, { status: 403 });
    }
  } catch (error) {
    return NextResponse.json({ error: '유효하지 않은 토큰입니다' }, { status: 401 });
  }

  try {
    await connectDB();
    
    const body = await request.json();
    const { ids, action } = body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: '유효하지 않은 요청입니다' },
        { status: 400 }
      );
    }
    
    if (!['hide', 'show', 'delete'].includes(action)) {
      return NextResponse.json(
        { error: '유효하지 않은 액션입니다' },
        { status: 400 }
      );
    }
    
    // 각 ID의 타입을 확인하고 처리
    const results = {
      debates: { success: 0, failed: 0 },
      surveys: { success: 0, failed: 0 }
    };
    
    for (const id of ids) {
      // 먼저 투표에서 찾기
      let debate = await Debate.findOne({ id });
      if (debate) {
        try {
          if (action === 'delete') {
            debate.is_deleted = true;
          } else {
            debate.is_hidden = action === 'hide';
          }
          await debate.save();
          results.debates.success++;
        } catch {
          results.debates.failed++;
        }
        continue;
      }
      
      // 설문에서 찾기
      let survey = await Survey.findOne({ id });
      if (survey) {
        try {
          if (action === 'delete') {
            survey.is_deleted = true;
          } else {
            survey.is_hidden = action === 'hide';
          }
          await survey.save();
          results.surveys.success++;
        } catch {
          results.surveys.failed++;
        }
      }
    }
    
    return NextResponse.json({
      message: '처리가 완료되었습니다',
      results
    });
    
  } catch (error: any) {
    console.error('Admin bulk action error:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}