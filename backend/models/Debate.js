const mongoose = require('mongoose');
const crypto = require('crypto');

const voteOptionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    default: () => crypto.randomBytes(8).toString('hex')
  },
  label: {
    type: String,
    required: true,
    maxlength: 200
  },
  order: {
    type: Number,
    required: true
  },
  votes: [{
    user_id: String, // 익명이 아닐 경우 사용자 식별자
    user_nickname: String,
    voter_ip_hash: {
      type: String,
      required: true
    },
    is_anonymous: {
      type: Boolean,
      default: false
    },
    voted_at: {
      type: Date,
      default: Date.now
    }
  }],
  vote_count: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0
  }
});

const opinionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    default: () => crypto.randomBytes(8).toString('hex')
  },
  author_nickname: {
    type: String,
    required: true,
    maxlength: 50
  },
  author_ip_hash: {
    type: String,
    required: true
  },
  selected_option_id: String, // 선택한 옵션
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  is_anonymous: {
    type: Boolean,
    default: false
  },
  is_deleted: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

const debateSchema = new mongoose.Schema({
  // 기본 정보
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => crypto.randomBytes(8).toString('hex')
  },
  title: {
    type: String,
    required: true,
    maxlength: 200,
    index: 'text'
  },
  description: {
    type: String,
    maxlength: 2000,
    index: 'text'
  },
  category: {
    type: String,
    enum: ['general', 'tech', 'lifestyle', 'politics', 'entertainment', 'sports', 'other'],
    default: 'general',
    index: true
  },
  tags: [{
    type: String,
    maxlength: 30
  }],
  
  // 작성자 정보
  author_nickname: {
    type: String,
    required: true,
    maxlength: 50
  },
  author_ip_hash: {
    type: String,
    required: true
  },
  admin_password_hash: {
    type: String,
    required: true
  },
  
  // 투표 옵션
  vote_options: [voteOptionSchema],
  
  // 투표 설정
  settings: {
    allow_multiple_choice: {
      type: Boolean,
      default: false
    },
    show_results_before_end: {
      type: Boolean,
      default: true
    },
    allow_anonymous_vote: {
      type: Boolean,
      default: true
    },
    allow_opinion: {
      type: Boolean,
      default: true
    },
    max_votes_per_ip: {
      type: Number,
      default: 1,
      min: 1
    }
  },
  
  // 일정
  start_at: {
    type: Date,
    required: true,
    index: true
  },
  end_at: {
    type: Date,
    required: true,
    index: true
  },
  
  // 상태
  status: {
    type: String,
    enum: ['scheduled', 'active', 'ended'],
    default: 'scheduled',
    index: true
  },
  is_hidden: {
    type: Boolean,
    default: false
  },
  is_deleted: {
    type: Boolean,
    default: false
  },
  
  // 통계
  stats: {
    total_votes: {
      type: Number,
      default: 0
    },
    unique_voters: {
      type: Number,
      default: 0
    },
    opinion_count: {
      type: Number,
      default: 0
    },
    view_count: {
      type: Number,
      default: 0
    },
    last_vote_at: Date
  },
  
  // 의견
  opinions: [opinionSchema],
  
  // IP 추적 (중복 투표 방지)
  voter_ips: [{
    ip_hash: String,
    vote_count: Number,
    last_vote_at: Date
  }],
  
  // URL
  public_url: String,
  admin_url: String
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// 인덱스
debateSchema.index({ created_at: -1 });
debateSchema.index({ start_at: 1, end_at: 1 });
debateSchema.index({ status: 1, is_hidden: 1, is_deleted: 1 });
debateSchema.index({ 'stats.total_votes': -1 });
debateSchema.index({ category: 1, status: 1 });

// 상태 업데이트 메서드
debateSchema.methods.updateStatus = function() {
  const now = new Date();
  
  if (this.is_deleted || this.is_hidden) {
    return this.status;
  }
  
  if (now < this.start_at) {
    this.status = 'scheduled';
  } else if (now >= this.start_at && now <= this.end_at) {
    this.status = 'active';
  } else {
    this.status = 'ended';
  }
  
  return this.status;
};

// 투표 가능 여부 확인
debateSchema.methods.canVote = function(ipHash) {
  this.updateStatus();
  
  if (this.status !== 'active') return false;
  if (this.is_hidden || this.is_deleted) return false;
  
  // IP별 투표 횟수 확인
  const voterRecord = this.voter_ips.find(v => v.ip_hash === ipHash);
  if (voterRecord && voterRecord.vote_count >= this.settings.max_votes_per_ip) {
    return false;
  }
  
  return true;
};

// 투표하기
debateSchema.methods.castVote = async function(optionIds, ipHash, userInfo = {}) {
  if (!this.canVote(ipHash)) {
    throw new Error('투표할 수 없습니다');
  }
  
  // 단일/다중 선택 검증
  if (!this.settings.allow_multiple_choice && optionIds.length > 1) {
    throw new Error('단일 선택만 가능합니다');
  }
  
  // 유효한 옵션인지 확인
  const validOptionIds = this.vote_options.map(opt => opt.id);
  const invalidOptions = optionIds.filter(id => !validOptionIds.includes(id));
  if (invalidOptions.length > 0) {
    throw new Error('유효하지 않은 옵션입니다');
  }
  
  // 투표 추가
  for (const optionId of optionIds) {
    const option = this.vote_options.find(opt => opt.id === optionId);
    if (option) {
      option.votes.push({
        user_id: userInfo.user_id,
        user_nickname: userInfo.nickname,
        voter_ip_hash: ipHash,
        is_anonymous: userInfo.is_anonymous || false,
        voted_at: new Date()
      });
      option.vote_count = option.votes.length;
    }
  }
  
  // IP 기록 업데이트
  const voterRecord = this.voter_ips.find(v => v.ip_hash === ipHash);
  if (voterRecord) {
    voterRecord.vote_count += 1;
    voterRecord.last_vote_at = new Date();
  } else {
    this.voter_ips.push({
      ip_hash: ipHash,
      vote_count: 1,
      last_vote_at: new Date()
    });
  }
  
  // 통계 업데이트
  this.stats.total_votes += optionIds.length;
  this.stats.unique_voters = this.voter_ips.length;
  this.stats.last_vote_at = new Date();
  
  // 백분율 계산
  this.updatePercentages();
  
  return this.save();
};

// 백분율 업데이트
debateSchema.methods.updatePercentages = function() {
  const totalVotes = this.vote_options.reduce((sum, opt) => sum + opt.vote_count, 0);
  
  this.vote_options.forEach(option => {
    option.percentage = totalVotes > 0 
      ? Math.round((option.vote_count / totalVotes) * 100) 
      : 0;
  });
};

// 의견 추가
debateSchema.methods.addOpinion = async function(opinionData, ipHash) {
  if (!this.settings.allow_opinion) {
    throw new Error('이 토론에서는 의견을 작성할 수 없습니다');
  }
  
  this.updateStatus();
  if (this.status === 'scheduled') {
    throw new Error('토론이 아직 시작되지 않았습니다');
  }
  
  const opinion = {
    author_nickname: opinionData.author_nickname,
    author_ip_hash: ipHash,
    selected_option_id: opinionData.selected_option_id,
    content: opinionData.content,
    is_anonymous: opinionData.is_anonymous || false
  };
  
  this.opinions.push(opinion);
  this.stats.opinion_count = this.opinions.filter(op => !op.is_deleted).length;
  
  return this.save();
};

// 결과 조회 (조건부)
debateSchema.methods.getResults = function(forceShow = false) {
  this.updateStatus();
  
  if (!forceShow && !this.settings.show_results_before_end && this.status !== 'ended') {
    return null;
  }
  
  return {
    options: this.vote_options.map(opt => ({
      id: opt.id,
      label: opt.label,
      vote_count: opt.vote_count,
      percentage: opt.percentage
    })),
    total_votes: this.stats.total_votes,
    unique_voters: this.stats.unique_voters
  };
};

// Virtual fields
debateSchema.virtual('is_active').get(function() {
  return this.status === 'active';
});

debateSchema.virtual('is_ended').get(function() {
  return this.status === 'ended';
});

debateSchema.virtual('time_remaining').get(function() {
  const now = new Date();
  if (this.status === 'scheduled') {
    return this.start_at - now;
  } else if (this.status === 'active') {
    return this.end_at - now;
  }
  return 0;
});

// 비밀번호 관련 메서드는 Survey 모델과 동일하게 구현
const bcrypt = require('bcryptjs');

debateSchema.pre('save', async function(next) {
  if (this.isModified('admin_password_hash')) {
    this.admin_password_hash = await bcrypt.hash(this.admin_password_hash, 10);
  }
  next();
});

debateSchema.methods.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.admin_password_hash);
};

// JWT 토큰 생성
const jwt = require('jsonwebtoken');

debateSchema.methods.generateAdminToken = function() {
  const payload = {
    debate_id: this.id,
    type: 'debate_admin',
    created_at: new Date()
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '24h'
  });
};

module.exports = mongoose.model('Debate', debateSchema);