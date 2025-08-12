const express = require('express');
const router = express.Router();
const { query, body, validationResult } = require('express-validator');
const Survey = require('../models/Survey');
const { calculateTimeAgo } = require('../utils/timeHelpers');

// 게시판 목록 조회
router.get('/surveys', 
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('sort').optional().isIn(['latest', 'popular', 'responses']),
  query('status').optional().isIn(['open', 'closed', 'all']),
  query('tags').optional().isString(),
  query('search').optional().isString().trim(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const sortType = req.query.sort || 'latest';
      const statusFilter = req.query.status || 'all';
      const tags = req.query.tags ? req.query.tags.split(',') : [];
      const searchQuery = req.query.search;

      // 쿼리 구성
      const query = {
        is_hidden: false,
        is_deleted: false
      };

      // 상태 필터
      if (statusFilter === 'open') {
        query.status = 'open';
        // 추가 조건: 응답 제한 및 마감일 체크
        query.$and = [
          {
            $or: [
              { 'settings.response_limit': { $exists: false } },
              { $expr: { $lt: ['$stats.response_count', '$settings.response_limit'] } }
            ]
          },
          {
            $or: [
              { 'settings.close_at': { $exists: false } },
              { 'settings.close_at': { $gt: new Date() } }
            ]
          }
        ];
      } else if (statusFilter === 'closed') {
        query.$or = [
          { status: 'closed' },
          { $expr: { $gte: ['$stats.response_count', '$settings.response_limit'] } },
          { 'settings.close_at': { $lte: new Date() } }
        ];
      }

      // 태그 필터
      if (tags.length > 0) {
        query.tags = { $in: tags };
      }

      // 검색
      if (searchQuery) {
        query.$text = { $search: searchQuery };
      }

      // 정렬 옵션
      let sortOption = {};
      switch (sortType) {
        case 'popular':
          sortOption = { 'stats.view_count': -1, created_at: -1 };
          break;
        case 'responses':
          sortOption = { 'stats.response_count': -1, created_at: -1 };
          break;
        case 'latest':
        default:
          sortOption = { created_at: -1 };
      }

      // 전체 개수 조회
      const totalCount = await Survey.countDocuments(query);
      const totalPages = Math.ceil(totalCount / limit);

      // 설문 목록 조회
      const surveys = await Survey.find(query)
        .select('id title description tags author_nickname status stats created_at settings welcome_screen')
        .sort(sortOption)
        .limit(limit)
        .skip((page - 1) * limit);

      // 응답 데이터 포맷팅
      const formattedSurveys = surveys.map(survey => {
        const isOpen = survey.canReceiveResponse();
        const timeAgo = calculateTimeAgo(survey.created_at);
        
        return {
          id: survey.id,
          title: survey.title,
          description: survey.description ? 
            survey.description.substring(0, 150) + (survey.description.length > 150 ? '...' : '') : 
            null,
          tags: survey.tags || [],
          author: survey.author_nickname || '익명',
          status: isOpen ? 'open' : 'closed',
          is_closed: !isOpen,
          stats: {
            response_count: survey.stats.response_count,
            view_count: survey.stats.view_count,
            completion_rate: survey.stats.completion_rate
          },
          response_limit: survey.settings?.response_limit,
          close_at: survey.settings?.close_at,
          created_at: survey.created_at,
          time_ago: timeAgo,
          public_url: survey.public_url,
          has_welcome_screen: !!survey.welcome_screen?.title
        };
      });

      // 인기 태그 조회 (캐시 권장)
      const popularTags = await Survey.aggregate([
        { $match: { is_hidden: false, is_deleted: false, status: 'open' } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { tag: '$_id', count: 1, _id: 0 } }
      ]);

      res.json({
        success: true,
        data: {
          surveys: formattedSurveys,
          pagination: {
            current_page: page,
            total_pages: totalPages,
            total_count: totalCount,
            per_page: limit,
            has_next: page < totalPages,
            has_prev: page > 1
          },
          popular_tags: popularTags,
          filters: {
            status: statusFilter,
            tags: tags,
            sort: sortType,
            search: searchQuery
          }
        }
      });
    } catch (error) {
      console.error('게시판 목록 조회 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: '설문 목록을 불러오는 중 오류가 발생했습니다' 
      });
    }
  }
);

