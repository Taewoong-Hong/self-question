const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const Survey = require('../models/Survey');
const Response = require('../models/Response');
const { parseUserAgent } = require('../utils/userAgent');
const { checkResponseQuality } = require('../utils/qualityChecker');

// 응답 제출 유효성 검사
const submitResponseValidation = [
  body('survey_id').isAlphanumeric().isLength({ min: 16, max: 16 }),
  body('answers').isArray({ min: 1 }).withMessage('답변이 필요합니다'),
  body('answers.*.question_id').notEmpty(),
  body('answers.*.question_type').isIn(['single_choice', 'multiple_choice', 'short_text', 'long_text', 'rating']),
  body('started_at').isISO8601().toDate(),
  body('time_tracking').optional().isObject()
];

// 응답 제출
router.post('/submit', submitResponseValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      survey_id, 
      answers, 
      started_at,
      time_tracking,
      progress_data 
    } = req.body;

    // 설문 확인
    const survey = await Survey.findOne({ 
      id: survey_id, 
      is_deleted: false 
    });

    if (!survey) {
      return res.status(404).json({ 
        success: false, 
        error: '설문을 찾을 수 없습니다' 
      });
    }

    // 응답 가능 여부 확인
    if (!survey.canReceiveResponse()) {
      return res.status(403).json({ 
        success: false, 
        error: '이 설문은 현재 응답을 받지 않습니다' 
      });
    }

    // IP 중복 확인
    const existingResponse = await Response.findOne({
      survey_id: survey_id,
      respondent_ip: req.clientIp,
      is_deleted: false
    });

    if (existingResponse) {
      return res.status(409).json({ 
        success: false, 
        error: '이미 응답하신 설문입니다',
        response_code: existingResponse.response_code
      });
    }

    // 답변 검증 및 정제
    const validatedAnswers = [];
    const questionMap = new Map(survey.questions.map(q => [q.id, q]));

    for (const answer of answers) {
      const question = questionMap.get(answer.question_id);
      if (!question) continue;

      // 필수 질문 검증
      if (question.required && !isAnswerProvided(answer, question.type)) {
        return res.status(400).json({ 
          success: false, 
          error: `필수 질문에 답변해주세요: ${question.title}` 
        });
      }

      // 답변 타입별 검증
      const validatedAnswer = validateAnswer(answer, question);
      if (validatedAnswer.error) {
        return res.status(400).json({ 
          success: false, 
          error: validatedAnswer.error 
        });
      }

      validatedAnswers.push({
        ...validatedAnswer.data,
        time_spent: time_tracking?.[answer.question_id] || 0
      });
    }

    // 사용자 에이전트 파싱
    const userAgentInfo = parseUserAgent(req.headers['user-agent']);

    // 응답 생성
    const response = new Response({
      survey_id: survey.id,
      survey_ref: survey._id,
      respondent_ip: req.clientIp,
      user_agent: req.headers['user-agent'],
      browser: userAgentInfo.browser,
      device_type: userAgentInfo.deviceType,
      answers: validatedAnswers,
      started_at: started_at,
      submitted_at: new Date(),
      referrer: req.headers.referer,
      utm_source: req.query.utm_source,
      utm_medium: req.query.utm_medium,
      utm_campaign: req.query.utm_campaign
    });

    // 품질 점수 계산
    response.calculateQualityScore();

    // 의심스러운 응답 체크
    const qualityIssues = checkResponseQuality(response, survey);
    if (qualityIssues.length > 0) {
      response.quality_flags = response.quality_flags.concat(qualityIssues);
    }

    await response.save();

    // 설문 통계 업데이트
    survey.stats.response_count += 1;
    survey.stats.last_response_at = new Date();
    
    // 첫 응답인 경우
    if (!survey.first_response_at) {
      survey.first_response_at = new Date();
      survey.is_editable = false;
    }

    // 완료율 계산
    const totalResponses = await Response.countDocuments({ 
      survey_id: survey.id,
      is_deleted: false 
    });
    const completeResponses = await Response.countDocuments({ 
      survey_id: survey.id,
      is_complete: true,
      is_deleted: false 
    });
    survey.stats.completion_rate = Math.round((completeResponses / totalResponses) * 100);

    // 평균 완료 시간 계산
    const avgTime = await Response.aggregate([
      { $match: { survey_id: survey.id, is_complete: true, is_deleted: false } },
      { $group: { _id: null, avg_time: { $avg: '$completion_time' } } }
    ]);
    if (avgTime.length > 0) {
      survey.stats.avg_completion_time = Math.round(avgTime[0].avg_time);
    }

    await survey.save();

    res.status(201).json({
      success: true,
      data: {
        response_code: response.response_code,
        completion_time: response.completion_time,
        quality_score: response.quality_score,
        thankyou_screen: survey.thankyou_screen
      }
    });
  } catch (error) {
    console.error('응답 제출 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '응답 제출 중 오류가 발생했습니다' 
    });
  }
});

