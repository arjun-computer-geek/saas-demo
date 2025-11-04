import mongoose from 'mongoose';

const DomainSchema = new mongoose.Schema({
  domain: { type: String, required: true, unique: true },
  verified: { type: Boolean, default: false },
});

const OrgSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  isDisabled: { type: Boolean, default: false },
  featureFlags: { type: Map, of: Boolean, default: {} },
  domains: { type: [DomainSchema], default: [] },
}, { timestamps: true });

export default mongoose.models.Org || mongoose.model('Org', OrgSchema);

