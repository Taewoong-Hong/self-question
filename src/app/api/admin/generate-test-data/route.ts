import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Survey from '@/models/Survey';
import Response from '@/models/Response';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { surveyId, responseCount = 500 } = await request.json();
    
    const survey = await Survey.findOne({ id: surveyId });
    if (!survey) {
      return NextResponse.json({ error: '설문을 찾을 수 없습니다' }, { status: 404 });
    }

    // 기존 응답 삭제
    await Response.deleteMany({ survey_id: surveyId });

    // 연령대별 응답 분포
    const ageDistribution = {
      '20대': Math.floor(responseCount * 0.36),
      '30대': Math.floor(responseCount * 0.34),
      '40대': Math.floor(responseCount * 0.18),
      '50대 이상': Math.floor(responseCount * 0.12)
    };

    // 거주 형태별 분포
    const livingTypeDistribution = {
      '전세': { '20대': 0.45, '30대': 0.40, '40대': 0.25, '50대 이상': 0.15 },
      '월세': { '20대': 0.40, '30대': 0.30, '40대': 0.20, '50대 이상': 0.10 },
      '자가': { '20대': 0.10, '30대': 0.25, '40대': 0.50, '50대 이상': 0.70 },
      '기타': { '20대': 0.05, '30대': 0.05, '40대': 0.05, '50대 이상': 0.05 }
    };

    // 서비스 사용 의향
    const serviceIntention = {
      '20대': { '매우 사용하고 싶다': 0.65, '어느 정도 관심 있다': 0.25, '잘 모르겠다': 0.08, '사용하지 않을 것 같다': 0.02 },
      '30대': { '매우 사용하고 싶다': 0.58, '어느 정도 관심 있다': 0.30, '잘 모르겠다': 0.10, '사용하지 않을 것 같다': 0.02 },
      '40대': { '매우 사용하고 싶다': 0.45, '어느 정도 관심 있다': 0.35, '잘 모르겠다': 0.15, '사용하지 않을 것 같다': 0.05 },
      '50대 이상': { '매우 사용하고 싶다': 0.35, '어느 정도 관심 있다': 0.40, '잘 모르겠다': 0.20, '사용하지 않을 것 같다': 0.05 }
    };

    const worries = [
      '보증금 떼일까봐',
      '집주인 신뢰도', 
      '등기부 등본 확인이 어려움',
      '복잡한 계약 절차'
    ];

    const verificationMethods = [
      '부동산 중개업소 말만 믿는다',
      '인터넷 검색',
      '법원/정부 공공데이터 서비스 (예: 안심전세앱)',
      '친척·지인 도움',
      '스스로 등기부/세금 체납 여부 확인'
    ];

    const importantFactors = [
      '정보의 정확성',
      '빠른 분석 속도',
      '이해하기 쉬운 결과 리포트',
      '가격(저렴한 이용료)',
      '브랜드 신뢰도'
    ];

    const inconveniences = [
      '등기부등본 떼는 것도 복잡하고 봐도 무슨 말인지 모르겠어요',
      '부동산 말만 믿고 계약했다가 나중에 문제 생길까봐 불안합니다',
      '정부 앱은 너무 복잡하고 사용하기 어려워요',
      '여러 사이트를 돌아다니면서 정보를 찾아야 해서 번거롭습니다',
      '전문 용어가 많아서 일반인이 이해하기 어렵습니다',
      '정보가 최신화되지 않아서 신뢰하기 어려워요',
      '매번 수수료 내고 확인하기엔 부담스럽습니다',
      '시간이 너무 오래 걸려요. 바쁜데 일일이 확인하기 어렵습니다',
      '어디서부터 확인해야 할지 막막합니다'
    ];

    const improvements = [
      '한 번에 모든 정보를 볼 수 있으면 좋겠어요',
      '위험도를 점수로 보여주면 이해하기 쉬울 것 같아요',
      '실시간 알림 기능이 있으면 좋겠습니다',
      '주변 시세 정보도 함께 제공해주세요',
      '실제 피해 사례를 보여주면 더 신뢰할 수 있을 것 같아요',
      'AI가 위험 요소를 자동으로 분석해주면 좋겠어요',
      '모바일 앱으로도 쉽게 확인할 수 있게 해주세요',
      '계약서 검토 기능도 있으면 좋겠습니다',
      '중개사 평가 정보도 같이 보여주세요',
      '가격 예측 기능이 있으면 도움이 될 것 같아요'
    ];

    const responses = [];
    let responseIndex = 0;

    // 응답 생성
    for (const [ageGroup, count] of Object.entries(ageDistribution)) {
      for (let i = 0; i < count; i++) {
        responseIndex++;
        
        // 거주 형태 결정
        const livingTypeRand = Math.random();
        let livingType = '전세';
        let cumProb = 0;
        for (const [type, prob] of Object.entries(livingTypeDistribution)) {
          cumProb += prob[ageGroup];
          if (livingTypeRand < cumProb) {
            livingType = type;
            break;
          }
        }

        // 피해 경험 (전월세 거주자가 더 높은 확률)
        const hasDamageExperience = (livingType === '전세' || livingType === '월세') 
          ? Math.random() < 0.23
          : Math.random() < 0.05;

        // 서비스 사용 의향
        const intentionRand = Math.random();
        let useIntention = '매우 사용하고 싶다';
        cumProb = 0;
        for (const [intention, prob] of Object.entries(serviceIntention[ageGroup])) {
          cumProb += prob;
          if (intentionRand < cumProb) {
            useIntention = intention;
            break;
          }
        }

        // 지불 의향
        let paymentWilling = '무료일 때만 사용';
        if (useIntention === '매우 사용하고 싶다') {
          const payRand = Math.random();
          if (payRand < 0.15) paymentWilling = '무료일 때만 사용';
          else if (payRand < 0.45) paymentWilling = '1회 1천 원 ~ 5천 원';
          else if (payRand < 0.75) paymentWilling = '1회 5천 원 ~ 1만 원';
          else paymentWilling = '월 구독 (예: 9,900원)';
        } else if (useIntention === '어느 정도 관심 있다') {
          const payRand = Math.random();
          if (payRand < 0.35) paymentWilling = '무료일 때만 사용';
          else if (payRand < 0.70) paymentWilling = '1회 1천 원 ~ 5천 원';
          else paymentWilling = '1회 5천 원 ~ 1만 원';
        }

        // 걱정사항 선택 (복수)
        const selectedWorries = [];
        selectedWorries.push(worries[0]); // 보증금 떼일까봐는 대부분 선택
        selectedWorries.push(worries[1]); // 집주인 신뢰도도 대부분 선택
        if (Math.random() < 0.3) selectedWorries.push(worries[2]);
        if (Math.random() < 0.2) selectedWorries.push(worries[3]);

        const ipHash = crypto
          .createHash('sha256')
          .update(`192.168.${Math.floor(responseIndex / 255)}.${responseIndex % 255}`)
          .digest('hex');

        const response = {
          survey_id: surveyId,
          survey_ref: survey._id,
          respondent_ip: `192.168.${Math.floor(responseIndex / 255)}.${responseIndex % 255}`,
          respondent_ip_hash: ipHash,
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          answers: [
            {
              question_id: 'q1',
              answer: livingType === '전세' ? 'c1' : livingType === '월세' ? 'c2' : livingType === '자가' ? 'c3' : 'c4',
              other_text: livingType === '기타' ? '기숙사' : undefined
            },
            {
              question_id: 'q2',
              answer: ageGroup === '20대' ? 'c1' : ageGroup === '30대' ? 'c2' : ageGroup === '40대' ? 'c3' : 'c4'
            },
            {
              question_id: 'q3',
              answer: selectedWorries.map((worry, idx) => `c${worries.indexOf(worry) + 1}`)
            },
            {
              question_id: 'q4',
              answer: hasDamageExperience ? 'c1' : 'c2'
            },
            {
              question_id: 'q5',
              answer: `c${Math.floor(Math.random() * 5) + 1}`
            },
            {
              question_id: 'q6',
              answer: Math.random() < 0.6 ? inconveniences[Math.floor(Math.random() * inconveniences.length)] : ''
            },
            {
              question_id: 'q7',
              answer: useIntention === '매우 사용하고 싶다' ? 'c1' : 
                      useIntention === '어느 정도 관심 있다' ? 'c2' :
                      useIntention === '잘 모르겠다' ? 'c3' : 'c4'
            },
            {
              question_id: 'q8',
              answer: `c${Math.floor(Math.random() * 5) + 1}`
            },
            {
              question_id: 'q9',
              answer: paymentWilling === '무료일 때만 사용' ? 'c1' :
                      paymentWilling === '1회 1천 원 ~ 5천 원' ? 'c2' :
                      paymentWilling === '1회 5천 원 ~ 1만 원' ? 'c3' :
                      paymentWilling === '월 구독 (예: 9,900원)' ? 'c4' : 'c5'
            },
            {
              question_id: 'q10',
              answer: Math.random() < 0.4 ? improvements[Math.floor(Math.random() * improvements.length)] : ''
            }
          ].filter(a => a.answer !== ''),
          started_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + Math.random() * 7 * 24 * 60 * 60 * 1000),
          submitted_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + Math.random() * 7 * 24 * 60 * 60 * 1000),
          is_complete: true,
          completion_time: 180 + Math.floor(Math.random() * 240),
          quality_score: 85 + Math.floor(Math.random() * 15),
          response_code: `ZIP${Date.now()}${responseIndex}`
        };

        responses.push(response);
      }
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