import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Request from '@/models/Request';
import { verifyAdminAuth } from '@/lib/adminAuthUtils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 요청 게시글에 답글 달기
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin 인증 확인
    const adminUser = await verifyAdminAuth(request);
    
    if (!adminUser) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }
    
    if (!adminUser.isAdmin) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }
    
    await dbConnect();
    
    const requestDoc = await Request.findOne({ 
      id: params.id,
      is_deleted: false
    });
    
    if (!requestDoc) {
      return NextResponse.json(
        { error: '요청 게시글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    const { content } = body;
    
    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: '답글 내용을 입력해주세요.' },
        { status: 400 }
      );
    }
    
    // 답글을 요청 모델에 직접 저장하거나 별도의 답글 모델을 만들 수 있습니다
    // 여기서는 간단하게 요청 모델에 admin_reply 필드를 추가하는 방식으로 구현
    requestDoc.admin_reply = {
      content: content.trim(),
      replied_at: new Date(),
      replied_by: adminUser.username || 'Admin'
    };
    
    await requestDoc.save();
    
    return NextResponse.json({
      success: true,
      message: '답글이 등록되었습니다.',
      reply: requestDoc.admin_reply
    });
    
  } catch (error) {
    console.error('답글 등록 오류:', error);
    return NextResponse.json(
      { error: '답글 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}