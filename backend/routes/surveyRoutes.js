const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { body, param, query, validationResult } = require('express-validator');
const Survey = require('../models/Survey');
const Response = require('../models/Response');
const { authenticateAdmin } = require('../middleware/auth');
const { generateSurveyUrls } = require('../utils/urlGenerator');
const { sanitizeHtml } = require('../utils/sanitizer');

// 설문 생성 유효성 검사
const createSurveyValidation = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('제목은 1-200자 사이여야 합니다'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('설명은 2000자를 초과할 수 없습니다'),
  body('admin_password').isLength({ min: 8 }).withMessage('비밀번호는 8자 이상이어야 합니다'),
  body('questions').isArray({ min: 1 }).withMessage('최소 1개 이상의 질문이 필요합니다'),
  body('questions.*.title').trim().isLength({ min: 1, max: 500 }).withMessage('질문 제목은 1-500자 사이여야 합니다'),
  body('questions.*.type').isIn(['single_choice', 'multiple_choice', 'short_text', 'long_text', 'rating']),
  body('tags').optional().isArray({ max: 5 }).withMessage('태그는 최대 5개까지 가능합니다'),
  body('author_nickname').optional().trim().isLength({ max: 50 })
];

// 설문 생성
router.post('/create', createSurveyValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      admin_password,
      questions,
      tags,
      author_nickname,
      welcome_screen,
      thankyou_screen,
      settings
    } = req.body;

    // 질문 순서 정렬 및 ID 생성
    const processedQuestions = questions.map((q, index) => ({
      ...q,
      order: index,
      title: sanitizeHtml(q.title),
      properties: {
        ...q.properties,
        choices: q.properties?.choices?.map(choice => ({
          ...choice,
          label: sanitizeHtml(choice.label)
        }))
      }
    }));

    // 설문 생성
    const survey = new Survey({
      title: sanitizeHtml(title),
      description: description ? sanitizeHtml(description) : undefined,
      admin_password_hash: admin_password,
      questions: processedQuestions,
      tags: tags?.map(tag => sanitizeHtml(tag)),
      author_nickname: author_nickname ? sanitizeHtml(author_nickname) : undefined,
      creator_ip: req.clientIp,
      welcome_screen: welcome_screen ? {
        ...welcome_screen,
        title: sanitizeHtml(welcome_screen.title),
        description: welcome_screen.description ? sanitizeHtml(welcome_screen.description) : undefined
      } : undefined,
      thankyou_screen: thankyou_screen ? {
        ...thankyou_screen,
        title: sanitizeHtml(thankyou_screen.title),
        description: thankyou_screen.description ? sanitizeHtml(thankyou_screen.description) : undefined
      } : undefined,
      settings: {
        ...settings,
        show_progress_bar: settings?.show_progress_bar !== false,
        show_question_number: settings?.show_question_number !== false,
        allow_back_navigation: settings?.allow_back_navigation !== false
      }
    });

    // URL 생성
    const { publicUrl, adminUrl } = generateSurveyUrls(survey.id);
    survey.public_url = publicUrl;
    survey.admin_url = adminUrl;

    await survey.save();

    // 관리자 토큰 생성
    const adminToken = survey.generateAdminToken();
    await survey.save();

    res.status(201).json({
      success: true,
      data: {
        id: survey.id,
        public_url: publicUrl,
        admin_url: adminUrl,
        admin_token: adminToken,
        created_at: survey.created_at
      }
    });
  } catch (error) {
    console.error('설문 생성 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '설문 생성 중 오류가 발생했습니다' 
    });
  }
});

// 설문 목록 조회
router.get('/',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['draft', 'open', 'closed']),
  query('tag').optional().trim(),
  query('sort').optional().isIn(['latest', 'popular', 'closing']),
  query('search').optional().trim(),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        tag,
        sort = 'latest',
        search
      } = req.query;

      // 기본 쿼리 조건
      const query = {
        is_deleted: false,
        is_hidden: false
      };

      // 상태 필터
      if (status) {
        query.status = status;
      }

      // 태그 필터
      if (tag) {
        query.tags = tag;
      }

      // 검색 (제목, 설명)
      if (search) {
        query.$text = { $search: search };
      }

      // 정렬 옵션
      let sortOption = {};
      switch (sort) {
        case 'popular':
          sortOption = { 'stats.response_count': -1 };
          break;
        case 'closing':
          query.status = 'open';
          query['settings.close_at'] = { $exists: true };
          sortOption = { 'settings.close_at': 1 };
          break;
        default: // latest
          sortOption = { created_at: -1 };
      }

      // 전체 개수
      const total = await Survey.countDocuments(query);

      // 페이지네이션
      const skip = (page - 1) * limit;
      
      const surveys = await Survey.find(query)
        .select('-admin_password_hash -admin_token -admin_token_expires -creator_ip')
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      res.json({
        success: true,
        data: {
          surveys: surveys.map(survey => ({
            ...survey,
            response_count: survey.stats?.response_count || 0
          })),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            total_pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('설문 목록 조회 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: '설문 목록 조회 중 오류가 발생했습니다' 
      });
    }
  }
);

