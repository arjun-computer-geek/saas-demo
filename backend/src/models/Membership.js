import mongoose from 'mongoose';
const membershipSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
  role: { type: String, enum: ['ADMIN','USER'], default: 'USER' },
  disabled: { type: Boolean, default: false }, // 👈 NEW FIELD
}, { timestamps: true });

membershipSchema.index({ userId: 1, orgId: 1 }, { unique: true });

export default mongoose.model('Membership', membershipSchema);
