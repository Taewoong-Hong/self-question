import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Question Types
export interface IChoice {
  id: string;
  label: string;
  attachment?: {
    type: 'image';
    href: string;
  };
}

export interface IQuestion {
  id: string;
  title: string;
  type: 'single_choice' | 'multiple_choice' | 'short_text' | 'long_text' | 'rating';
  required: boolean;
  properties?: {
    choices?: IChoice[];
    max_length?: number;
    min_length?: number;
    max_selection?: number;
    min_selection?: number;
    rating_scale?: 5 | 10;
    labels?: {
      left?: string;
      center?: string;
      right?: string;
    };
  };
  validations?: {
    max_characters?: number;
    min_characters?: number;
  };
  order: number;
}

// Survey Interface
export interface ISurvey extends Document {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  author_nickname?: string;
  
  // Security
  admin_password_hash: string;
  admin_token?: string;
  admin_token_expires?: Date;
  
  // Status
  status: 'draft' | 'open' | 'closed';
  is_hidden: boolean;
  is_deleted: boolean;
  
  // Questions
  questions: IQuestion[];
  
  // Screens
  welcome_screen?: {
    title?: string;
    description?: string;
    button_text: string;
    show_button: boolean;
  };
  
  thankyou_screen?: {
    title: string;
    description?: string;
    show_response_count: boolean;
  };
  
  // Settings
  settings: {
    show_progress_bar: boolean;
    show_question_number: boolean;
    allow_back_navigation: boolean;
    autosave_progress: boolean;
    response_limit?: number;
    close_at?: Date;
    language: string;
  };
  
  // Statistics
  stats: {
    response_count: number;
    completion_rate: number;
    avg_completion_time: number;
    last_response_at?: Date;
    view_count: number;
  };
  
  // Creator info
  creator_ip: string;
  
  // URLs
  public_url?: string;
  admin_url?: string;
  
  // Edit restrictions
  first_response_at?: Date;
  is_editable: boolean;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
  
  // Virtual fields
  is_closed: boolean;
  
  // Methods
  validatePassword(password: string): Promise<boolean>;
  generateAdminToken(): string;
  validateAdminToken(token: string): boolean;
  canReceiveResponse(): boolean;
  canEdit(): boolean;
}

const questionSchema = new Schema<IQuestion>({
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

const surveySchema = new Schema<ISurvey>({
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
  
  // Security
  admin_password_hash: {
    type: String,
    required: true
  },
  admin_token: String,
  admin_token_expires: Date,
  
  // Status
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
  
  // Questions
  questions: [questionSchema],
  
  // Screens
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
  
  // Settings
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
  
  // Statistics
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
  
  // Creator info
  creator_ip: {
    type: String,
    required: true
  },
  
  // URLs
  public_url: String,
  admin_url: String,
  
  // Edit restrictions
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

// Indexes
surveySchema.index({ created_at: -1 });
surveySchema.index({ 'stats.response_count': -1 });
surveySchema.index({ status: 1, is_hidden: 1, is_deleted: 1 });
surveySchema.index({ tags: 1 });

// Password hashing
surveySchema.pre('save', async function(next) {
  if (this.isModified('admin_password_hash')) {
    this.admin_password_hash = await bcrypt.hash(this.admin_password_hash, 10);
  }
  next();
});

// Methods
surveySchema.methods.validatePassword = async function(password: string): Promise<boolean> {
  return await bcrypt.compare(password, this.admin_password_hash);
};

surveySchema.methods.generateAdminToken = function(): string {
  const token = crypto.randomBytes(32).toString('hex');
  this.admin_token = token;
  this.admin_token_expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return token;
};

surveySchema.methods.validateAdminToken = function(token: string): boolean {
  return this.admin_token === token && 
         this.admin_token_expires !== undefined && 
         this.admin_token_expires > new Date();
};

surveySchema.methods.canReceiveResponse = function(): boolean {
  if (this.status !== 'open') return false;
  if (this.is_hidden || this.is_deleted) return false;
  if (this.settings.response_limit && this.stats.response_count >= this.settings.response_limit) return false;
  if (this.settings.close_at && new Date() > this.settings.close_at) return false;
  return true;
};

surveySchema.methods.canEdit = function(): boolean {
  return this.is_editable && !this.first_response_at;
};

// Virtual fields
surveySchema.virtual('is_closed').get(function() {
  return this.status === 'closed' || !this.canReceiveResponse();
});

// Export model
export default (mongoose.models.Survey as Model<ISurvey>) || mongoose.model<ISurvey>('Survey', surveySchema);