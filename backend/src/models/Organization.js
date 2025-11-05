import mongoose from 'mongoose';
const orgSchema = new mongoose.Schema({
  name: { type: String, required: true },
  status: { type: String, enum: ['ACTIVE','DISABLED','DELETED'], default: 'ACTIVE' },
  authVersion: { type: Number, default: 1 }
}, { timestamps: true });

export default mongoose.model('Organization', orgSchema);
