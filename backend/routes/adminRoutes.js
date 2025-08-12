const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const Survey = require('../models/Survey');
const Response = require('../models/Response');
const { authenticateAdmin } = require('../middleware/auth');
const { generateCSV } = require('../utils/csvGenerator');
const { generateStatistics } = require('../utils/statisticsGenerator');

// 관리자 로그인
router.post('/login/:surveyId', 
  param('surveyId').isAlphanumeric().isLength({ min: 16, max: 16 }),
  body('password').notEmpty().withMessage('비밀번호를 입력해주세요'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { surveyId } = req.params;
      const { password } = req.body;

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

      // 비밀번호 검증
      const isValid = await survey.validatePassword(password);
      if (!isValid) {
        return res.status(401).json({ 
          success: false, 
          error: '비밀번호가 일치하지 않습니다' 
        });
      }

      // 관리자 토큰 생성
      const adminToken = survey.generateAdminToken();
      await survey.save();

      res.json({
        success: true,
        data: {
          admin_token: adminToken,
          expires_at: survey.admin_token_expires,
          survey: {
            id: survey.id,
            title: survey.title,
            status: survey.status,
            stats: survey.stats,
            is_editable: survey.canEdit()
          }
        }
      });
    } catch (error) {
      console.error('관리자 로그인 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: '로그인 처리 중 오류가 발생했습니다' 
      });
    }
  }
);

// 설문 통계 조회
router.get('/:surveyId/statistics', 
  authenticateAdmin,
  async (req, res) => {
    try {
      const survey = req.survey;

      // 응답 데이터 조회
      const responses = await Response.find({
        survey_id: survey.id,
        is_deleted: false,
        is_complete: true
      }).sort('-created_at');

      // 통계 생성
      const statistics = await generateStatistics(survey, responses);

      res.json({
        success: true,
        data: {
          survey: {
            id: survey.id,
            title: survey.title,
            created_at: survey.created_at,
            status: survey.status
          },
          statistics
        }
      });
    } catch (error) {
      console.error('통계 조회 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: '통계 조회 중 오류가 발생했습니다' 
      });
    }
  }
);

// 응답 목록 조회
router.get('/:surveyId/responses', 
  authenticateAdmin,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sort').optional().isIn(['created_at', '-created_at', 'completion_time', '-completion_time']),
  query('quality_score_min').optional().isInt({ min: 0, max: 100 }),
  async (req, res) => {
    try {
      const survey = req.survey;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const sort = req.query.sort || '-created_at';
      const qualityScoreMin = parseInt(req.query.quality_score_min) || 0;

      const query = {
        survey_id: survey.id,
        is_deleted: false,
        quality_score: { $gte: qualityScoreMin }
      };

      const totalCount = await Response.countDocuments(query);
      const totalPages = Math.ceil(totalCount / limit);

      const responses = await Response.find(query)
        .sort(sort)
        .limit(limit)
        .skip((page - 1) * limit)
        .select('-respondent_ip');

      // 응답 익명화
      const anonymizedResponses = responses.map(r => r.anonymize());

      res.json({
        success: true,
        data: {
          responses: anonymizedResponses,
          pagination: {
            current_page: page,
            total_pages: totalPages,
            total_count: totalCount,
            per_page: limit
          }
        }
      });
    } catch (error) {
      console.error('응답 목록 조회 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: '응답 목록 조회 중 오류가 발생했습니다' 
      });
    }
  }
);

// 응답 상세 조회
router.get('/:surveyId/responses/:responseId', 
  authenticateAdmin,
  param('responseId').isAlphanumeric(),
  async (req, res) => {
    try {
      const { surveyId, responseId } = req.params;

      const response = await Response.findOne({
        id: responseId,
        survey_id: surveyId,
        is_deleted: false
      });

      if (!response) {
        return res.status(404).json({ 
          success: false, 
          error: '응답을 찾을 수 없습니다' 
        });
      }

      // 익명화된 응답 반환
      const anonymizedResponse = response.anonymize();

      res.json({
        success: true,
        data: anonymizedResponse
      });
    } catch (error) {
      console.error('응답 상세 조회 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: '응답 조회 중 오류가 발생했습니다' 
      });
    }
  }
);

