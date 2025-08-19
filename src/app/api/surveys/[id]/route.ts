import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Survey from '@/models/Survey';
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
    
    return NextResponse.json(survey);
    
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
    
    // Validate admin token
    if (!survey.validateAdminToken(authToken)) {
      return NextResponse.json(
        { error: '유효하지 않은 인증 토큰입니다' },
        { status: 401 }
      );
    }
    
    // Check if editable
    if (!survey.canEdit()) {
      return NextResponse.json(
        { error: '응답을 받은 후에는 설문을 수정할 수 없습니다' },
        { status: 403 }
      );
    }
    
    // Update allowed fields
    const allowedFields = ['title', 'description', 'tags', 'questions', 'settings', 'welcome_screen', 'thankyou_screen', 'start_at', 'end_at'];
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        (survey as any)[field] = body[field];
      }
    });
    
    await survey.save();
    
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
    
    // Validate admin token
    if (!survey.validateAdminToken(authToken)) {
      return NextResponse.json(
        { error: '유효하지 않은 인증 토큰입니다' },
        { status: 401 }
      );
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