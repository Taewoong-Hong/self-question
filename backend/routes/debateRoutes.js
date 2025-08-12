const express = require('express');
const router = express.Router();
const Debate = require('../models/Debate');
const { authenticateAdmin } = require('../middleware/auth');
const { sanitizeHtml, sanitizeText } = require('../utils/sanitizer');
const crypto = require('crypto');

// IP 해싱 함수
const hashIP = (ip) => {
  return crypto.createHash('sha256').update(ip + process.env.IP_SALT || 'default-salt').digest('hex');
};

// 투표 생성
router.post('/create', async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      tags,
      author_nickname,
      admin_password,
      vote_options,
      settings,
      start_at,
      end_at
    } = req.body;

    // 유효성 검증
    if (!title || !author_nickname || !admin_password || !vote_options || vote_options.length < 2) {
      return res.status(400).json({
        success: false,
        error: '필수 항목을 입력해주세요'
      });
    }

    // 종료일이 시작일보다 빠른지 확인
    if (new Date(end_at) <= new Date(start_at)) {
      return res.status(400).json({
        success: false,
        error: '종료일은 시작일보다 늦어야 합니다'
      });
    }

    // IP 해싱
    const clientIp = req.ip || req.connection.remoteAddress;
    const ipHash = hashIP(clientIp);

    // 투표 옵션 정리
    const processedOptions = vote_options.map((option, index) => ({
      label: sanitizeText(option.label),
      order: index
    }));

    // 투표 생성
    const debate = new Debate({
      title: sanitizeText(title),
      description: sanitizeHtml(description),
      category,
      tags: tags ? tags.map(tag => sanitizeText(tag)) : [],
      author_nickname: sanitizeText(author_nickname),
      author_ip_hash: ipHash,
      admin_password_hash: admin_password,
      vote_options: processedOptions,
      settings: {
        allow_multiple_choice: settings?.allow_multiple_choice || false,
        show_results_before_end: settings?.show_results_before_end !== false,
        allow_anonymous_vote: settings?.allow_anonymous_vote !== false,
        allow_opinion: settings?.allow_opinion !== false,
        max_votes_per_ip: settings?.max_votes_per_ip || 1
      },
      start_at: new Date(start_at),
      end_at: new Date(end_at)
    });

    // 상태 업데이트
    debate.updateStatus();

    // URL 생성
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    debate.public_url = `${baseUrl}/debate/${debate.id}`;
    debate.admin_url = `${baseUrl}/debate/admin/${debate.id}`;

    await debate.save();

    res.status(201).json({
      success: true,
      data: {
        id: debate.id,
        public_url: debate.public_url,
        admin_url: debate.admin_url,
        status: debate.status
      }
    });
  } catch (error) {
    console.error('투표 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message || '투표 생성 중 오류가 발생했습니다'
    });
  }
});

// 투표 상세 조회
router.get('/:debateId', async (req, res) => {
  try {
    const debate = await Debate.findOne({ 
      id: req.params.debateId,
      is_deleted: false 
    });

    if (!debate) {
      return res.status(404).json({
        success: false,
        error: '투표를 찾을 수 없습니다'
      });
    }

    // 상태 업데이트
    debate.updateStatus();

    // 조회수 증가
    debate.stats.view_count += 1;
    await debate.save();

    // IP 확인 (투표 가능 여부)
    const clientIp = req.ip || req.connection.remoteAddress;
    const ipHash = hashIP(clientIp);
    const canVote = debate.canVote(ipHash);

    // 응답 데이터 구성
    const responseData = {
      id: debate.id,
      title: debate.title,
      description: debate.description,
      category: debate.category,
      tags: debate.tags,
      author_nickname: debate.author_nickname,
      vote_options: debate.vote_options.map(opt => ({
        id: opt.id,
        label: opt.label,
        order: opt.order
      })),
      settings: {
        allow_multiple_choice: debate.settings.allow_multiple_choice,
        show_results_before_end: debate.settings.show_results_before_end,
        allow_anonymous_vote: debate.settings.allow_anonymous_vote,
        allow_opinion: debate.settings.allow_opinion
      },
      start_at: debate.start_at,
      end_at: debate.end_at,
      status: debate.status,
      is_active: debate.is_active,
      is_ended: debate.is_ended,
      time_remaining: debate.time_remaining,
      can_vote: canVote,
      stats: {
        total_votes: debate.stats.total_votes,
        unique_voters: debate.stats.unique_voters,
        opinion_count: debate.stats.opinion_count,
        view_count: debate.stats.view_count
      },
      created_at: debate.created_at
    };

    // 결과 추가 (조건부)
    const results = debate.getResults();
    if (results) {
      responseData.results = results;
    }

    // 의견 목록 추가
    if (debate.settings.allow_opinion) {
      responseData.opinions = debate.opinions
        .filter(op => !op.is_deleted)
        .map(op => ({
          id: op.id,
          author_nickname: op.is_anonymous ? '익명' : op.author_nickname,
          selected_option_id: op.selected_option_id,
          content: op.content,
          created_at: op.created_at
        }))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('투표 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '투표 조회 중 오류가 발생했습니다'
    });
  }
});

