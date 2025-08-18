import mongoose, { Schema, Document } from 'mongoose';

export interface IRequest extends Document {
  id: string;
  title: string;
  content: string;
  author_nickname: string;
  author_ip: string;
  password_hash: string;
  is_public: boolean;
  views: number;
  created_at: Date;
  updated_at: Date;
  is_deleted: boolean;
}

const RequestSchema = new Schema<IRequest>({
  id: { 
    type: String, 
    required: true, 
    unique: true,
    default: () => `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  title: { 
    type: String, 
    required: true,
    maxlength: 100 
  },
  content: { 
    type: String, 
    required: true,
    maxlength: 2000 
  },
  author_nickname: { 
    type: String,
    required: true,
    maxlength: 20
  },
  author_ip: { 
    type: String, 
    required: true 
  },
  password_hash: {
    type: String,
    required: true
  },
  is_public: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  is_deleted: { 
    type: Boolean, 
    default: false 
  }
});

// 인덱스
RequestSchema.index({ created_at: -1 });
RequestSchema.index({ is_deleted: 1, is_public: 1 });
RequestSchema.index({ author_nickname: 1 });

const Request = mongoose.models.Request || mongoose.model<IRequest>('Request', RequestSchema);

export default Request;