// 응답 진행 상황 저장 (자동 저장)
router.post('/save-progress', async (req, res) => {
  try {
    const { 
      survey_id, 
      current_question_index, 
      saved_answers 
    } = req.body;

    // 기존 세션 확인 또는 생성
    const sessionKey = `survey_progress_${survey_id}_${req.clientIp}`;
    
    // Redis나 메모리 캐시에 저장 (실제 구현에서는 Redis 사용 권장)
    // 여기서는 간단히 응답으로 처리
    res.json({
      success: true,
      data: {
        saved: true,
        session_key: sessionKey
      }
    });
  } catch (error) {
    console.error('진행 상황 저장 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '진행 상황 저장 중 오류가 발생했습니다' 
    });
  }
});

// 응답 조회 (응답 코드로)
router.get('/code/:responseCode', 
  param('responseCode').isAlphanumeric().isLength({ min: 8, max: 8 }),
  async (req, res) => {
    try {
      const { responseCode } = req.params;

      const response = await Response.findOne({ 
        response_code: responseCode.toUpperCase(),
        is_deleted: false
      }).populate('survey_ref', 'title thankyou_screen');

      if (!response) {
        return res.status(404).json({ 
          success: false, 
          error: '응답을 찾을 수 없습니다' 
        });
      }

      // 개인정보 제거
      const anonymizedResponse = response.anonymize();

      res.json({
        success: true,
        data: {
          response_code: response.response_code,
          survey_title: response.survey_ref.title,
          submitted_at: response.submitted_at,
          completion_time: response.completion_time,
          thankyou_screen: response.survey_ref.thankyou_screen
        }
      });
    } catch (error) {
      console.error('응답 조회 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: '응답 조회 중 오류가 발생했습니다' 
      });
    }
  }
);

// 헬퍼 함수들
function isAnswerProvided(answer, questionType) {
  switch (questionType) {
    case 'single_choice':
      return !!answer.choice_id;
    case 'multiple_choice':
      return answer.choice_ids && answer.choice_ids.length > 0;
    case 'short_text':
    case 'long_text':
      return answer.text && answer.text.trim().length > 0;
    case 'rating':
      return answer.rating !== undefined && answer.rating !== null;
    default:
      return false;
  }
}

function validateAnswer(answer, question) {
  const validated = {
    question_id: answer.question_id,
    question_type: answer.question_type
  };

  try {
    switch (question.type) {
      case 'single_choice':
        const validChoiceIds = question.properties.choices.map(c => c.id);
        if (!validChoiceIds.includes(answer.choice_id)) {
          return { error: '유효하지 않은 선택입니다' };
        }
        validated.choice_id = answer.choice_id;
        break;

      case 'multiple_choice':
        const validMultiChoiceIds = question.properties.choices.map(c => c.id);
        const invalidChoices = answer.choice_ids.filter(id => !validMultiChoiceIds.includes(id));
        if (invalidChoices.length > 0) {
          return { error: '유효하지 않은 선택이 포함되어 있습니다' };
        }
        if (question.properties.max_selection && answer.choice_ids.length > question.properties.max_selection) {
          return { error: `최대 ${question.properties.max_selection}개까지 선택 가능합니다` };
        }
        if (question.properties.min_selection && answer.choice_ids.length < question.properties.min_selection) {
          return { error: `최소 ${question.properties.min_selection}개 이상 선택해야 합니다` };
        }
        validated.choice_ids = answer.choice_ids;
        break;

      case 'short_text':
        if (question.validations?.max_characters && answer.text.length > question.validations.max_characters) {
          return { error: `최대 ${question.validations.max_characters}자까지 입력 가능합니다` };
        }
        validated.text = answer.text.trim();
        break;

      case 'long_text':
        if (question.validations?.max_characters && answer.text.length > question.validations.max_characters) {
          return { error: `최대 ${question.validations.max_characters}자까지 입력 가능합니다` };
        }
        validated.text = answer.text.trim();
        break;

      case 'rating':
        const maxRating = question.properties.rating_scale || 5;
        if (answer.rating < 1 || answer.rating > maxRating) {
          return { error: `평점은 1-${maxRating} 사이여야 합니다` };
        }
        validated.rating = answer.rating;
        break;
    }

    return { data: validated };
  } catch (error) {
    return { error: '답변 검증 중 오류가 발생했습니다' };
  }
}

module.exports = router;