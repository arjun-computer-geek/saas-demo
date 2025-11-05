import mongoose from 'mongoose';
const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
  orgVersion: Number,
  expiresAt: Date
}, { timestamps: true });

export default mongoose.model('Session', sessionSchema);
