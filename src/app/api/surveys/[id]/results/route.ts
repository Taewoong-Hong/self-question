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
    }).select('_id questions admin_results stats');
    
    if (!survey) {
      return NextResponse.json(
        { error: '설문을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // admin_results가 있으면 우선 사용
    if (survey.admin_results && Object.keys(survey.admin_results).length > 0) {
      const questionStats = survey.questions.map((question: any) => {
        const adminResult = survey.admin_results.get(question.id);
        let results: any = {};

        if (!adminResult) {
          return {
            id: question.id,
            text: question.title,
            type: question.type,
            results: {},
            totalResponses: 0
          };
        }

        switch (question.type) {
          case 'single_choice':
          case 'multiple_choice':
            results = adminResult.choices || {};
            break;
          case 'rating':
            results = adminResult.ratings || {};
            break;
          case 'short_text':
          case 'long_text':
            results = adminResult.sample_responses || [];
            break;
        }

        return {
          id: question.id,
          text: question.title,
          type: question.type,
          results,
          totalResponses: adminResult.total_responses || 
            (question.type === 'single_choice' || question.type === 'multiple_choice' 
              ? Object.values(adminResult.choices || {}).reduce((sum: number, count: any) => sum + count, 0)
              : question.type === 'rating'
              ? Object.values(adminResult.ratings || {}).reduce((sum: number, count: any) => sum + count, 0)
              : adminResult.total_responses || 0)
        };
      });

      return NextResponse.json({
        totalResponses: survey.stats.response_count,
        questions: questionStats,
        lastUpdated: survey.updated_at
      });
    }

    // admin_results가 없으면 실제 응답 데이터 사용
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