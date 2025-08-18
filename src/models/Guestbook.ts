import mongoose, { Schema, Document } from 'mongoose';

export interface IGuestbook extends Document {
  id: string;
  content: string;
  color: string;
  position: {
    x: number;
    y: number;
  };
  author_nickname?: string;
  author_ip: string;
  password_hash?: string;
  created_at: Date;
  is_deleted: boolean;
  z_index?: number;
}

const GuestbookSchema = new Schema<IGuestbook>({
  id: { 
    type: String, 
    required: true, 
    unique: true,
    default: () => `gb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  content: { 
    type: String, 
    required: true,
    maxlength: 200 
  },
  color: { 
    type: String, 
    required: true,
    default: '#FFE500' // 기본 노란색 포스트잇
  },
  position: {
    x: { 
      type: Number, 
      required: true,
      min: 0,
      max: 100 // 퍼센트 단위로 저장
    },
    y: { 
      type: Number, 
      required: true,
      min: 0,
      max: 100 // 퍼센트 단위로 저장
    }
  },
  author_nickname: { 
    type: String,
    maxlength: 20
  },
  author_ip: { 
    type: String, 
    required: true 
  },
  password_hash: {
    type: String,
    required: false
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  },
  is_deleted: { 
    type: Boolean, 
    default: false 
  },
  z_index: {
    type: Number,
    default: 0
  }
});

// 인덱스
GuestbookSchema.index({ created_at: -1 });
GuestbookSchema.index({ is_deleted: 1 });
GuestbookSchema.index({ author_ip: 1 });

const Guestbook = mongoose.models.Guestbook || mongoose.model<IGuestbook>('Guestbook', GuestbookSchema);

export default Guestbook;