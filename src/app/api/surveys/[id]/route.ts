import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Survey from '@/models/Survey';
import Response from '@/models/Response';
import crypto from 'crypto';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const survey = await Survey.findOne({ 
      id: params.id,
      is_deleted: false 
    }).select('-admin_password_hash -admin_token -admin_token_expires');
    
    if (!survey) {
      return NextResponse.json(
        { error: '설문을 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    
    // Increment view count
    survey.stats.view_count += 1;
    await survey.save();
    
    // Check if user has already responded
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    // Check if admin
    const { cookies } = await import('next/headers');
    const cookieStore = cookies();
    const adminCookie = cookieStore.get('admin_token');
    const isAdmin = !!adminCookie;
    
    let hasResponded = false;
    if (clientIp && clientIp !== 'unknown' && !isAdmin) {
      const ipHash = crypto
        .createHash('sha256')
        .update(clientIp + (process.env.IP_SALT || 'default-salt'))
        .digest('hex');
      
      const existingResponse = await Response.findOne({
        survey_id: survey.id,
        respondent_ip_hash: ipHash
      });
      
      hasResponded = !!existingResponse;
    }
    
    // Convert to plain object
    const surveyData = survey.toObject();
    
    return NextResponse.json({
      ...surveyData,
      has_responded: hasResponded
    });
    
  } catch (error: any) {
    console.error('Survey fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
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
    const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!authToken) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }
    
    const survey = await Survey.findOne({ id: params.id });
    
    if (!survey) {
      return NextResponse.json(
        { error: '설문을 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    
    // Check if admin
    const { cookies } = await import('next/headers');
    const cookieStore = cookies();
    const adminCookie = cookieStore.get('admin_token');
    const isAdmin = !!adminCookie;
    
    // Validate token - 관리자가 아닌 경우에만 설문 작성자 토큰 검증
    if (!isAdmin) {
      if (!survey.validateAdminToken(authToken)) {
        return NextResponse.json(
          { error: '유효하지 않은 인증 토큰입니다' },
          { status: 401 }
        );
      }
    }
    
    // Check if editable (관리자는 항상 수정 가능)
    if (!isAdmin && !survey.canEdit()) {
      return NextResponse.json(
        { error: '응답을 받은 후에는 설문을 수정할 수 없습니다' },
        { status: 403 }
      );
    }
    
    // Update allowed fields
    const allowedFields = ['title', 'description', 'tags', 'author_nickname', 'questions', 'settings', 'welcome_screen', 'thankyou_screen', 'start_at', 'end_at', 'public_results'];
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        // 날짜 필드 특별 처리
        if (field === 'start_at' || field === 'end_at') {
          (survey as any)[field] = body[field] ? new Date(body[field]) : undefined;
        }
        // questions 배열 처리 (order 필드 추가 및 중첩 구조 보존)
        else if (field === 'questions') {
          (survey as any)[field] = body[field].map((q: any, index: number) => ({
            ...q,
            order: index,
            // properties와 choices의 is_other 필드 보존을 위해 깊은 복사
            properties: q.properties ? {
              ...q.properties,
              choices: q.properties.choices ? q.properties.choices.map((c: any) => ({
                ...c,
                is_other: c.is_other || false
              })) : []
            } : undefined
          }));
        }
        else {
          (survey as any)[field] = body[field];
        }
      }
    });
    
    // MongoDB가 중첩된 객체/배열 변경을 인식하도록 markModified 호출
    if (body.questions) {
      survey.markModified('questions');
    }
    if (body.settings) {
      survey.markModified('settings');
    }
    if (body.welcome_screen) {
      survey.markModified('welcome_screen');
    }
    if (body.thankyou_screen) {
      survey.markModified('thankyou_screen');
    }
    
    await survey.save();
    
    console.log('Survey updated:', {
      id: survey.id,
      title: survey.title,
      isAdmin: isAdmin,
      updatedFields: Object.keys(body),
      // 직접입력 필드 확인
      questionsWithOther: survey.questions?.map((q: any) => ({
        title: q.title,
        type: q.type,
        otherOptions: q.properties?.choices?.filter((c: any) => c.is_other).map((c: any) => c.label)
      }))
    });
    
    return NextResponse.json({
      message: '설문이 수정되었습니다',
      survey: {
        id: survey.id,
        title: survey.title,
        updated_at: survey.updated_at
      }
    });
    
  } catch (error: any) {
    console.error('Survey update error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
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
    
    // 쿠키에서 인증 토큰 확인
    const { cookies } = await import('next/headers');
    const cookieStore = cookies();
    
    // 작성자 쿠키 확인
    const authorCookie = cookieStore.get(`survey_author_${params.id}`);
    const adminCookie = cookieStore.get('admin_token');
    
    if (!authorCookie && !adminCookie) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }
    
    const survey = await Survey.findOne({ id: params.id });
    
    if (!survey) {
      return NextResponse.json(
        { error: '설문을 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    
    // 작성자 쿠키 검증
    if (authorCookie && !adminCookie) {
      if (!survey.validateAdminToken(authorCookie.value)) {
        return NextResponse.json(
          { error: '유효하지 않은 인증 토큰입니다' },
          { status: 401 }
        );
      }
    }
    
    // Soft delete
    survey.is_deleted = true;
    await survey.save();
    
    return NextResponse.json({
      message: '설문이 삭제되었습니다'
    });
    
  } catch (error: any) {
    console.error('Survey delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}