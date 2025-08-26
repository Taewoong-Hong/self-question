import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IComment extends Document {
  contentType: 'debate' | 'question';
  contentId: string; // 16자리 hex string ID
  nickname: string;
  password: string;
  content: string;
  parentId?: mongoose.Types.ObjectId; // 대댓글 지원
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const CommentSchema = new Schema<IComment>({
  contentType: {
    type: String,
    required: true,
    enum: ['debate', 'question']
  },
  contentId: {
    type: String,
    required: true,
    match: /^[a-f0-9]{16}$/i
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
  content: {
    type: String,
    required: true,
    maxlength: 500
  },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'Comment'
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// 인덱스 설정
CommentSchema.index({ contentType: 1, contentId: 1 });
CommentSchema.index({ parentId: 1 });

// 비밀번호 해싱
CommentSchema.pre('save', async function(next) {
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
CommentSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema);