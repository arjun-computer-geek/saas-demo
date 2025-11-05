import express from 'express';
import crypto from 'crypto';
import Invite from '../models/Invite.js';
import Membership from '../models/Membership.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requireOrgRole } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// ADMIN: create invite
router.post('/', authMiddleware, requireOrgRole('ADMIN'), async (req, res) => {
  const orgId = req.session.orgId;
  const { email, role } = req.body;
  if (!['ADMIN','USER'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

  const token = crypto.randomBytes(24).toString('hex');
  const invite = await Invite.create({
    token, email, orgId, role,
    expiresAt: new Date(Date.now() + 7*24*60*60*1000)
  });
  // Email send would go here
  res.json({ token });
});

// PUBLIC: accept invite
router.post('/accept/:token', async (req, res) => {
  const { token } = req.params;
  const { name, password } = req.body;
  const inv = await Invite.findOne({ token });
  if (!inv || inv.expiresAt < new Date() || inv.accepted) {
    return res.status(400).json({ error: 'Invalid invite' });
  }

  let user = await User.findOne({ email: inv.email });
  if (!user) {
    user = await User.create({
      email: inv.email,
      name,
      password: await bcrypt.hash(password, 10)
    });
  }

  await Membership.findOneAndUpdate(
    { userId: user._id, orgId: inv.orgId },
    { role: inv.role },
    { upsert: true, new: true }
  );

  inv.accepted = true;
  await inv.save();

  res.json({ ok: true });
});

export default router;
