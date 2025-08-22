import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IAdminAnswer {
  content: string;
  answeredAt: Date;
  answeredBy: string;
}

export interface IQuestion extends Document {
  title: string;
  content: string;
  nickname: string;
  password: string;
  category?: string;
  tags?: string[];
  views: number;
  ipAddress: string;
  status: 'pending' | 'answered' | 'closed';
  adminAnswer?: IAdminAnswer;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const QuestionSchema = new Schema<IQuestion>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  nickname: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20
  },
  password: {
    type: String,
    required: true
  },
  category: {
    type: String,
    maxlength: 50
  },
  tags: [{
    type: String,
    maxlength: 20
  }],
  views: {
    type: Number,
    default: 0
  },
  ipAddress: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'answered', 'closed'],
    default: 'pending'
  },
  adminAnswer: {
    content: {
      type: String,
      maxlength: 5000
    },
    answeredAt: {
      type: Date
    },
    answeredBy: {
      type: String,
      default: 'Admin'
    }
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// 인덱스 설정
QuestionSchema.index({ status: 1, createdAt: -1 });
QuestionSchema.index({ nickname: 1 });
QuestionSchema.index({ tags: 1 });

// 비밀번호 해싱
QuestionSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// 비밀번호 비교 메서드
QuestionSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);