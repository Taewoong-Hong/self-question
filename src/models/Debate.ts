import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// Vote Types
export interface IVote {
  user_id?: string;
  user_nickname?: string;
  voter_ip_hash: string;
  is_anonymous: boolean;
  voted_at: Date;
}

export interface IVoteOption {
  id: string;
  label: string;
  order: number;
  votes: IVote[];
  vote_count: number;
  percentage: number;
}

export interface IOpinion {
  id: string;
  author_nickname: string;
  author_ip_hash: string;
  selected_option_id?: string;
  content: string;
  is_anonymous: boolean;
  is_deleted: boolean;
  created_at: Date;
}

export interface IVoterIP {
  ip_hash: string;
  vote_count: number;
  last_vote_at: Date;
}

// Debate Interface
export interface IDebate extends Document {
  id: string;
  title: string;
  description?: string;
  category: 'general' | 'tech' | 'lifestyle' | 'politics' | 'entertainment' | 'sports' | 'other';
  tags?: string[];
  
  // Author info
  author_nickname: string;
  author_ip_hash: string;
  admin_password_hash: string;
  
  // Vote options
  vote_options: IVoteOption[];
  
  // Settings
  settings: {
    allow_multiple_choice: boolean;
    show_results_before_end: boolean;
    allow_anonymous_vote: boolean;
    allow_opinion: boolean;
    max_votes_per_ip: number;
  };
  
  // Schedule
  start_at: Date;
  end_at: Date;
  
  // Status
  status: 'scheduled' | 'active' | 'ended';
  is_hidden: boolean;
  is_deleted: boolean;
  
  // Statistics
  stats: {
    total_votes: number;
    unique_voters: number;
    opinion_count: number;
    view_count: number;
    last_vote_at?: Date;
    agree_count?: number;
    disagree_count?: number;
  };
  
  // Opinions
  opinions: IOpinion[];
  
  // IP tracking
  voter_ips: IVoterIP[];
  
  // Admin-modified results (replaces actual vote data)
  admin_results?: {
    agree_count: number;
    disagree_count: number;
    opinions?: Array<{
      id: string;
      content: string;
      vote_type: 'agree' | 'disagree';
      voter_name?: string;
      created_at: string;
    }>;
  };
  
  // URLs
  public_url?: string;
  admin_url?: string;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
  
  // Virtual fields
  is_active: boolean;
  is_ended: boolean;
  time_remaining: number;
  
  // Methods
  updateStatus(): string;
  canVote(ipHash: string): boolean;
  castVote(optionIds: string[], ipHash: string, userInfo?: {
    user_id?: string;
    nickname?: string;
    is_anonymous?: boolean;
  }): Promise<IDebate>;
  updatePercentages(): void;
  addOpinion(opinionData: {
    author_nickname: string;
    selected_option_id?: string;
    content: string;
    is_anonymous?: boolean;
  }, ipHash: string): Promise<IDebate>;
  getResults(forceShow?: boolean): {
    options: Array<{
      id: string;
      label: string;
      vote_count: number;
      percentage: number;
    }>;
    total_votes: number;
    unique_voters: number;
  } | null;
  validatePassword(password: string): Promise<boolean>;
  generateAdminToken(): string;
}

