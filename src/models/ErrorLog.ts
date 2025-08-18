import mongoose from 'mongoose';

export interface IErrorLog extends mongoose.Document {
  error_code: string;
  error_message: string;
  error_stack?: string;
  error_type: 'system' | 'api' | 'database' | 'validation' | 'authentication' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  endpoint?: string;
  method?: string;
  user_ip?: string;
  user_agent?: string;
  request_body?: any;
  response_status?: number;
  resolved: boolean;
  resolved_at?: Date;
  resolved_by?: string;
  notes?: string;
  created_at: Date;
}

const ErrorLogSchema = new mongoose.Schema({
  error_code: {
    type: String,
    required: true,
    index: true
  },
  error_message: {
    type: String,
    required: true
  },
  error_stack: {
    type: String,
    default: null
  },
  error_type: {
    type: String,
    enum: ['system', 'api', 'database', 'validation', 'authentication', 'unknown'],
    default: 'unknown',
    index: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  endpoint: {
    type: String,
    default: null
  },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    default: null
  },
  user_ip: {
    type: String,
    default: null
  },
  user_agent: {
    type: String,
    default: null
  },
  request_body: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  response_status: {
    type: Number,
    default: null
  },
  resolved: {
    type: Boolean,
    default: false,
    index: true
  },
  resolved_at: {
    type: Date,
    default: null
  },
  resolved_by: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// 복합 인덱스
ErrorLogSchema.index({ created_at: -1, severity: 1 });
ErrorLogSchema.index({ error_type: 1, resolved: 1 });

export default mongoose.models.ErrorLog || mongoose.model<IErrorLog>('ErrorLog', ErrorLogSchema);