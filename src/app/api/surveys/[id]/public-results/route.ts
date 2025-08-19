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
    
    const surveyDoc = await Survey.findOne({ 
      id: params.id,
      is_deleted: false 
    }).select('_id questions admin_results stats public_results');
    
    if (!surveyDoc) {
      return NextResponse.json(
        { error: '설문을 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    
    // Mongoose document를 plain object로 변환
    const survey = surveyDoc.toObject();
    
    // admin_results가 Map인 경우 일반 객체로 변환
    if (survey.admin_results && survey.admin_results instanceof Map) {
      const adminResultsObj: any = {};
      survey.admin_results.forEach((value: any, key: string) => {
        adminResultsObj[key] = value;
      });
      survey.admin_results = adminResultsObj;
    }
    
    // admin_results 내부의 각 질문별 데이터도 Map에서 객체로 변환
    if (survey.admin_results && typeof survey.admin_results === 'object') {
      Object.keys(survey.admin_results).forEach(questionId => {
        const adminResult = survey.admin_results![questionId];
        if (adminResult) {
          // choices가 Map인 경우 변환
          if (adminResult.choices && adminResult.choices instanceof Map) {
            const choicesObj: any = {};
            adminResult.choices.forEach((value: any, key: string) => {
              choicesObj[key] = value;
            });
            adminResult.choices = choicesObj;
          }
          // ratings가 Map인 경우 변환
          if (adminResult.ratings && adminResult.ratings instanceof Map) {
            const ratingsObj: any = {};
            adminResult.ratings.forEach((value: any, key: string) => {
              ratingsObj[key] = value;
            });
            adminResult.ratings = ratingsObj;
          }
        }
      });
    }
    
    
    // public_results가 false인 경우 접근 불가
    if (survey.public_results === false) {
      return NextResponse.json(
        { error: '이 설문의 결과는 공개되지 않습니다' },
        { status: 403 }
      );
    }

    // admin_results가 있으면 그것을 우선 사용 (슈퍼관리자가 수정한 데이터)
    // toObject()로 변환된 경우 Map이 일반 객체가 됨
    const hasAdminResults = survey.admin_results && 
       typeof survey.admin_results === 'object' && 
       Object.keys(survey.admin_results).length > 0;
    
    if (hasAdminResults) {
      console.log('[API] Processing admin results...');
      // admin_results 데이터를 API 응답 형식으로 변환
      const questionStats: any = {};
      let totalResponses = 0;
      
      survey.questions.forEach((question: any) => {
        // question.id 우선, 없으면 _id 사용
        const questionId = question.id || question._id?.toString() || '';
        
        
        // admin_results에서 다양한 ID 형식으로 시도
        let adminResult = survey.admin_results![questionId];
        
        // 만약 못 찾았다면 _id로 시도
        if (!adminResult && question._id) {
          adminResult = survey.admin_results![question._id.toString()];
        }
        
        // 그래도 못 찾았다면 모든 키를 순회하며 찾기
        if (!adminResult) {
          Object.keys(survey.admin_results!).forEach(key => {
            if (key === questionId || key === question._id?.toString()) {
              adminResult = survey.admin_results![key];
            }
          });
        }
        
        if (adminResult) {
          
          // _id 제거하고 필요한 필드만 복사
          const cleanAdminResult = {
            choices: adminResult.choices,
            ratings: adminResult.ratings,
            sample_responses: adminResult.sample_responses,
            total_responses: adminResult.total_responses
          };
          
          questionStats[questionId] = {
            response_count: cleanAdminResult.total_responses || 0,
            options: {},
            responses: cleanAdminResult.sample_responses || [],
            average: 0,
            question_type: question.type,
            question_title: question.title
          };
          
          totalResponses = Math.max(totalResponses, adminResult.total_responses || 0);
          
          switch (question.type) {
            case 'single_choice':
            case 'multiple_choice':
              if (cleanAdminResult.choices) {
                
                // adminResult.choices에서 직접 선택지 정보 가져오기
                Object.entries(cleanAdminResult.choices).forEach(([choiceId, count]) => {
                  // question.properties에서 label 찾기
                  const choice = question.properties?.choices?.find((c: any) => c.id === choiceId);
                  const choiceLabel = choice?.label || `선택지 ${choiceId}`;
                  
                  
                  questionStats[questionId].options[choiceId] = {
                    count: typeof count === 'number' ? count : 0,
                    label: choiceLabel
                  };
                });
              }
              break;
              
            case 'rating':
              if (cleanAdminResult.ratings) {
                let sum = 0;
                let count = 0;
                const ratingDistribution: any = {};
                
                Object.entries(cleanAdminResult.ratings).forEach(([rating, ratingCount]: [string, any]) => {
                  const ratingNum = parseInt(rating);
                  const countNum = typeof ratingCount === 'number' ? ratingCount : 0;
                  ratingDistribution[ratingNum] = countNum;
                  sum += ratingNum * countNum;
                  count += countNum;
                });
                
                questionStats[questionId].average = count > 0 ? sum / count : 0;
                questionStats[questionId].rating_distribution = ratingDistribution;
                questionStats[questionId].response_count = count;
              }
              break;
              
            case 'short_text':
            case 'long_text':
              questionStats[questionId].text_response_count = cleanAdminResult.total_responses || 0;
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
      // question.id 우선, 없으면 _id 사용 (admin_results와 동일한 로직)
      const questionId = question.id || question._id?.toString() || '';
      questionStats[questionId] = {
        response_count: 0,
        options: {},
        responses: [],
        average: 0,
        question_type: question.type,
        question_title: question.title
      };

      // 해당 질문에 대한 응답들 필터링 (question_id와 questionId 비교)
      const questionResponses = responses
        .map(r => r.answers.find((a: any) => {
          const answerQuestionId = a.question_id?.toString() || '';
          return answerQuestionId === questionId || answerQuestionId === question._id?.toString();
        }))
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