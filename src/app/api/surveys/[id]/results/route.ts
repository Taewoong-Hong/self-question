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
    
    const survey = await Survey.findOne({ 
      id: params.id,
      is_deleted: false 
    }).select('_id questions');
    
    if (!survey) {
      return NextResponse.json(
        { error: '설문을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 모든 응답 가져오기
    const responses = await Response.find({
      survey_id: survey._id
    }).select('answers');

    const totalResponses = responses.length;

    // 질문별 통계 계산
    const questionStats = survey.questions.map((question: any) => {
      const questionResponses = responses
        .map(r => r.answers.find((a: any) => a.question_id.equals(question._id)))
        .filter(Boolean);

      let results: any = {};

      switch (question.type) {
        case 'single_choice':
        case 'multiple_choice':
          // 각 옵션별 응답 수 계산
          results = question.options.reduce((acc: any, option: string) => {
            acc[option] = 0;
            return acc;
          }, {});

          questionResponses.forEach((answer: any) => {
            if (question.type === 'single_choice') {
              if (results[answer.value] !== undefined) {
                results[answer.value]++;
              }
            } else {
              // multiple_choice
              const values = Array.isArray(answer.value) ? answer.value : [answer.value];
              values.forEach((val: string) => {
                if (results[val] !== undefined) {
                  results[val]++;
                }
              });
            }
          });
          break;

        case 'rating':
          // 평점별 응답 수 계산
          results = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
          questionResponses.forEach((answer: any) => {
            const rating = parseInt(answer.value);
            if (rating >= 1 && rating <= 5) {
              results[rating]++;
            }
          });
          break;

        case 'text':
        case 'textarea':
          // 텍스트 응답은 배열로 반환
          results = questionResponses.map((answer: any) => answer.value);
          break;
      }

      return {
        id: question._id,
        text: question.text,
        type: question.type,
        results,
        totalResponses: questionResponses.length
      };
    });

    return NextResponse.json({
      totalResponses,
      questions: questionStats,
      lastUpdated: new Date()
    });
    
  } catch (error: any) {
    console.error('Survey results error:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}