// 설문 조회 (공개용)
router.get('/:surveyId', 
  param('surveyId').isAlphanumeric().isLength({ min: 16, max: 16 }),
  async (req, res) => {
    try {
      const { surveyId } = req.params;
      
      const survey = await Survey.findOne({ 
        id: surveyId,
        is_deleted: false 
      }).select('-admin_password_hash -admin_token -admin_token_expires -creator_ip');

      if (!survey) {
        return res.status(404).json({ 
          success: false, 
          error: '설문을 찾을 수 없습니다' 
        });
      }

      // 조회수 증가
      survey.stats.view_count += 1;
      await survey.save();

      // IP 중복 체크
      const hasResponded = await Response.findOne({
        survey_id: surveyId,
        respondent_ip: req.clientIp,
        is_deleted: false
      });

      res.json({
        success: true,
        data: {
          survey: survey.toObject({ virtuals: true }),
          can_respond: !hasResponded && survey.canReceiveResponse(),
          has_responded: !!hasResponded,
          is_closed: survey.is_closed
        }
      });
    } catch (error) {
      console.error('설문 조회 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: '설문 조회 중 오류가 발생했습니다' 
      });
    }
  }
);

// 관리자 비밀번호 확인
router.post('/:surveyId/verify',
  param('surveyId').isAlphanumeric().isLength({ min: 16, max: 16 }),
  body('admin_password').notEmpty().withMessage('비밀번호를 입력해주세요'),
  async (req, res) => {
    try {
      const { surveyId } = req.params;
      const { admin_password } = req.body;

      const survey = await Survey.findOne({ 
        id: surveyId,
        is_deleted: false 
      });

      if (!survey) {
        return res.status(404).json({ 
          success: false, 
          error: '설문을 찾을 수 없습니다' 
        });
      }

      // 비밀번호 확인
      const isValid = await survey.validatePassword(admin_password);
      if (!isValid) {
        return res.status(401).json({ 
          success: false, 
          error: '비밀번호가 올바르지 않습니다' 
        });
      }

      // 관리자 토큰 생성
      const adminToken = survey.generateAdminToken();
      await survey.save();

      res.json({
        success: true,
        message: '인증되었습니다',
        data: {
          admin_token: adminToken
        }
      });
    } catch (error) {
      console.error('관리자 인증 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: '인증 중 오류가 발생했습니다' 
      });
    }
  }
);

// 설문 수정
router.put('/:surveyId', 
  authenticateAdmin,
  param('surveyId').isAlphanumeric().isLength({ min: 16, max: 16 }),
  async (req, res) => {
    try {
      const { surveyId } = req.params;
      const survey = req.survey; // authenticateAdmin 미들웨어에서 설정

      if (!survey.canEdit()) {
        return res.status(403).json({ 
          success: false, 
          error: '첫 응답 이후에는 설문을 수정할 수 없습니다' 
        });
      }

      const allowedUpdates = [
        'title', 'description', 'questions', 'tags', 
        'author_nickname', 'welcome_screen', 'thankyou_screen', 'settings'
      ];

      const updates = {};
      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      // 입력값 정제
      if (updates.title) updates.title = sanitizeHtml(updates.title);
      if (updates.description) updates.description = sanitizeHtml(updates.description);
      if (updates.questions) {
        updates.questions = updates.questions.map((q, index) => ({
          ...q,
          order: index,
          title: sanitizeHtml(q.title)
        }));
      }

      Object.assign(survey, updates);
      await survey.save();

      res.json({
        success: true,
        data: survey
      });
    } catch (error) {
      console.error('설문 수정 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: '설문 수정 중 오류가 발생했습니다' 
      });
    }
  }
);

// 설문 상태 변경 (열기/닫기)
router.patch('/:surveyId/status', 
  authenticateAdmin,
  param('surveyId').isAlphanumeric().isLength({ min: 16, max: 16 }),
  body('status').isIn(['open', 'closed']),
  async (req, res) => {
    try {
      const { status } = req.body;
      const survey = req.survey;

      survey.status = status;
      await survey.save();

      res.json({
        success: true,
        data: {
          id: survey.id,
          status: survey.status,
          updated_at: survey.updated_at
        }
      });
    } catch (error) {
      console.error('설문 상태 변경 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: '설문 상태 변경 중 오류가 발생했습니다' 
      });
    }
  }
);

