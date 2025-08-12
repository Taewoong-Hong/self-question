const mongoose = require('mongoose');
const crypto = require('crypto');

const answerSchema = new mongoose.Schema({
  question_id: {
    type: String,
    required: true
  },
  question_type: {
    type: String,
    required: true,
    enum: ['single_choice', 'multiple_choice', 'short_text', 'long_text', 'rating']
  },
  // 답변 값 (타입에 따라 다름)
  choice_id: String, // single_choice
  choice_ids: [String], // multiple_choice
  text: String, // short_text, long_text
  rating: {
    type: Number,
    min: 1,
    max: 10
  },
  // 답변 시간 추적
  answered_at: {
    type: Date,
    default: Date.now
  },
  time_spent: Number // 해당 질문에 소요된 시간 (초)
});

const responseSchema = new mongoose.Schema({
  // 식별자
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => crypto.randomBytes(8).toString('hex')
  },
  response_code: {
    type: String,
    required: true,
    unique: true,
    default: () => crypto.randomBytes(4).toString('hex').toUpperCase()
  },
  
  // 설문 참조
  survey_id: {
    type: String,
    required: true,
    index: true
  },
  survey_ref: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Survey',
    required: true
  },
  
  // 응답자 정보
  respondent_ip: {
    type: String,
    required: true,
    index: true
  },
  respondent_ip_hash: {
    type: String,
    required: true,
    index: true
  },
  user_agent: String,
  browser: String,
  device_type: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet', 'unknown']
  },
  
  // 답변 데이터
  answers: [answerSchema],
  
  // 메타데이터
  started_at: {
    type: Date,
    required: true
  },
  submitted_at: {
    type: Date,
    required: true
  },
  completion_time: { // 초 단위
    type: Number,
    required: true
  },
  
  // 상태
  is_complete: {
    type: Boolean,
    default: true
  },
  is_deleted: {
    type: Boolean,
    default: false
  },
  deleted_by: {
    type: String,
    enum: ['admin', 'system']
  },
  deleted_at: Date,
  
  // 진행 상황 (부분 저장용)
  progress: {
    current_question_index: Number,
    saved_answers: mongoose.Schema.Types.Mixed,
    last_saved_at: Date
  },
  
  // 접속 정보
  referrer: String,
  utm_source: String,
  utm_medium: String,
  utm_campaign: String,
  
  // 품질 지표
  quality_score: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },
  quality_flags: [{
    type: String,
    enum: ['too_fast', 'duplicate_pattern', 'all_same_answers', 'suspicious_ip']
  }]
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// 복합 인덱스 - IP와 설문 조합으로 중복 방지
responseSchema.index({ survey_id: 1, respondent_ip_hash: 1 }, { unique: true });
responseSchema.index({ survey_ref: 1, created_at: -1 });
responseSchema.index({ response_code: 1 });

// IP 해싱
responseSchema.pre('save', function(next) {
  if (this.isNew && this.respondent_ip) {
    // IP를 해시화하여 개인정보 보호
    this.respondent_ip_hash = crypto
      .createHash('sha256')
      .update(this.respondent_ip + process.env.IP_SALT || 'default-salt')
      .digest('hex');
  }
  
  // 완료 시간 계산
  if (this.started_at && this.submitted_at) {
    this.completion_time = Math.round((this.submitted_at - this.started_at) / 1000);
  }
  
  next();
});

// 품질 점수 계산
responseSchema.methods.calculateQualityScore = function() {
  let score = 100;
  const completionTime = this.completion_time;
  const answerCount = this.answers.length;
  
  // 너무 빠른 응답 체크 (질문당 평균 2초 미만)
  if (completionTime < answerCount * 2) {
    score -= 30;
    if (!this.quality_flags.includes('too_fast')) {
      this.quality_flags.push('too_fast');
    }
  }
  
  // 모든 객관식 답변이 동일한 경우
  const choiceAnswers = this.answers.filter(a => 
    a.question_type === 'single_choice' || a.question_type === 'multiple_choice'
  );
  if (choiceAnswers.length > 3) {
    const firstChoice = choiceAnswers[0].choice_id || choiceAnswers[0].choice_ids?.[0];
    const allSame = choiceAnswers.every(a => 
      a.choice_id === firstChoice || a.choice_ids?.[0] === firstChoice
    );
    if (allSame) {
      score -= 20;
      if (!this.quality_flags.includes('all_same_answers')) {
        this.quality_flags.push('all_same_answers');
      }
    }
  }
  
  this.quality_score = Math.max(0, score);
  return this.quality_score;
};

// 응답 익명화 (CSV 내보내기용)
responseSchema.methods.anonymize = function() {
  const anonymized = this.toObject();
  delete anonymized.respondent_ip;
  delete anonymized.respondent_ip_hash;
  delete anonymized.user_agent;
  anonymized.respondent_id = `R${this.created_at.getTime()}`;
  return anonymized;
};

// Virtual fields
responseSchema.virtual('completion_percentage').get(function() {
  if (!this.survey_ref) return 0;
  const totalQuestions = this.survey_ref.questions?.length || 0;
  const answeredQuestions = this.answers.length;
  return totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
});

module.exports = mongoose.model('Response', responseSchema);