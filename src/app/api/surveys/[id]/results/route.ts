import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Survey from '@/models/Survey';
import Response from '@/models/Response';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    // 관리자 토큰 확인
    const cookieStore = request.cookies;
    const adminToken = cookieStore.get(`survey_admin_${params.id}`)?.value;
    
    if (!adminToken) {
      return NextResponse.json(
        { error: '권한이 없습니다' },
        { status: 401 }
      );
    }
    
    const survey = await Survey.findOne({ 
      id: params.id,
      is_deleted: false 
    }).select('_id questions admin_results stats admin_token');
    
    if (!survey) {
      return NextResponse.json(
        { error: '설문을 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    
    // 토큰 검증
    if (survey.admin_token !== adminToken) {
      return NextResponse.json(
        { error: '유효하지 않은 관리자 토큰입니다' },
        { status: 401 }
      );
    }

    // 응답 데이터 가져오기
    const responses = await Response.find({
      survey_id: survey._id
    }).select('answers');

    // 질문별 통계 계산
    const questionStats: any = {};
    
    survey.questions.forEach((question: any) => {
      const questionId = question._id.toString();
      questionStats[questionId] = {
        response_count: 0,
        options: {},
        responses: [],
        average: 0
      };

      // 해당 질문에 대한 응답들 필터링
      const questionResponses = responses
        .map(r => r.answers.find((a: any) => a.question_id.toString() === questionId))
        .filter(Boolean);

      questionStats[questionId].response_count = questionResponses.length;

      switch (question.type) {
        case 'single_choice':
        case 'multiple_choice':
          // 각 선택지별 카운트 초기화
          if (question.properties?.choices) {
            question.properties.choices.forEach((choice: any) => {
              questionStats[questionId].options[choice.id] = 0;
            });
          }

          // 응답 카운트
          questionResponses.forEach((answer: any) => {
            if (question.type === 'single_choice') {
              if (answer.choice_id && questionStats[questionId].options.hasOwnProperty(answer.choice_id)) {
                questionStats[questionId].options[answer.choice_id]++;
              }
            } else {
              // multiple_choice
              if (Array.isArray(answer.choice_ids)) {
                answer.choice_ids.forEach((choiceId: string) => {
                  if (questionStats[questionId].options.hasOwnProperty(choiceId)) {
                    questionStats[questionId].options[choiceId]++;
                  }
                });
              }
            }
          });
          break;

        case 'short_text':
        case 'long_text':
          // 텍스트 응답들 수집
          questionStats[questionId].responses = questionResponses
            .map((answer: any) => answer.text)
            .filter(Boolean);
          break;

        case 'rating':
          // 평점 평균 계산
          const ratings = questionResponses
            .map((answer: any) => answer.rating)
            .filter((rating: number) => !isNaN(rating) && rating >= 1 && rating <= 5);
          
          if (ratings.length > 0) {
            const sum = ratings.reduce((acc: number, rating: number) => acc + rating, 0);
            questionStats[questionId].average = sum / ratings.length;
          }
          break;
      }
    });

    return NextResponse.json({
      question_stats: questionStats,
      total_responses: responses.length,
      last_updated: new Date()
    });
    
  } catch (error: any) {
    console.error('Survey results error:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}