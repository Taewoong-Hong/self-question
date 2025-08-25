import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IErrorLog extends Document {
  id: string;
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  timestamp: Date;
  type: 'client' | 'server';
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  metadata?: any;
}

const errorLogSchema = new Schema<IErrorLog>({
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => new Date().getTime().toString(36) + Math.random().toString(36).substring(2)
  },
  message: {
    type: String,
    required: true
  },
  stack: String,
  url: String,
  userAgent: String,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  type: {
    type: String,
    enum: ['client', 'server'],
    default: 'client'
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  resolved: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: Schema.Types.Mixed
  }
});

// 인덱스
errorLogSchema.index({ timestamp: -1 });
errorLogSchema.index({ severity: 1, resolved: 1 });

export default (mongoose.models.ErrorLog as Model<IErrorLog>) || mongoose.model<IErrorLog>('ErrorLog', errorLogSchema);