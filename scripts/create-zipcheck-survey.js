const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB 연결
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/selfquestion';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB 연결 성공'))
  .catch(err => console.error('MongoDB 연결 실패:', err));

// Survey 모델 불러오기
const Survey = require('../src/models/Survey');

async function createZipCheckSurvey() {
  try {
    // 기존 설문 확인
    const existing = await Survey.findOne({ title: { $regex: '집체크 MVP' } });
    if (existing) {
      console.log('기존 설문이 있습니다:', existing.id);
      await Survey.deleteOne({ _id: existing._id });
      console.log('기존 설문을 삭제했습니다.');
    }

    const surveyData = {
      title: '🏠 집체크 MVP 시장조사 - 안전한 전월세 계약을 위한 부동산 검증 서비스',
      description: '안녕하세요! 전월세 사기 예방 서비스 "집체크"를 준비 중입니다.\n\n여러분의 소중한 의견을 듣고자 설문을 진행합니다.\n설문에 참여해주신 분들께는 서비스 정식 출시 시 3개월 무료 이용권을 드립니다.\n\n📊 현재 참여자: 500명\n⏱️ 예상 소요시간: 3-5분',
      author_nickname: '집체크 서비스팀',
      admin_password: 'zipcheck2024!@#',
      tags: ['시장조사', '부동산', '전세사기', 'MVP', '스타트업'],
      questions: [
        {
          id: 'q1',
          title: '현재 거주 형태는 무엇인가요?',
          type: 'single_choice',
          required: true,
          properties: {
            choices: [
              { id: 'c1', label: '전세' },
              { id: 'c2', label: '월세' },
              { id: 'c3', label: '자가' },
              { id: 'c4', label: '기타', is_other: true }
            ]
          },
          order: 0
        },
        {
          id: 'q2',
          title: '연령대는 어디에 속하시나요?',
          type: 'single_choice',
          required: true,
          properties: {
            choices: [
              { id: 'c1', label: '20대' },
              { id: 'c2', label: '30대' },
              { id: 'c3', label: '40대' },
              { id: 'c4', label: '50대 이상' }
            ]
          },
          order: 1
        },
        {
          id: 'q3',
          title: '전·월세 계약 시 불안하거나 걱정했던 점은 무엇인가요?',
          description: '복수 선택 가능합니다.',
          type: 'multiple_choice',
          required: true,
          properties: {
            choices: [
              { id: 'c1', label: '보증금 떼일까봐' },
              { id: 'c2', label: '집주인 신뢰도' },
              { id: 'c3', label: '등기부 등본 확인이 어려움' },
              { id: 'c4', label: '복잡한 계약 절차' },
              { id: 'c5', label: '기타', is_other: true }
            ]
          },
          order: 2
        },
        {
          id: 'q4',
          title: '혹시 전세사기, 깡통전세, 보증금 문제로 피해를 당하거나 당할 뻔한 경험이 있나요?',
          type: 'single_choice',
          required: true,
          properties: {
            choices: [
              { id: 'c1', label: '있다' },
              { id: 'c2', label: '없다' }
            ]
          },
          order: 3
        },
        {
          id: 'q5',
          title: '전·월세 계약 시 어떤 방법으로 위험성을 확인하시나요?',
          type: 'single_choice',
          required: true,
          properties: {
            choices: [
              { id: 'c1', label: '부동산 중개업소 말만 믿는다' },
              { id: 'c2', label: '인터넷 검색' },
              { id: 'c3', label: '법원/정부 공공데이터 서비스 (예: 안심전세앱)' },
              { id: 'c4', label: '친척·지인 도움' },
              { id: 'c5', label: '스스로 등기부/세금 체납 여부 확인' },
              { id: 'c6', label: '기타', is_other: true }
            ]
          },
          order: 4
        },
        {
          id: 'q6',
          title: '현재 사용하는 방법에 대해 불편하거나 아쉬운 점은 무엇인가요?',
          type: 'long_text',
          required: false,
          properties: {
            max_length: 500
          },
          order: 5
        },
        {
          id: 'q7',
          title: '집체크는 주소 입력만 하면 해당 부동산의 전세사기 위험도, 권리관계, 세금 체납 가능성 등을 분석해주는 서비스입니다. 이런 서비스가 있다면 사용하시겠습니까?',
          type: 'single_choice',
          required: true,
          properties: {
            choices: [
              { id: 'c1', label: '매우 사용하고 싶다' },
              { id: 'c2', label: '어느 정도 관심 있다' },
              { id: 'c3', label: '잘 모르겠다' },
              { id: 'c4', label: '사용하지 않을 것 같다' }
            ]
          },
          order: 6
        },
        {
          id: 'q8',
          title: '해당 서비스를 사용할 때 가장 중요한 요소는 무엇일까요?',
          description: '1순위만 선택해주세요.',
          type: 'single_choice',
          required: true,
          properties: {
            choices: [
              { id: 'c1', label: '정보의 정확성' },
              { id: 'c2', label: '빠른 분석 속도' },
              { id: 'c3', label: '이해하기 쉬운 결과 리포트' },
              { id: 'c4', label: '가격(저렴한 이용료)' },
              { id: 'c5', label: '브랜드 신뢰도' }
            ]
          },
          order: 7
        },
        {
          id: 'q9',
          title: '이 서비스가 유료라면 어느 정도까지 지불할 의향이 있나요?',
          type: 'single_choice',
          required: true,
          properties: {
            choices: [
              { id: 'c1', label: '무료일 때만 사용' },
              { id: 'c2', label: '1회 1천 원 ~ 5천 원' },
              { id: 'c3', label: '1회 5천 원 ~ 1만 원' },
              { id: 'c4', label: '월 구독 (예: 9,900원)' },
              { id: 'c5', label: '기타', is_other: true }
            ]
          },
          order: 8
        },
        {
          id: 'q10',
          title: '집체크 서비스에 바라는 점이나 개선 아이디어가 있다면 자유롭게 적어주세요.',
          type: 'long_text',
          required: false,
          properties: {
            max_length: 1000
          },
          order: 9
        }
      ],
      welcome_screen: {
        title: '집체크 서비스 시장조사에 참여해주셔서 감사합니다!',
        description: '본 설문은 전월세 계약 시 발생할 수 있는 위험을 사전에 예방하는 서비스 개발을 위한 것입니다.',
        button_text: '설문 시작하기',
        show_button: true
      },
      thankyou_screen: {
        title: '소중한 의견 감사합니다! 🙏',
        description: '여러분의 의견을 반영하여 더 안전한 부동산 거래 문화를 만들어가겠습니다.\n\n📧 서비스 출시 소식을 받고 싶으신 분은 zipcheck@example.com으로 이메일을 보내주세요.',
        show_response_count: true
      },
      settings: {
        show_progress_bar: true,
        show_question_number: true,
        allow_back_navigation: true,
        autosave_progress: true,
        close_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      status: 'open',
      is_editable: false,
      stats: {
        response_count: 500,
        completion_rate: 87,
        avg_completion_time: 285,
        last_response_at: new Date()
      },
      first_response_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7일 전
    };

    const survey = new Survey(surveyData);
    await survey.save();

    console.log('\n✅ 집체크 설문이 성공적으로 생성되었습니다!');
    console.log('\n📊 설문 정보:');
    console.log('- 제목:', survey.title);
    console.log('- ID:', survey.id);
    console.log('- 참여자 수:', survey.stats.response_count);
    console.log('- 완성률:', survey.stats.completion_rate + '%');
    console.log('\n🔗 접속 URL:');
    console.log('- 설문 URL: http://localhost:3000/surveys/' + survey.id);
    console.log('- 관리자 URL: http://localhost:3000/surveys/' + survey.id + '/admin');
    console.log('- 관리자 비밀번호: zipcheck2024!@#');

    // 응답 데이터 생성
    await createResponses(survey.id);

    process.exit(0);
  } catch (error) {
    console.error('설문 생성 실패:', error);
    process.exit(1);
  }
}

// 현실적인 응답 데이터 생성
async function createResponses(surveyId) {
  const Response = require('../src/models/Response');
  
  // 기존 응답 삭제
  await Response.deleteMany({ survey_id: surveyId });

  // 연령대별 응답 분포 (20-30대 70%, 40-60대 30%)
  const ageDistribution = {
    '20대': 180,  // 36%
    '30대': 170,  // 34%
    '40대': 90,   // 18%
    '50대 이상': 60 // 12%
  };

  // 거주 형태별 분포
  const livingTypes = {
    '전세': { '20대': 0.45, '30대': 0.40, '40대': 0.25, '50대 이상': 0.15 },
    '월세': { '20대': 0.40, '30대': 0.30, '40대': 0.20, '50대 이상': 0.10 },
    '자가': { '20대': 0.10, '30대': 0.25, '40대': 0.50, '50대 이상': 0.70 },
    '기타': { '20대': 0.05, '30대': 0.05, '40대': 0.05, '50대 이상': 0.05 }
  };

  // 서비스 사용 의향 (연령대별)
  const serviceIntention = {
    '20대': { '매우 사용하고 싶다': 0.65, '어느 정도 관심 있다': 0.25, '잘 모르겠다': 0.08, '사용하지 않을 것 같다': 0.02 },
    '30대': { '매우 사용하고 싶다': 0.58, '어느 정도 관심 있다': 0.30, '잘 모르겠다': 0.10, '사용하지 않을 것 같다': 0.02 },
    '40대': { '매우 사용하고 싶다': 0.45, '어느 정도 관심 있다': 0.35, '잘 모르겠다': 0.15, '사용하지 않을 것 같다': 0.05 },
    '50대 이상': { '매우 사용하고 싶다': 0.35, '어느 정도 관심 있다': 0.40, '잘 모르겠다': 0.20, '사용하지 않을 것 같다': 0.05 }
  };

  const responses = [];
  let responseCount = 0;

  for (const [ageGroup, count] of Object.entries(ageDistribution)) {
    for (let i = 0; i < count; i++) {
      responseCount++;
      
      // 거주 형태 결정
      const livingTypeRand = Math.random();
      let livingType = '전세';
      let cumProb = 0;
      for (const [type, prob] of Object.entries(livingTypes)) {
        cumProb += prob[ageGroup];
        if (livingTypeRand < cumProb) {
          livingType = type;
          break;
        }
      }

      // 피해 경험 (전월세 거주자가 더 높은 확률)
      const hasDamageExperience = livingType === '전세' || livingType === '월세' 
        ? Math.random() < 0.23  // 23%
        : Math.random() < 0.05; // 5%

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

      // 지불 의향 (서비스 사용 의향에 따라)
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

      // 불편사항 텍스트 (일부만)
      const inconveniences = [
        '등기부등본 떼는 것도 복잡하고 봐도 무슨 말인지 모르겠어요',
        '부동산 말만 믿고 계약했다가 나중에 문제 생길까봐 불안합니다',
        '정부 앱은 너무 복잡하고 사용하기 어려워요',
        '여러 사이트를 돌아다니면서 정보를 찾아야 해서 번거롭습니다',
        '전문 용어가 많아서 일반인이 이해하기 어렵습니다',
        '정보가 최신화되지 않아서 신뢰하기 어려워요',
        '매번 수수료 내고 확인하기엔 부담스럽습니다'
      ];

      // 개선 아이디어 (일부만)
      const improvements = [
        '한 번에 모든 정보를 볼 수 있으면 좋겠어요',
        '위험도를 점수로 보여주면 이해하기 쉬울 것 같아요',
        '실시간 알림 기능이 있으면 좋겠습니다',
        '주변 시세 정보도 함께 제공해주세요',
        '실제 피해 사례를 보여주면 더 신뢰할 수 있을 것 같아요',
        'AI가 위험 요소를 자동으로 분석해주면 좋겠어요',
        '모바일 앱으로도 쉽게 확인할 수 있게 해주세요'
      ];

      const response = {
        survey_id: surveyId,
        respondent_ip_hash: `hash_${responseCount}`,
        respondent_ip: `192.168.${Math.floor(responseCount / 255)}.${responseCount % 255}`,
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
            answer: ['c1', 'c2'].concat(Math.random() < 0.3 ? ['c3'] : []).concat(Math.random() < 0.2 ? ['c4'] : [])
          },
          {
            question_id: 'q4',
            answer: hasDamageExperience ? 'c1' : 'c2'
          },
          {
            question_id: 'q5',
            answer: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'][Math.floor(Math.random() * 6)]
          },
          {
            question_id: 'q6',
            answer: Math.random() < 0.6 ? inconveniences[Math.floor(Math.random() * inconveniences.length)] : null
          },
          {
            question_id: 'q7',
            answer: useIntention === '매우 사용하고 싶다' ? 'c1' : 
                    useIntention === '어느 정도 관심 있다' ? 'c2' :
                    useIntention === '잘 모르겠다' ? 'c3' : 'c4'
          },
          {
            question_id: 'q8',
            answer: ['c1', 'c2', 'c3', 'c4', 'c5'][Math.floor(Math.random() * 5)]
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
            answer: Math.random() < 0.4 ? improvements[Math.floor(Math.random() * improvements.length)] : null
          }
        ].filter(a => a.answer !== null),
        started_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + Math.random() * 7 * 24 * 60 * 60 * 1000),
        submitted_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + Math.random() * 7 * 24 * 60 * 60 * 1000),
        is_complete: true,
        completion_time: 180 + Math.floor(Math.random() * 240), // 3-7분
        quality_score: 85 + Math.floor(Math.random() * 15)
      };

      responses.push(response);
    }
  }

  // 응답 저장
  await Response.insertMany(responses);
  console.log(`\n✅ ${responses.length}개의 응답 데이터가 생성되었습니다!`);
}

// 실행
createZipCheckSurvey();