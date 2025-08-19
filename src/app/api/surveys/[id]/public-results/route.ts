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
    }).select('_id questions admin_results stats public_results');
    
    if (!survey) {
      return NextResponse.json(
        { error: '설문을 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    
    // public_results가 false인 경우 접근 불가
    if (survey.public_results === false) {
      return NextResponse.json(
        { error: '이 설문의 결과는 공개되지 않습니다' },
        { status: 403 }
      );
    }

    // 디버깅을 위한 로그
    console.log('Survey data:', {
      id: survey.id,
      hasAdminResults: !!survey.admin_results,
      adminResultsType: typeof survey.admin_results,
      adminResultsIsMap: survey.admin_results instanceof Map,
      questionsCount: survey.questions.length,
      questionIds: survey.questions.map((q: any) => ({ id: q.id, _id: q._id })),
      statsResponseCount: survey.stats?.response_count
    });

    // admin_results가 있으면 그것을 우선 사용 (슈퍼관리자가 수정한 데이터)
    // Mongoose Map은 toObject()로 변환되어 있을 수 있음
    const hasAdminResults = survey.admin_results && 
      ((survey.admin_results instanceof Map && survey.admin_results.size > 0) ||
       (typeof survey.admin_results === 'object' && Object.keys(survey.admin_results).length > 0));
    
    if (hasAdminResults) {
      // admin_results 데이터를 API 응답 형식으로 변환
      const questionStats: any = {};
      let totalResponses = 0;
      
      survey.questions.forEach((question: any) => {
        // question.id 또는 question._id 둘 다 시도
        const questionId = (question.id || question._id || '').toString();
        
        // Map이면 get 메서드 사용, 아니면 객체 접근
        const adminResult = survey.admin_results instanceof Map 
          ? survey.admin_results.get(questionId)
          : survey.admin_results![questionId];
        
        console.log(`Question ${questionId}:`, {
          hasAdminResult: !!adminResult,
          adminResult
        });
        
        if (adminResult) {
          questionStats[questionId] = {
            response_count: adminResult.total_responses || 0,
            options: {},
            responses: adminResult.sample_responses || [],
            average: 0,
            question_type: question.type,
            question_title: question.title
          };
          
          totalResponses = Math.max(totalResponses, adminResult.total_responses || 0);
          
          switch (question.type) {
            case 'single_choice':
            case 'multiple_choice':
              if (adminResult.choices && question.properties?.choices) {
                question.properties.choices.forEach((choice: any) => {
                  const count = adminResult.choices![choice.id] || 0;
                  questionStats[questionId].options[choice.id] = {
                    count: count,
                    label: choice.label
                  };
                });
              }
              break;
              
            case 'rating':
              if (adminResult.ratings) {
                let sum = 0;
                let count = 0;
                const ratingDistribution: any = {};
                
                Object.entries(adminResult.ratings).forEach(([rating, ratingCount]: [string, any]) => {
                  const ratingNum = parseInt(rating);
                  ratingDistribution[ratingNum] = ratingCount;
                  sum += ratingNum * ratingCount;
                  count += ratingCount;
                });
                
                questionStats[questionId].average = count > 0 ? sum / count : 0;
                questionStats[questionId].rating_distribution = ratingDistribution;
                questionStats[questionId].response_count = count;
              }
              break;
              
            case 'short_text':
            case 'long_text':
              questionStats[questionId].text_response_count = adminResult.total_responses || 0;
              break;
          }
        }
      });
      
      // stats의 response_count를 우선 사용
      const finalTotalResponses = survey.stats?.response_count || totalResponses;
      
      return NextResponse.json({
        question_stats: questionStats,
        total_responses: finalTotalResponses,
        last_updated: new Date(),
        data_source: 'admin_modified'
      });
    }
    
    // admin_results가 없으면 실제 응답 데이터 사용
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
        average: 0,
        question_type: question.type,
        question_title: question.title
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
              questionStats[questionId].options[choice.id] = {
                count: 0,
                label: choice.label
              };
            });
          }

          // 응답 카운트
          questionResponses.forEach((answer: any) => {
            if (question.type === 'single_choice') {
              if (answer.choice_id && questionStats[questionId].options.hasOwnProperty(answer.choice_id)) {
                questionStats[questionId].options[answer.choice_id].count++;
              }
            } else {
              // multiple_choice
              if (Array.isArray(answer.choice_ids)) {
                answer.choice_ids.forEach((choiceId: string) => {
                  if (questionStats[questionId].options.hasOwnProperty(choiceId)) {
                    questionStats[questionId].options[choiceId].count++;
                  }
                });
              }
            }
          });
          break;

        case 'short_text':
        case 'long_text':
          // 텍스트 응답은 공개 결과에서는 개수만 표시
          questionStats[questionId].text_response_count = questionResponses.length;
          break;

        case 'rating':
          // 평점 평균 계산
          const ratings = questionResponses
            .map((answer: any) => answer.rating)
            .filter((rating: number) => !isNaN(rating) && rating >= 1 && rating <= 5);
          
          if (ratings.length > 0) {
            const sum = ratings.reduce((acc: number, rating: number) => acc + rating, 0);
            questionStats[questionId].average = sum / ratings.length;
            
            // 각 평점별 카운트
            questionStats[questionId].rating_distribution = {
              1: ratings.filter(r => r === 1).length,
              2: ratings.filter(r => r === 2).length,
              3: ratings.filter(r => r === 3).length,
              4: ratings.filter(r => r === 4).length,
              5: ratings.filter(r => r === 5).length
            };
          }
          break;
      }
    });

    // stats의 response_count를 우선 사용
    const finalTotalResponses = survey.stats?.response_count || responses.length;
    
    return NextResponse.json({
      question_stats: questionStats,
      total_responses: finalTotalResponses,
      last_updated: new Date(),
      data_source: 'actual_responses'
    });
    
  } catch (error: any) {
    console.error('Public survey results error:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}