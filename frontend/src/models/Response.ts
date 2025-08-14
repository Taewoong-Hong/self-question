import mongoose, { Document, Model, Schema } from 'mongoose';
import crypto from 'crypto';

// Answer Types
export interface IAnswer {
  question_id: string;
  question_type: 'single_choice' | 'multiple_choice' | 'short_text' | 'long_text' | 'rating';
  choice_id?: string;
  choice_ids?: string[];
  text?: string;
  rating?: number;
  answered_at: Date;
  time_spent?: number;
}

// Response Interface
export interface IResponse extends Document {
  id: string;
  response_code: string;
  
  // Survey reference
  survey_id: string;
  survey_ref: mongoose.Types.ObjectId;
  
  // Respondent info
  respondent_ip: string;
  respondent_ip_hash: string;
  user_agent?: string;
  browser?: string;
  device_type?: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  
  // Answer data
  answers: IAnswer[];
  
  // Metadata
  started_at: Date;
  submitted_at: Date;
  completion_time: number;
  
  // Status
  is_complete: boolean;
  is_deleted: boolean;
  deleted_by?: 'admin' | 'system';
  deleted_at?: Date;
  
  // Progress (for partial saves)
  progress?: {
    current_question_index?: number;
    saved_answers?: any;
    last_saved_at?: Date;
  };
  
  // Referrer info
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  
  // Quality indicators
  quality_score: number;
  quality_flags: Array<'too_fast' | 'duplicate_pattern' | 'all_same_answers' | 'suspicious_ip'>;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
  
  // Virtual fields
  completion_percentage: number;
  
  // Methods
  calculateQualityScore(): number;
  anonymize(): any;
}

const answerSchema = new Schema<IAnswer>({
  question_id: {
    type: String,
    required: true
  },
  question_type: {
    type: String,
    required: true,
    enum: ['single_choice', 'multiple_choice', 'short_text', 'long_text', 'rating']
  },
  choice_id: String,
  choice_ids: [String],
  text: String,
  rating: {
    type: Number,
    min: 1,
    max: 10
  },
  answered_at: {
    type: Date,
    default: Date.now
  },
  time_spent: Number
});

const responseSchema = new Schema<IResponse>({
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
  
  // Survey reference
  survey_id: {
    type: String,
    required: true,
    index: true
  },
  survey_ref: {
    type: Schema.Types.ObjectId,
    ref: 'Survey',
    required: true
  },
  
  // Respondent info
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
  
  // Answer data
  answers: [answerSchema],
  
  // Metadata
  started_at: {
    type: Date,
    required: true
  },
  submitted_at: {
    type: Date,
    required: true
  },
  completion_time: {
    type: Number,
    required: true
  },
  
  // Status
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
  
  // Progress
  progress: {
    current_question_index: Number,
    saved_answers: Schema.Types.Mixed,
    last_saved_at: Date
  },
  
  // Referrer info
  referrer: String,
  utm_source: String,
  utm_medium: String,
  utm_campaign: String,
  
  // Quality indicators
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

// Compound index - prevent duplicates by IP and survey combination
responseSchema.index({ survey_id: 1, respondent_ip_hash: 1 }, { unique: true });
responseSchema.index({ survey_ref: 1, created_at: -1 });
responseSchema.index({ response_code: 1 });

// IP hashing
responseSchema.pre('save', function(next) {
  if (this.isNew && this.respondent_ip) {
    // Hash IP for privacy protection
    this.respondent_ip_hash = crypto
      .createHash('sha256')
      .update(this.respondent_ip + (process.env.IP_SALT || 'default-salt'))
      .digest('hex');
  }
  
  // Calculate completion time
  if (this.started_at && this.submitted_at) {
    this.completion_time = Math.round((this.submitted_at.getTime() - this.started_at.getTime()) / 1000);
  }
  
  next();
});

// Quality score calculation
responseSchema.methods.calculateQualityScore = function(): number {
  let score = 100;
  const completionTime = this.completion_time;
  const answerCount = this.answers.length;
  
  // Check for too fast responses (less than 2 seconds per question average)
  if (completionTime < answerCount * 2) {
    score -= 30;
    if (!this.quality_flags.includes('too_fast')) {
      this.quality_flags.push('too_fast');
    }
  }
  
  // Check if all multiple choice answers are the same
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

// Anonymize response (for CSV export)
responseSchema.methods.anonymize = function(): any {
  const anonymized = this.toObject();
  delete anonymized.respondent_ip;
  delete anonymized.respondent_ip_hash;
  delete anonymized.user_agent;
  anonymized.respondent_id = `R${this.created_at.getTime()}`;
  return anonymized;
};

// Virtual fields
responseSchema.virtual('completion_percentage').get(function() {
  if (!this.populated('survey_ref')) return 0;
  const survey = this.survey_ref as any;
  const totalQuestions = survey?.questions?.length || 0;
  const answeredQuestions = this.answers.length;
  return totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
});

// Export model
export default (mongoose.models.Response as Model<IResponse>) || mongoose.model<IResponse>('Response', responseSchema);