// 설문 응답 제출
router.post('/:surveyId/respond',
  param('surveyId').isAlphanumeric().isLength({ min: 16, max: 16 }),
  body('answers').isArray({ min: 1 }).withMessage('답변이 필요합니다'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { surveyId } = req.params;
      const { answers } = req.body;

      // 설문 조회
      const survey = await Survey.findOne({ 
        id: surveyId,
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
        return res.status(400).json({ 
          success: false, 
          error: '이 설문은 현재 응답을 받지 않습니다' 
        });
      }

      // IP 중복 체크
      const existingResponse = await Response.findOne({
        survey_id: surveyId,
        respondent_ip: req.clientIp,
        is_deleted: false
      });

      if (existingResponse) {
        return res.status(400).json({ 
          success: false, 
          error: '이미 이 설문에 응답하셨습니다' 
        });
      }

      // 답변 데이터 변환
      const processedAnswers = answers.map(answer => {
        const question = survey.questions.find(q => q.id === answer.question_id);
        if (!question) {
          throw new Error(`질문을 찾을 수 없습니다: ${answer.question_id}`);
        }

        const processedAnswer = {
          question_id: answer.question_id,
          question_type: question.type,
          answered_at: new Date()
        };

        // 타입별 답변 처리
        switch (question.type) {
          case 'single_choice':
            processedAnswer.choice_id = answer.answer;
            break;
          case 'multiple_choice':
            processedAnswer.choice_ids = answer.answer;
            break;
          case 'short_text':
          case 'long_text':
            processedAnswer.text = answer.answer;
            break;
          case 'rating':
            processedAnswer.rating = answer.answer;
            break;
        }

        return processedAnswer;
      });

      // IP 해시 생성
      const ipHash = crypto.createHash('sha256').update(req.clientIp).digest('hex');
      
      // 응답 생성
      const startTime = new Date(Date.now() - 60000); // 임시로 1분 전으로 설정
      const submitTime = new Date();
      
      const response = new Response({
        survey_id: surveyId,
        survey_ref: survey._id,
        respondent_ip: req.clientIp,
        respondent_ip_hash: ipHash,
        user_agent: req.get('user-agent'),
        answers: processedAnswers,
        started_at: startTime,
        submitted_at: submitTime,
        completion_time: Math.floor((submitTime - startTime) / 1000) // 초 단위
      });

      // 품질 점수 계산
      response.calculateQualityScore();

      await response.save();

      // 설문 통계 업데이트
      survey.stats.response_count += 1;
      survey.stats.last_response_at = new Date();
      if (!survey.first_response_at) {
        survey.first_response_at = new Date();
        survey.is_editable = false;
      }
      await survey.save();

      res.status(201).json({
        success: true,
        message: '설문 응답이 제출되었습니다',
        data: {
          response_code: response.response_code
        }
      });
    } catch (error) {
      console.error('설문 응답 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: '설문 응답 중 오류가 발생했습니다' 
      });
    }
  }
);

// 설문 결과 조회
router.get('/:surveyId/results',
  param('surveyId').isAlphanumeric().isLength({ min: 16, max: 16 }),
  async (req, res) => {
    try {
      const { surveyId } = req.params;

      const survey = await Survey.findOne({ 
        id: surveyId,
        is_deleted: false 
      }).select('-admin_password_hash -admin_token -creator_ip');

      if (!survey) {
        return res.status(404).json({ 
          success: false, 
          error: '설문을 찾을 수 없습니다' 
        });
      }

      // 기본 통계 계산
      const responses = await Response.find({
        survey_id: surveyId,
        is_deleted: false,
        is_complete: true
      });

      const stats = {
        total_responses: responses.length,
        completion_rate: survey.stats.completion_rate,
        question_stats: {}
      };

      // 질문별 통계
      survey.questions.forEach(question => {
        const questionStats = {
          type: question.type,
          response_count: 0
        };

        if (question.type === 'single_choice' || question.type === 'multiple_choice') {
          questionStats.options = {};
          question.properties.choices.forEach(choice => {
            questionStats.options[choice.id] = 0;
          });
        } else if (question.type === 'rating') {
          questionStats.sum = 0;
          questionStats.average = 0;
        } else if (question.type === 'short_text' || question.type === 'long_text') {
          questionStats.responses = [];
        }

        responses.forEach(response => {
          const answer = response.answers.find(a => a.question_id === question.id);
          if (answer) {
            questionStats.response_count++;
            
            if (question.type === 'single_choice' && answer.choice_id) {
              questionStats.options[answer.choice_id]++;
            } else if (question.type === 'multiple_choice' && answer.choice_ids) {
              answer.choice_ids.forEach(choiceId => {
                questionStats.options[choiceId]++;
              });
            } else if (question.type === 'rating' && answer.rating) {
              questionStats.sum += answer.rating;
            } else if ((question.type === 'short_text' || question.type === 'long_text') && answer.text) {
              questionStats.responses.push(answer.text);
            }
          }
        });

        if (question.type === 'rating' && questionStats.response_count > 0) {
          questionStats.average = questionStats.sum / questionStats.response_count;
        }

        stats.question_stats[question.id] = questionStats;
      });

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('설문 결과 조회 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: '설문 결과 조회 중 오류가 발생했습니다' 
      });
    }
  }
);

// 설문 삭제 (소프트 삭제)
router.delete('/:surveyId', 
  authenticateAdmin,
  param('surveyId').isAlphanumeric().isLength({ min: 16, max: 16 }),
  async (req, res) => {
    try {
      const survey = req.survey;

      survey.is_deleted = true;
      survey.status = 'closed';
      await survey.save();

      res.json({
        success: true,
        message: '설문이 삭제되었습니다'
      });
    } catch (error) {
      console.error('설문 삭제 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: '설문 삭제 중 오류가 발생했습니다' 
      });
    }
  }
);

module.exports = router;