// 응답 삭제
router.delete('/:surveyId/responses/:responseId', 
  authenticateAdmin,
  param('responseId').isAlphanumeric(),
  async (req, res) => {
    try {
      const { surveyId, responseId } = req.params;

      const response = await Response.findOne({
        id: responseId,
        survey_id: surveyId,
        is_deleted: false
      });

      if (!response) {
        return res.status(404).json({ 
          success: false, 
          error: '응답을 찾을 수 없습니다' 
        });
      }

      // 소프트 삭제
      response.is_deleted = true;
      response.deleted_by = 'admin';
      response.deleted_at = new Date();
      await response.save();

      // 통계 업데이트
      const survey = req.survey;
      survey.stats.response_count = Math.max(0, survey.stats.response_count - 1);
      await survey.save();

      res.json({
        success: true,
        message: '응답이 삭제되었습니다'
      });
    } catch (error) {
      console.error('응답 삭제 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: '응답 삭제 중 오류가 발생했습니다' 
      });
    }
  }
);

// CSV 다운로드
router.get('/:surveyId/export/csv', 
  authenticateAdmin,
  query('include_metadata').optional().isBoolean(),
  query('include_deleted').optional().isBoolean(),
  async (req, res) => {
    try {
      const survey = req.survey;
      const includeMetadata = req.query.include_metadata === 'true';
      const includeDeleted = req.query.include_deleted === 'true';

      const query = {
        survey_id: survey.id
      };
      if (!includeDeleted) {
        query.is_deleted = false;
      }

      const responses = await Response.find(query).sort('created_at');

      // CSV 생성
      const csv = await generateCSV(survey, responses, {
        includeMetadata,
        includeDeleted
      });

      const filename = `survey_${survey.id}_responses_${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send('\ufeff' + csv); // BOM 추가 (한글 엑셀 호환)
    } catch (error) {
      console.error('CSV 다운로드 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: 'CSV 생성 중 오류가 발생했습니다' 
      });
    }
  }
);

// IP 제한 해제
router.post('/:surveyId/unlock-ip', 
  authenticateAdmin,
  body('ip').isIP(),
  async (req, res) => {
    try {
      const { surveyId } = req.params;
      const { ip } = req.body;

      // 해당 IP의 응답 찾기
      const response = await Response.findOne({
        survey_id: surveyId,
        respondent_ip: ip,
        is_deleted: false
      });

      if (!response) {
        return res.status(404).json({ 
          success: false, 
          error: '해당 IP의 응답을 찾을 수 없습니다' 
        });
      }

      // 응답 삭제로 IP 제한 해제
      response.is_deleted = true;
      response.deleted_by = 'admin';
      response.deleted_at = new Date();
      await response.save();

      res.json({
        success: true,
        message: 'IP 제한이 해제되었습니다'
      });
    } catch (error) {
      console.error('IP 제한 해제 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: 'IP 제한 해제 중 오류가 발생했습니다' 
      });
    }
  }
);

// 설문 설정 업데이트
router.patch('/:surveyId/settings', 
  authenticateAdmin,
  async (req, res) => {
    try {
      const survey = req.survey;
      const allowedSettings = [
        'response_limit', 'close_at', 'show_progress_bar', 
        'show_question_number', 'allow_back_navigation'
      ];

      const updates = {};
      allowedSettings.forEach(setting => {
        if (req.body[setting] !== undefined) {
          updates[setting] = req.body[setting];
        }
      });

      Object.assign(survey.settings, updates);
      await survey.save();

      res.json({
        success: true,
        data: {
          settings: survey.settings,
          updated_at: survey.updated_at
        }
      });
    } catch (error) {
      console.error('설정 업데이트 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: '설정 업데이트 중 오류가 발생했습니다' 
      });
    }
  }
);

module.exports = router;