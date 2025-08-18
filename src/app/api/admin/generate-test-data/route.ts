import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Survey from '@/models/Survey';
import Response from '@/models/Response';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }
    
    const { surveyId, responseCount = 500 } = await request.json();
    
    const survey = await Survey.findOne({ id: surveyId }).populate('questions');
    if (!survey) {
      return NextResponse.json({ error: '설문을 찾을 수 없습니다' }, { status: 404 });
    }

    // 기존 응답 삭제
    await Response.deleteMany({ survey_id: surveyId });

    const responses = [];
    const questions = survey.questions || [];

    // 응답 생성
    for (let i = 0; i < responseCount; i++) {
      const ipHash = crypto
        .createHash('sha256')
        .update(`192.168.${Math.floor(i / 255)}.${i % 255}`)
        .digest('hex');

      const answers = [];
      
      // 각 질문에 대한 응답 생성
      for (const question of questions) {
        let answer;
        let otherText;

        switch (question.type) {
          case 'single_choice':
            if (question.properties?.choices && question.properties.choices.length > 0) {
              const randomIndex = Math.floor(Math.random() * question.properties.choices.length);
              const choice = question.properties.choices[randomIndex];
              answer = choice.id;
              if ((choice as any).is_other && Math.random() > 0.3) {
                otherText = `기타 응답 ${i + 1}`;
              }
            }
            break;

          case 'multiple_choice':
            if (question.properties?.choices && question.properties.choices.length > 0) {
              const selectedChoices = [];
              const numSelections = Math.floor(Math.random() * Math.min(3, question.properties.choices.length)) + 1;
              const shuffled = [...question.properties.choices].sort(() => Math.random() - 0.5);
              for (let j = 0; j < numSelections; j++) {
                selectedChoices.push(shuffled[j].id);
              }
              answer = selectedChoices;
            }
            break;

          case 'short_text':
            answer = `테스트 응답 ${i + 1} - ${question.title}`;
            break;

          case 'long_text':
            answer = `이것은 ${question.title}에 대한 상세한 테스트 응답입니다.\n여러 줄로 구성된 응답이며,\n응답 번호는 ${i + 1}입니다.`;
            break;

          case 'rating':
            const maxRating = question.properties?.rating_scale || 5;
            answer = Math.floor(Math.random() * maxRating) + 1;
            break;

          default:
            continue;
        }

        if (answer !== undefined && answer !== '') {
          answers.push({
            question_id: question.id,
            answer: answer,
            other_text: otherText
          });
        }
      }

      const response = {
        survey_id: surveyId,
        survey_ref: survey._id,
        respondent_ip: `192.168.${Math.floor(i / 255)}.${i % 255}`,
        respondent_ip_hash: ipHash,
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        answers: answers,
        started_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        submitted_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        is_complete: true,
        completion_time: 60 + Math.floor(Math.random() * 300),
        quality_score: 70 + Math.floor(Math.random() * 30),
        response_code: `TEST${Date.now()}${i}`
      };

      responses.push(response);
    }

    // 응답 저장
    await Response.insertMany(responses);

    // 설문 통계 업데이트
    survey.stats.response_count = responseCount;
    survey.stats.completion_rate = 87;
    survey.stats.avg_completion_time = 285;
    survey.stats.last_response_at = new Date();
    survey.first_response_at = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    survey.is_editable = false;
    
    await survey.save();

    return NextResponse.json({ 
      message: `${responseCount}개의 테스트 응답이 생성되었습니다.`,
      surveyId: survey.id
    });
    
  } catch (error) {
    console.error('테스트 데이터 생성 오류:', error);
    return NextResponse.json(
      { error: '테스트 데이터 생성 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}