const voteOptionSchema = new Schema<IVoteOption>({
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
    user_id: String,
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

const opinionSchema = new Schema<IOpinion>({
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
  selected_option_id: String,
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

const debateSchema = new Schema<IDebate>({
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
  
  // Author info
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
  
  // Vote options
  vote_options: [voteOptionSchema],
  
  // Settings
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
  
  // Schedule
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
  
  // Status
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
  
  // Statistics
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
    last_vote_at: Date,
    agree_count: {
      type: Number,
      default: 0
    },
    disagree_count: {
      type: Number,
      default: 0
    }
  },
  
  // Admin-modified results
  admin_results: {
    agree_count: Number,
    disagree_count: Number,
    opinions: [{
      id: String,
      content: String,
      vote_type: {
        type: String,
        enum: ['agree', 'disagree']
      },
      voter_name: String,
      created_at: String
    }]
  },
  
  // Opinions
  opinions: [opinionSchema],
  
  // IP tracking
  voter_ips: [{
    ip_hash: String,
    vote_count: Number,
    last_vote_at: Date
  }],
  
  // URLs
  public_url: String,
  admin_url: String
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Indexes
debateSchema.index({ created_at: -1 });
debateSchema.index({ start_at: 1, end_at: 1 });
debateSchema.index({ status: 1, is_hidden: 1, is_deleted: 1 });
debateSchema.index({ 'stats.total_votes': -1 });
debateSchema.index({ category: 1, status: 1 });

// Methods
debateSchema.methods.updateStatus = function(): string {
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

debateSchema.methods.canVote = function(ipHash: string): boolean {
  this.updateStatus();
  
  if (this.status !== 'active') return false;
  if (this.is_hidden || this.is_deleted) return false;
  
  // Check IP vote count
  const voterRecord = this.voter_ips.find((v: any) => v.ip_hash === ipHash);
  if (voterRecord && voterRecord.vote_count >= this.settings.max_votes_per_ip) {
    return false;
  }
  
  return true;
};

debateSchema.methods.castVote = async function(
  optionIds: string[], 
  ipHash: string, 
  userInfo: any = {}
): Promise<IDebate> {
  if (!this.canVote(ipHash)) {
    throw new Error('투표할 수 없습니다');
  }
  
  // Validate single/multiple choice
  if (!this.settings.allow_multiple_choice && optionIds.length > 1) {
    throw new Error('단일 선택만 가능합니다');
  }
  
  // Validate options
  const validOptionIds = this.vote_options.map((opt: IVoteOption) => opt.id);
  const invalidOptions = optionIds.filter((id: string) => !validOptionIds.includes(id));
  if (invalidOptions.length > 0) {
    throw new Error('유효하지 않은 옵션입니다');
  }
  
  // Add votes
  for (const optionId of optionIds) {
    const option = this.vote_options.find((opt: IVoteOption) => opt.id === optionId);
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
  
  // Update IP record
  const voterRecord = this.voter_ips.find((v: any) => v.ip_hash === ipHash);
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
  
  // Update statistics
  this.stats.total_votes += optionIds.length;
  this.stats.unique_voters = this.voter_ips.length;
  this.stats.last_vote_at = new Date();
  
  // Update percentages
  this.updatePercentages();
  
  return this.save();
};

debateSchema.methods.updatePercentages = function(): void {
  const totalVotes = this.vote_options.reduce((sum: number, opt: IVoteOption) => sum + opt.vote_count, 0);
  
  this.vote_options.forEach((option: IVoteOption) => {
    option.percentage = totalVotes > 0 
      ? Math.round((option.vote_count / totalVotes) * 100) 
      : 0;
  });
};

debateSchema.methods.addOpinion = async function(
  opinionData: any, 
  ipHash: string
): Promise<IDebate> {
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
  this.stats.opinion_count = this.opinions.filter((op: IOpinion) => !op.is_deleted).length;
  
  return this.save();
};

debateSchema.methods.getResults = function(forceShow = false): any {
  this.updateStatus();
  
  if (!forceShow && !this.settings.show_results_before_end && this.status !== 'ended') {
    return null;
  }
  
  return {
    options: this.vote_options.map((opt: IVoteOption) => ({
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
    return this.start_at.getTime() - now.getTime();
  } else if (this.status === 'active') {
    return this.end_at.getTime() - now.getTime();
  }
  return 0;
});

// Password hashing
debateSchema.pre('save', async function(next) {
  if (this.isModified('admin_password_hash')) {
    this.admin_password_hash = await bcrypt.hash(this.admin_password_hash, 10);
  }
  next();
});

debateSchema.methods.validatePassword = async function(password: string): Promise<boolean> {
  return await bcrypt.compare(password, this.admin_password_hash);
};

// JWT token generation
debateSchema.methods.generateAdminToken = function(): string {
  const payload = {
    debate_id: this.id,
    type: 'debate_admin',
    created_at: new Date()
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '30d' // 30일로 연장
  });
};

// Export model
export default (mongoose.models.Debate as Model<IDebate>) || mongoose.model<IDebate>('Debate', debateSchema);