import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Comment from '@/lib/models/Comment';

// 댓글 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const { id } = params;
    const body = await request.json();
    const { password, content } = body;
    
    if (!password || !content) {
      return NextResponse.json(
        { error: '필수 정보를 모두 입력해주세요.' },
        { status: 400 }
      );
    }
    
    // 댓글 찾기
    const comment = await Comment.findById(id);
    
    if (!comment || comment.isDeleted) {
      return NextResponse.json(
        { error: '존재하지 않는 댓글입니다.' },
        { status: 404 }
      );
    }
    
    // 비밀번호 확인
    const isPasswordValid = await comment.comparePassword(password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: '비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }
    
    // 댓글 수정
    comment.content = content.trim();
    await comment.save();
    
    // 비밀번호 제외하고 반환
    const responseComment = comment.toObject();
    delete responseComment.password;
    
    return NextResponse.json({
      success: true,
      comment: responseComment
    });
    
  } catch (error) {
    console.error('댓글 수정 오류:', error);
    return NextResponse.json(
      { error: '댓글 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 댓글 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const { id } = params;
    const body = await request.json();
    const { password } = body;
    
    if (!password) {
      return NextResponse.json(
        { error: '비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }
    
    // 댓글 찾기
    const comment = await Comment.findById(id);
    
    if (!comment || comment.isDeleted) {
      return NextResponse.json(
        { error: '존재하지 않는 댓글입니다.' },
        { status: 404 }
      );
    }
    
    // 비밀번호 확인
    const isPasswordValid = await comment.comparePassword(password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: '비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }
    
    // 대댓글이 있는지 확인
    const hasReplies = await Comment.exists({
      parentId: id,
      isDeleted: false
    });
    
    if (hasReplies) {
      // 대댓글이 있으면 soft delete
      comment.isDeleted = true;
      comment.content = '삭제된 댓글입니다.';
      await comment.save();
    } else {
      // 대댓글이 없으면 hard delete
      await comment.deleteOne();
    }
    
    return NextResponse.json({
      success: true,
      message: '댓글이 삭제되었습니다.'
    });
    
  } catch (error) {
    console.error('댓글 삭제 오류:', error);
    return NextResponse.json(
      { error: '댓글 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}