// 투표하기
router.post('/:debateId/vote', async (req, res) => {
  try {
    const { option_ids, user_nickname, is_anonymous } = req.body;

    if (!option_ids || !Array.isArray(option_ids) || option_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: '투표할 옵션을 선택해주세요'
      });
    }

    const debate = await Debate.findOne({ 
      id: req.params.debateId,
      is_deleted: false 
    });

    if (!debate) {
      return res.status(404).json({
        success: false,
        error: '투표를 찾을 수 없습니다'
      });
    }

    // IP 해싱
    const clientIp = req.ip || req.connection.remoteAddress;
    const ipHash = hashIP(clientIp);

    // 투표 실행
    const userInfo = {
      nickname: user_nickname ? sanitizeText(user_nickname) : undefined,
      is_anonymous: is_anonymous || !user_nickname
    };

    await debate.castVote(option_ids, ipHash, userInfo);

    // 결과 조회
    const results = debate.getResults();

    res.json({
      success: true,
      message: '투표가 완료되었습니다',
      data: {
        results,
        can_vote_again: false
      }
    });
  } catch (error) {
    console.error('투표 오류:', error);
    res.status(400).json({
      success: false,
      error: error.message || '투표 처리 중 오류가 발생했습니다'
    });
  }
});

// 의견 작성
router.post('/:debateId/opinion', async (req, res) => {
  try {
    const { author_nickname, selected_option_id, content, is_anonymous } = req.body;

    if (!author_nickname || !content) {
      return res.status(400).json({
        success: false,
        error: '필수 항목을 입력해주세요'
      });
    }

    const debate = await Debate.findOne({ 
      id: req.params.debateId,
      is_deleted: false 
    });

    if (!debate) {
      return res.status(404).json({
        success: false,
        error: '투표를 찾을 수 없습니다'
      });
    }

    // IP 해싱
    const clientIp = req.ip || req.connection.remoteAddress;
    const ipHash = hashIP(clientIp);

    // 의견 추가
    const opinionData = {
      author_nickname: sanitizeText(author_nickname),
      selected_option_id,
      content: sanitizeText(content),
      is_anonymous
    };

    await debate.addOpinion(opinionData, ipHash);

    res.json({
      success: true,
      message: '의견이 등록되었습니다'
    });
  } catch (error) {
    console.error('의견 작성 오류:', error);
    res.status(400).json({
      success: false,
      error: error.message || '의견 작성 중 오류가 발생했습니다'
    });
  }
});

// 투표 목록 조회 (게시판)
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      status,
      sort = 'latest',
      search
    } = req.query;

    const skip = (page - 1) * limit;

    // 필터 조건
    const filter = {
      is_deleted: false,
      is_hidden: false
    };

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // 정렬 옵션
    let sortOption = {};
    switch (sort) {
      case 'popular':
        sortOption = { 'stats.total_votes': -1 };
        break;
      case 'views':
        sortOption = { 'stats.view_count': -1 };
        break;
      case 'ending_soon':
        sortOption = { end_at: 1 };
        filter.status = 'active';
        break;
      case 'latest':
      default:
        sortOption = { created_at: -1 };
    }

    // 투표 목록 조회
    const debates = await Debate.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-admin_password_hash -voter_ips -opinions');

    // 총 개수
    const total = await Debate.countDocuments(filter);

    // 상태 업데이트 및 응답 데이터 구성
    const debateList = debates.map(debate => {
      debate.updateStatus();
      const results = debate.getResults();
      
      return {
        id: debate.id,
        title: debate.title,
        description: debate.description,
        category: debate.category,
        tags: debate.tags,
        author_nickname: debate.author_nickname,
        vote_options: debate.vote_options.map(opt => ({
          id: opt.id,
          label: opt.label,
          vote_count: results ? opt.vote_count : null,
          percentage: results ? opt.percentage : null
        })),
        settings: {
          allow_multiple_choice: debate.settings.allow_multiple_choice,
          show_results_before_end: debate.settings.show_results_before_end
        },
        start_at: debate.start_at,
        end_at: debate.end_at,
        status: debate.status,
        is_active: debate.is_active,
        is_ended: debate.is_ended,
        time_remaining: debate.time_remaining,
        stats: {
          total_votes: debate.stats.total_votes,
          unique_voters: debate.stats.unique_voters,
          opinion_count: debate.stats.opinion_count,
          view_count: debate.stats.view_count
        },
        created_at: debate.created_at,
        public_url: debate.public_url
      };
    });

    res.json({
      success: true,
      data: {
        debates: debateList,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          total_pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('투표 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '투표 목록 조회 중 오류가 발생했습니다'
    });
  }
});

