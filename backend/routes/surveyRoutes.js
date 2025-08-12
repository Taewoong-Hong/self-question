const express = require('express');
const router = express.Router();
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