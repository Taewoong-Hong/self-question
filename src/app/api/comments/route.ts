import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Comment from '@/lib/models/Comment';
import Debate from '@/lib/models/Debate';
import Question from '@/lib/models/Question';
import mongoose from 'mongoose';

// 댓글 생성
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { contentType, contentId, nickname, password, content, parentId } = body;
    
    // 필수 필드 검증
    if (!contentType || !contentId || !nickname || !password || !content) {
      return NextResponse.json(
        { error: '필수 정보를 모두 입력해주세요.' },
        { status: 400 }
      );
    }
    
    // 비밀번호 길이 검증
    if (password.length < 4) {
      return NextResponse.json(
        { error: '비밀번호는 최소 4자 이상이어야 합니다.' },
        { status: 400 }
      );
    }
    
    // ID 형식 확인 (16자리 hex string)
    if (!/^[a-f0-9]{16}$/i.test(contentId)) {
      return NextResponse.json(
        { error: '잘못된 콘텐츠 ID 형식입니다.' },
        { status: 400 }
      );
    }
    
    // 콘텐츠 존재 여부 확인
    let targetContent;
    if (contentType === 'debate') {
      targetContent = await Debate.findOne({ id: contentId });
    } else if (contentType === 'question') {
      targetContent = await Question.findOne({ id: contentId });
    } else {
      return NextResponse.json(
        { error: '잘못된 콘텐츠 타입입니다.' },
        { status: 400 }
      );
    }
    
    if (!targetContent || targetContent.isDeleted) {
      return NextResponse.json(
        { error: '존재하지 않는 게시물입니다.' },
        { status: 404 }
      );
    }
    
    // 대댓글인 경우 부모 댓글 확인
    if (parentId) {
      const parentComment = await Comment.findById(parentId);
      if (!parentComment || parentComment.isDeleted) {
        return NextResponse.json(
          { error: '존재하지 않는 댓글입니다.' },
          { status: 404 }
        );
      }
      
      // 부모 댓글이 같은 게시물의 댓글인지 확인
      if (parentComment.contentId.toString() !== contentId) {
        return NextResponse.json(
          { error: '잘못된 댓글 참조입니다.' },
          { status: 400 }
        );
      }
    }
    
    // 댓글 생성
    const comment = new Comment({
      contentType,
      contentId,
      nickname,
      password,
      content: content.trim(),
      parentId
    });
    
    await comment.save();
    
    // 비밀번호 제외하고 반환
    const responseComment = comment.toObject();
    delete responseComment.password;
    
    return NextResponse.json({
      success: true,
      comment: responseComment
    }, { status: 201 });
    
  } catch (error) {
    console.error('댓글 생성 오류:', error);
    return NextResponse.json(
      { error: '댓글 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 댓글 목록 조회
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const contentType = searchParams.get('contentType');
    const contentId = searchParams.get('contentId');
    
    if (!contentType || !contentId) {
      return NextResponse.json(
        { error: '콘텐츠 정보가 필요합니다.' },
        { status: 400 }
      );
    }
    
    // ID 형식 확인 (16자리 hex string)
    if (!/^[a-f0-9]{16}$/i.test(contentId)) {
      return NextResponse.json(
        { error: '잘못된 콘텐츠 ID 형식입니다.' },
        { status: 400 }
      );
    }
    
    // 댓글 조회 (삭제되지 않은 것만)
    const comments = await Comment.find({
      contentType,
      contentId,
      isDeleted: false
    })
    .sort({ createdAt: -1 })
    .select('-password')
    .lean();
    
    // 댓글을 계층 구조로 변환
    const commentMap = new Map();
    const rootComments: any[] = [];
    
    // 모든 댓글을 맵에 저장
    comments.forEach((comment: any) => {
      commentMap.set(comment._id.toString(), {
        ...comment,
        replies: []
      });
    });
    
    // 계층 구조 구성
    comments.forEach((comment: any) => {
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId.toString());
        if (parent) {
          parent.replies.push(commentMap.get(comment._id.toString()));
        }
      } else {
        rootComments.push(commentMap.get(comment._id.toString()));
      }
    });
    
    return NextResponse.json({
      success: true,
      comments: rootComments,
      total: comments.length
    });
    
  } catch (error) {
    console.error('댓글 조회 오류:', error);
    return NextResponse.json(
      { error: '댓글 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}