// 투표 수정 (관리자)
router.put('/:debateId', authenticateAdmin, async (req, res) => {
  try {
    const debate = await Debate.findOne({ 
      id: req.params.debateId,
      is_deleted: false 
    });

    if (!debate) {
      return res.status(404).json({
        success: false,
        error: '투표를 찾을 수 없습니다'
      });
    }

    // 비밀번호 확인
    const isValid = await debate.validatePassword(req.body.admin_password);
    if (!isValid) {
      return res.status(403).json({
        success: false,
        error: '관리자 비밀번호가 일치하지 않습니다'
      });
    }

    // 수정 가능한 필드만 업데이트
    const allowedFields = ['title', 'description', 'category', 'tags', 'is_hidden'];
    const updateData = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'title' || field === 'description') {
          updateData[field] = sanitizeText(req.body[field]);
        } else if (field === 'tags') {
          updateData[field] = req.body[field].map(tag => sanitizeText(tag));
        } else {
          updateData[field] = req.body[field];
        }
      }
    });

    // 진행 중인 투표는 일부 필드만 수정 가능
    if (debate.status === 'active' && (req.body.start_at || req.body.end_at || req.body.vote_options)) {
      return res.status(400).json({
        success: false,
        error: '진행 중인 투표는 일정과 옵션을 수정할 수 없습니다'
      });
    }

    Object.assign(debate, updateData);
    await debate.save();

    res.json({
      success: true,
      message: '투표가 수정되었습니다'
    });
  } catch (error) {
    console.error('투표 수정 오류:', error);
    res.status(500).json({
      success: false,
      error: '투표 수정 중 오류가 발생했습니다'
    });
  }
});

// 투표 삭제 (관리자)
router.delete('/:debateId', authenticateAdmin, async (req, res) => {
  try {
    const debate = await Debate.findOne({ 
      id: req.params.debateId,
      is_deleted: false 
    });

    if (!debate) {
      return res.status(404).json({
        success: false,
        error: '투표를 찾을 수 없습니다'
      });
    }

    // 비밀번호 확인
    const isValid = await debate.validatePassword(req.body.admin_password);
    if (!isValid) {
      return res.status(403).json({
        success: false,
        error: '관리자 비밀번호가 일치하지 않습니다'
      });
    }

    // 소프트 삭제
    debate.is_deleted = true;
    await debate.save();

    res.json({
      success: true,
      message: '투표가 삭제되었습니다'
    });
  } catch (error) {
    console.error('투표 삭제 오류:', error);
    res.status(500).json({
      success: false,
      error: '투표 삭제 중 오류가 발생했습니다'
    });
  }
});

// 투표 통계 (관리자)
router.get('/:debateId/stats', authenticateAdmin, async (req, res) => {
  try {
    const debate = await Debate.findOne({ 
      id: req.params.debateId,
      is_deleted: false 
    });

    if (!debate) {
      return res.status(404).json({
        success: false,
        error: '투표를 찾을 수 없습니다'
      });
    }

    // 시간별 투표 분석
    const votesByHour = Array(24).fill(0);
    const votesByDay = {};
    
    debate.vote_options.forEach(option => {
      option.votes.forEach(vote => {
        const voteDate = new Date(vote.voted_at);
        const hour = voteDate.getHours();
        const day = voteDate.toISOString().split('T')[0];
        
        votesByHour[hour]++;
        votesByDay[day] = (votesByDay[day] || 0) + 1;
      });
    });

    // 옵션별 상세 통계
    const optionStats = debate.vote_options.map(option => ({
      id: option.id,
      label: option.label,
      vote_count: option.vote_count,
      percentage: option.percentage,
      anonymous_votes: option.votes.filter(v => v.is_anonymous).length,
      identified_votes: option.votes.filter(v => !v.is_anonymous).length
    }));

    res.json({
      success: true,
      data: {
        overview: {
          total_votes: debate.stats.total_votes,
          unique_voters: debate.stats.unique_voters,
          opinion_count: debate.stats.opinion_count,
          view_count: debate.stats.view_count,
          participation_rate: debate.stats.view_count > 0 
            ? Math.round((debate.stats.unique_voters / debate.stats.view_count) * 100) 
            : 0
        },
        option_stats: optionStats,
        time_analysis: {
          votes_by_hour: votesByHour,
          votes_by_day: votesByDay
        },
        voter_analysis: {
          anonymous_voters: debate.voter_ips.length,
          multiple_voters: debate.voter_ips.filter(v => v.vote_count > 1).length
        }
      }
    });
  } catch (error) {
    console.error('투표 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '투표 통계 조회 중 오류가 발생했습니다'
    });
  }
});

module.exports = router;