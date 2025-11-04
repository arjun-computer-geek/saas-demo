import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  name: { type: String },
  passwordHash: { type: String },
  role: { type: String, enum: ['super_admin', 'admin', 'user'], required: true },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Org' },
  isDisabled: { type: Boolean, default: false },
  featureFlags: { type: Map, of: Boolean, default: {} },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);

