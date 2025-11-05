import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env.js';
import User from '../src/models/User.js';
import Organization from '../src/models/Organization.js';
import Membership from '../src/models/Membership.js';

await mongoose.connect(env.MONGO_URI);

const email = 'super@example.com';
const password = bcrypt.hashSync('password', 10);

let user = await User.findOne({ email });
if (!user) user = await User.create({ email, password, isSuper: true });

const org = await Organization.create({ name: 'Demo Org' });
await Membership.create({ userId: user._id, orgId: org._id, role: 'ADMIN' });

console.log('Seeded:\nSuper:', email, '/ password\nOrg:', org.name, org._id.toString());
await mongoose.disconnect();
process.exit(0);
