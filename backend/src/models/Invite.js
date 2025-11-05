import mongoose from 'mongoose';
const inviteSchema = new mongoose.Schema({
  token: { type: String, unique: true, index: true },
  email: String,
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
  role: { type: String, enum: ['ADMIN','USER'], default: 'USER' },
  expiresAt: Date,
  accepted: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Invite', inviteSchema);
