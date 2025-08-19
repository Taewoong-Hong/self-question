import mongoose, { Document, Model, Schema } from 'mongoose';
import crypto from 'crypto';

export interface IVote extends Document {
  id: string;
  debate_id: string;
  debate_ref: mongoose.Types.ObjectId;
  
  // Voter info
  voter_ip: string;
  voter_ip_hash: string;
  voter_name?: string;
  
  // Vote data
  vote_type: 'agree' | 'disagree';
  opinion?: string;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}

const voteSchema = new Schema<IVote>({
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => crypto.randomBytes(8).toString('hex')
  },
  debate_id: {
    type: String,
    required: true,
    index: true
  },
  debate_ref: {
    type: Schema.Types.ObjectId,
    ref: 'Debate',
    required: true
  },
  
  // Voter info
  voter_ip: {
    type: String,
    required: true
  },
  voter_ip_hash: {
    type: String,
    required: true,
    index: true
  },
  voter_name: String,
  
  // Vote data
  vote_type: {
    type: String,
    required: true,
    enum: ['agree', 'disagree']
  },
  opinion: String
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Compound index to prevent duplicate votes
voteSchema.index({ debate_id: 1, voter_ip_hash: 1 }, { unique: true });

// Hash IP before saving
voteSchema.pre('save', function(next) {
  if (this.isNew && this.voter_ip) {
    this.voter_ip_hash = crypto
      .createHash('sha256')
      .update(this.voter_ip + (process.env.IP_SALT || 'default-salt'))
      .digest('hex');
  }
  next();
});

export default (mongoose.models.Vote as Model<IVote>) || mongoose.model<IVote>('Vote', voteSchema);