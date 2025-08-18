import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export interface IAdmin extends mongoose.Document {
  username: string;
  password_hash: string;
  email: string;
  role: 'super_admin' | 'admin';
  last_login?: Date;
  is_active: boolean;
  created_at: Date;
  validatePassword(password: string): Promise<boolean>;
  generateAuthToken(): string;
}

const AdminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  password_hash: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin'],
    default: 'admin'
  },
  last_login: {
    type: Date,
    default: null
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// 인덱스
AdminSchema.index({ username: 1 });
AdminSchema.index({ email: 1 });

// 메서드
AdminSchema.methods.validatePassword = async function(password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password_hash);
};

AdminSchema.methods.generateAuthToken = function(): string {
  return jwt.sign(
    {
      adminId: this._id,
      username: this.username,
      role: this.role,
      type: 'admin_auth'
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );
};

// 비밀번호 해싱 미들웨어
AdminSchema.pre('save', async function(next) {
  if (!this.isModified('password_hash')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password_hash = await bcrypt.hash(this.password_hash, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

export default mongoose.models.Admin || mongoose.model<IAdmin>('Admin', AdminSchema);