// 설문 미리보기 정보 조회
router.get('/surveys/:surveyId/preview', async (req, res) => {
  try {
    const { surveyId } = req.params;

    const survey = await Survey.findOne({
      id: surveyId,
      is_hidden: false,
      is_deleted: false
    }).select('id title description tags author_nickname stats created_at welcome_screen settings questions');

    if (!survey) {
      return res.status(404).json({ 
        success: false, 
        error: '설문을 찾을 수 없습니다' 
      });
    }

    const isOpen = survey.canReceiveResponse();
    const estimatedTime = Math.ceil(survey.questions.length * 30 / 60); // 질문당 30초 예상

    res.json({
      success: true,
      data: {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        tags: survey.tags || [],
        author: survey.author_nickname || '익명',
        is_open: isOpen,
        stats: {
          response_count: survey.stats.response_count,
          completion_rate: survey.stats.completion_rate,
          avg_completion_time: survey.stats.avg_completion_time
        },
        question_count: survey.questions.length,
        estimated_time: estimatedTime,
        welcome_screen: survey.welcome_screen,
        settings: {
          show_progress_bar: survey.settings.show_progress_bar,
          allow_back_navigation: survey.settings.allow_back_navigation
        },
        created_at: survey.created_at,
        public_url: survey.public_url
      }
    });
  } catch (error) {
    console.error('설문 미리보기 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '설문 정보를 불러오는 중 오류가 발생했습니다' 
    });
  }
});

// 설문 신고
router.post('/surveys/:surveyId/report', 
  body('reason').isIn(['spam', 'inappropriate', 'misleading', 'privacy', 'other']),
  body('description').optional().isString().isLength({ max: 500 }),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { surveyId } = req.params;
      const { reason, description } = req.body;

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

      // 신고 내역 저장 (별도 컬렉션 권장)
      // 여기서는 간단히 로그만 남김
      console.log('설문 신고:', {
        survey_id: surveyId,
        reason,
        description,
        reporter_ip: req.clientIp,
        reported_at: new Date()
      });

      // 신고가 많이 누적되면 자동으로 숨김 처리
      // 실제 구현에서는 Report 모델을 만들어 관리

      res.json({
        success: true,
        message: '신고가 접수되었습니다. 검토 후 조치하겠습니다.'
      });
    } catch (error) {
      console.error('설문 신고 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: '신고 처리 중 오류가 발생했습니다' 
      });
    }
  }
);

// 추천 설문 조회
router.get('/recommended', async (req, res) => {
  try {
    // 추천 알고리즘: 최근 7일 내 생성된 설문 중 완료율이 높고 응답이 활발한 설문
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recommendedSurveys = await Survey.find({
      is_hidden: false,
      is_deleted: false,
      status: 'open',
      created_at: { $gte: sevenDaysAgo },
      'stats.response_count': { $gte: 5 },
      'stats.completion_rate': { $gte: 70 }
    })
    .select('id title tags stats created_at')
    .sort({ 'stats.completion_rate': -1, 'stats.response_count': -1 })
    .limit(5);

    res.json({
      success: true,
      data: recommendedSurveys.map(survey => ({
        id: survey.id,
        title: survey.title,
        tags: survey.tags || [],
        response_count: survey.stats.response_count,
        completion_rate: survey.stats.completion_rate,
        public_url: survey.public_url
      }))
    });
  } catch (error) {
    console.error('추천 설문 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '추천 설문을 불러오는 중 오류가 발생했습니다' 
    });
  }
});

module.exports = router;