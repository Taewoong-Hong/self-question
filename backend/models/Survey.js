const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const questionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    default: () => crypto.randomBytes(8).toString('hex')
  },
  title: {
    type: String,
    required: true,
    maxlength: 500
  },
  type: {
    type: String,
    required: true,
    enum: ['single_choice', 'multiple_choice', 'short_text', 'long_text', 'rating']
  },
  required: {
    type: Boolean,
    default: false
  },
  properties: {
    choices: [{
      id: String,
      label: String,
      attachment: {
        type: {
          type: String,
          enum: ['image']
        },
        href: String
      }
    }],
    max_length: {
      type: Number,
      max: 5000
    },
    min_length: {
      type: Number,
      min: 0
    },
    max_selection: Number,
    min_selection: Number,
    rating_scale: {
      type: Number,
      enum: [5, 10],
      default: 5
    },
    labels: {
      left: String,
      center: String,
      right: String
    }
  },
  validations: {
    max_characters: Number,
    min_characters: Number
  },
  order: {
    type: Number,
    required: true
  }
});

const surveySchema = new mongoose.Schema({
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
  tags: [{
    type: String,
    maxlength: 30
  }],
  author_nickname: {
    type: String,
    maxlength: 50
  },
  
  // 보안
  admin_password_hash: {
    type: String,
    required: true
  },
  admin_token: String,
  admin_token_expires: Date,
  
  // 상태
  status: {
    type: String,
    enum: ['draft', 'open', 'closed'],
    default: 'open',
    index: true
  },
  is_hidden: {
    type: Boolean,
    default: false,
    index: true
  },
  is_deleted: {
    type: Boolean,
    default: false
  },
  
  // 질문
  questions: [questionSchema],
  
  // 화면 설정 (Typeform 스타일)
  welcome_screen: {
    title: String,
    description: String,
    button_text: {
      type: String,
      default: '시작하기'
    },
    show_button: {
      type: Boolean,
      default: true
    }
  },
  
  thankyou_screen: {
    title: {
      type: String,
      default: '응답해 주셔서 감사합니다!'
    },
    description: String,
    show_response_count: {
      type: Boolean,
      default: true
    }
  },
  
  // 설정
  settings: {
    show_progress_bar: {
      type: Boolean,
      default: true
    },
    show_question_number: {
      type: Boolean,
      default: true
    },
    allow_back_navigation: {
      type: Boolean,
      default: true
    },
    autosave_progress: {
      type: Boolean,
      default: true
    },
    response_limit: Number,
    close_at: Date,
    language: {
      type: String,
      default: 'ko'
    }
  },
  
  // 통계
  stats: {
    response_count: {
      type: Number,
      default: 0,
      index: true
    },
    completion_rate: {
      type: Number,
      default: 0
    },
    avg_completion_time: {
      type: Number,
      default: 0
    },
    last_response_at: Date,
    view_count: {
      type: Number,
      default: 0
    }
  },
  
  // 생성자 정보
  creator_ip: {
    type: String,
    required: true
  },
  
  // URL
  public_url: String,
  admin_url: String,
  
  // 수정 제한
  first_response_at: Date,
  is_editable: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// 인덱스
surveySchema.index({ created_at: -1 });
surveySchema.index({ 'stats.response_count': -1 });
surveySchema.index({ status: 1, is_hidden: 1, is_deleted: 1 });
surveySchema.index({ tags: 1 });

// 비밀번호 해싱
surveySchema.pre('save', async function(next) {
  if (this.isModified('admin_password_hash')) {
    this.admin_password_hash = await bcrypt.hash(this.admin_password_hash, 10);
  }
  next();
});

// 비밀번호 검증
surveySchema.methods.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.admin_password_hash);
};

// 관리자 토큰 생성
surveySchema.methods.generateAdminToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.admin_token = token;
  this.admin_token_expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24시간
  return token;
};

// 토큰 검증
surveySchema.methods.validateAdminToken = function(token) {
  return this.admin_token === token && 
         this.admin_token_expires && 
         this.admin_token_expires > new Date();
};

// 응답 가능 여부 확인
surveySchema.methods.canReceiveResponse = function() {
  if (this.status !== 'open') return false;
  if (this.is_hidden || this.is_deleted) return false;
  if (this.settings.response_limit && this.stats.response_count >= this.settings.response_limit) return false;
  if (this.settings.close_at && new Date() > this.settings.close_at) return false;
  return true;
};

// 수정 가능 여부 확인
surveySchema.methods.canEdit = function() {
  return this.is_editable && !this.first_response_at;
};

// Virtual fields
surveySchema.virtual('is_closed').get(function() {
  return this.status === 'closed' || !this.canReceiveResponse();
});

module.exports = mongoose.model('Survey', surveySchema);