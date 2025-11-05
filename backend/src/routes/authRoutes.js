import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Session from '../models/Session.js';
import Organization from '../models/Organization.js';
import { sign } from '../utils/jwt.js';
import { env } from '../config/env.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import Membership from '../models/Membership.js';

const router = express.Router();

// Sign up (basic)
router.post('/signup', async (req, res) => {
  const { email, password, name } = req.body;
  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ error: 'Email exists' });

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password: hashed, name });
  res.json({ id: user._id, email: user.email });
});

// Login; optionally bind to an org
router.post('/login', async (req, res) => {
  const { email, password, orgId: incomingOrgId } = req.body;

  const user = await User.findOne({ email });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  let orgVersion = null;
  let orgId = incomingOrgId || null;

  if (user.isSuper) {
    // Super admin should not be tied to org
    if (orgId) return res.status(400).json({ error: "Super admin doesn't belong to orgs" });
  } else {
    // Try to auto-detect organization if none supplied
    if (!orgId) {
      const memberships = await Membership.find({ userId: user._id });

      if (!memberships.length) {
        return res.status(403).json({ error: 'No organization found for this user' });
      }

      // choose first membership if multiple
      orgId = memberships[0].orgId.toString();
    }

    // Verify the org
    const org = await Organization.findById(orgId);
    if (!org || org.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Organization is disabled or not found' });
    }

    const member = await Membership.findOne({ userId: user._id, orgId });
    if (!member) return res.status(403).json({ error: 'No access to org' });

    // 🚫 New check — block disabled users
    if (member.disabled) {
      return res.status(403).json({ error: 'Your account has been disabled by the organization admin' });
    }

    orgVersion = org.authVersion;
  }

  // ✅ Create session
  const session = await Session.create({
    userId: user._id,
    orgId: user.isSuper ? null : orgId,
    orgVersion,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });

  // ✅ Set cookie
  res.cookie(env.COOKIE_NAME, sign(session._id), {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({
    ok: true,
    isSuper: user.isSuper,
    userId: user._id,
    orgId: user.isSuper ? null : orgId
  });
});




router.post('/logout', authMiddleware, async (req, res) => {
  await Session.findByIdAndDelete(req.session._id);
  res.clearCookie(env.COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const { userId, orgId } = req.session || {};
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const user = await User.findById(userId).select("_id email name isSuper");
    if (!user) return res.status(404).json({ error: "User not found" });

    let role = null;
    if (orgId) {
      const member = await Membership.findOne({ userId, orgId }).select("role");
      role = member?.role ?? null;
    }

    res.json({ user, orgId: orgId ?? null, role });
  } catch (e) {
    console.error("GET /auth/me error:", e);
    res.status(500).json({ error: "Server error" });
  }
});


export default router;
