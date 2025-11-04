import mongoose from 'mongoose';

const InviteSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Org', required: true },
  role: { type: String, enum: ['admin', 'user'], required: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  acceptedAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.models.Invite || mongoose.model('Invite', InviteSchema);

