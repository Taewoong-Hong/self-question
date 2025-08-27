import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Survey from '@/models/Survey';
import Response from '@/models/Response';
import crypto from 'crypto';

export const runtime = 'nodejs';         // mongoose 사용을 위해 edge 금지
export const dynamic = 'force-dynamic';  // 캐싱/정적화 방지

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const body = await request.json();
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const ipHash = crypto
      .createHash('sha256')
      .update(clientIp + (process.env.IP_SALT || 'default-salt'))
      .digest('hex');
    
    // Find survey
    const survey = await Survey.findOne({ 
      id: params.id,
      is_deleted: false 
    });
    
    if (!survey) {
      return NextResponse.json(
        { error: '설문을 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    
    // Check if can receive response
    if (!survey.canReceiveResponse()) {
      return NextResponse.json(
        { error: '이 설문은 응답을 받지 않습니다' },
        { status: 403 }
      );
    }
    
    // Check if admin (admins can respond multiple times)
    const { cookies } = await import('next/headers');
    const cookieStore = cookies();
    const adminCookie = cookieStore.get('admin_token');
    const isAdmin = !!adminCookie;
    
    // Check for duplicate response (skip for admins)
    if (!isAdmin) {
      const existingResponse = await Response.findOne({
        survey_id: survey.id,
        respondent_ip_hash: ipHash
      });
      
      if (existingResponse) {
        return NextResponse.json(
          { error: '이미 응답하셨습니다' },
          { status: 403 }
        );
      }
    }
    
    // Validate answers
    if (!body.answers || !Array.isArray(body.answers)) {
      return NextResponse.json(
        { error: '응답 데이터가 올바르지 않습니다' },
        { status: 400 }
      );
    }
    
    // Create response
    const startedAt = body.started_at ? new Date(body.started_at) : new Date();
    const submittedAt = new Date();
    const completionTime = Math.round((submittedAt.getTime() - startedAt.getTime()) / 1000);
    
    const response = new Response({
      survey_id: survey.id,
      survey_ref: survey._id,
      respondent_ip: clientIp,
      respondent_ip_hash: ipHash,
      user_agent: request.headers.get('user-agent') || '',
      answers: body.answers,
      started_at: startedAt,
      submitted_at: submittedAt,
      completion_time: completionTime,
      quality_flags: [], // Initialize empty array
      referrer: request.headers.get('referer') || '',
      utm_source: body.utm_source,
      utm_medium: body.utm_medium,
      utm_campaign: body.utm_campaign
    });
    
    // Calculate quality score after creation
    response.calculateQualityScore();
    
    await response.save();
    
    // Update survey statistics
    if (!survey.first_response_at) {
      survey.first_response_at = new Date();
      survey.is_editable = false;
    }
    
    survey.stats.response_count += 1;
    survey.stats.last_response_at = new Date();
    
    // Update completion rate
    const completedResponses = await Response.countDocuments({
      survey_id: survey.id,
      is_complete: true
    });
    survey.stats.completion_rate = Math.round((completedResponses / survey.stats.response_count) * 100);
    
    await survey.save();
    
    return NextResponse.json({
      message: '응답이 제출되었습니다',
      response_code: response.response_code
    });
    
  } catch (err: any) {
    console.error('[respond] error:', {
      surveyId: params.id,
      message: err?.message,
      code: err?.code,
      name: err?.name
    });
    
    // 중복 키 에러 (이미 응답한 경우)
    if (err.code === 11000) {
      return NextResponse.json(
        { error: '이미 응답하셨습니다', code: 'ALREADY_RESPONDED' },
        { status: 409 }  // Conflict
      );
    }
    
    // 유효성 검증 에러
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors || {})
        .map((e: any) => e.message)
        .join(', ');
      return NextResponse.json(
        { error: messages || '입력값이 올바르지 않습니다', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    
    // 설문을 찾을 수 없음
    if (err.message?.includes('찾을 수 없습니다')) {
      return NextResponse.json(
        { error: err.message, code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    
    // 설문 응답 거부 (종료된 설문 등)
    if (err.message?.includes('응답을 받지 않습니다')) {
      return NextResponse.json(
        { error: err.message, code: 'SURVEY_CLOSED' },
        { status: 403 }
      );
    }
    
    // 기타 서버 에러
    return NextResponse.json(
      { 
        error: err?.message || '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}