import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../../models/User.js';
import Membership from '../../models/Membership.js';
import Organization from '../../models/Organization.js';
import Invite from '../../models/Invite.js';
import { env } from '../../config/env.js';

/**
 * Admin: list members for the current organization.
 */
export async function listOrgUsers(req, res) {
  try {
    const { orgId } = req.auth || {};
    if (!orgId) return res.status(400).json({ error: 'Organization not found in session' });

    const memberships = await Membership.find({ orgId })
      .populate('userId', 'email name isSuper')
      .sort({ createdAt: -1 });

    const users = memberships.map((m) => ({
      userId: m.userId._id,
      email: m.userId.email,
      name: m.userId.name,
      role: m.role,
    }));

    res.json(users);
  } catch (err) {
    console.error('Error in GET /users:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Admin: list detailed membership records for management UI.
 */
export async function listMembers(req, res) {
  try {
    const { orgId } = req.auth || {};
    if (!orgId) return res.status(400).json({ error: 'Organization not found in session' });

    const members = await Membership.find({ orgId })
      .populate('userId', 'email name')
      .sort({ createdAt: -1 });

    const formatted = members.map((m) => ({
      _id: m._id,
      userId: String(m.userId._id),
      user: { email: m.userId.email, name: m.userId.name },
      disabled: m.disabled || false,
      role: m.role,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error in GET /users/members:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Admin: promote/demote a member within the organization.
 */
export async function updateMemberRole(req, res) {
  try {
    const { orgId } = req.auth || {};
    const { userId } = req.params;
    const { role } = req.body;

    if (!orgId) return res.status(400).json({ error: 'Organization not found in session' });
    if (!['ADMIN', 'USER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const membership = await Membership.findOne({ userId, orgId });
    if (!membership) {
      return res.status(404).json({ error: 'Membership not found' });
    }

    membership.role = role;
    await membership.save();

    res.json({ ok: true, message: `User role updated to ${role}` });
  } catch (err) {
    console.error('Error updating member role:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Admin: toggle a member active/disabled.
 */
export async function toggleMemberDisabled(req, res) {
  const orgId = req.auth?.orgId;
  const { userId } = req.params;

  const member = await Membership.findOne({ userId, orgId });
  if (!member) return res.status(404).json({ error: 'Membership not found' });

  member.disabled = !member.disabled;
  await member.save();

  res.json({
    ok: true,
    message: member.disabled ? 'User disabled' : 'User re-enabled',
    disabled: member.disabled,
  });
}

/**
 * Admin: list pending invites for the current org.
 */
export async function listInvites(req, res) {
  try {
    const { orgId } = req.auth || {};
    if (!orgId) return res.status(400).json({ error: 'Organization not found in session' });

    const invites = await Invite.find({ orgId, accepted: false })
      .sort({ createdAt: -1 })
      .select('email role expiresAt createdAt token');

    const baseUrl = env.FRONTEND_ORIGIN || 'http://localhost:3000';

    res.json(
      invites.map((i) => ({
        email: i.email,
        role: i.role,
        createdAt: i.createdAt,
        expiresAt: i.expiresAt,
        inviteUrl: `${baseUrl}/invite/${i.token}`,
      })),
    );
  } catch (err) {
    console.error('Error fetching invites:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Admin: send a new invite to join the organization.
 */
export async function createInvite(req, res) {
  try {
    const { email } = req.body;
    const { orgId, userId } = req.auth || {};

    if (!email) return res.status(400).json({ error: 'Email is required' });
    if (!orgId) return res.status(400).json({ error: 'No organization found in session' });

    let user = await User.findOne({ email });
    if (user) {
      const existing = await Membership.findOne({ userId: user._id, orgId });
      if (existing) {
        return res.status(400).json({ error: 'User already exists in this organization' });
      }
    }

    await Invite.deleteMany({ email, orgId });

    const token = crypto.randomBytes(32).toString('hex');

    await Invite.create({
      email,
      orgId,
      role: 'USER',
      token,
      createdBy: userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const inviteUrl = `${env.FRONTEND_ORIGIN}/invite/${token}`;

    res.json({
      ok: true,
      message: `Invite created successfully`,
      inviteUrl,
    });
  } catch (err) {
    console.error('Invite error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Public: fetch invite metadata for the landing page.
 */
export async function getInviteDetails(req, res) {
  try {
    const { token } = req.params;

    const invite = await Invite.findOne({ token, accepted: false }).populate('orgId', 'name');
    if (!invite) return res.status(404).json({ error: 'Invalid or expired invite' });

    if (invite.expiresAt < new Date()) {
      return res.status(410).json({ error: 'Invite expired' });
    }

    res.json({
      email: invite.email,
      orgId: invite.orgId._id,
      orgName: invite.orgId.name,
      role: invite.role,
    });
  } catch (err) {
    console.error('Error verifying invite:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Public: accept invite, provisioning user + membership.
 */
export async function acceptInvite(req, res) {
  try {
    const { token } = req.params;
    const { name, password } = req.body;

    const invite = await Invite.findOne({ token, accepted: false });
    if (!invite) return res.status(404).json({ error: 'Invalid or expired invite' });
    if (invite.expiresAt < new Date()) {
      return res.status(410).json({ error: 'Invite expired' });
    }

    let user = await User.findOne({ email: invite.email });
    if (!user) {
      user = new User({
        email: invite.email,
        name: name || invite.email.split('@')[0],
        password,
        isSuper: false,
      });
      await user.save();
    } else if (!user.password && password) {
      user.password = password;
      await user.save();
    }

    const existing = await Membership.findOne({ userId: user._id, orgId: invite.orgId });
    if (!existing) {
      await Membership.create({
        userId: user._id,
        orgId: invite.orgId,
        role: invite.role,
      });
    }

    invite.accepted = true;
    await invite.save();

    res.json({ ok: true, message: 'Invite accepted successfully! You can now log in.' });
  } catch (err) {
    console.error('Accept invite error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Super admin: view all admins across orgs.
 */
export async function listAdmins(req, res) {
  const admins = await Membership.find({ role: 'ADMIN' })
    .populate('userId', 'email name')
    .populate('orgId', 'name');

  const result = admins.map((a) => ({
    userId: a.userId._id,
    email: a.userId.email,
    name: a.userId.name,
    orgId: a.orgId._id,
    orgName: a.orgId.name,
  }));

  res.json(result);
}

/**
 * Super admin: promote or create a platform admin for an org.
 */
export async function addAdmin(req, res) {
  try {
    const { email, orgId } = req.body;
    if (!email || !orgId) return res.status(400).json({ error: 'Email and orgId required' });

    let user = await User.findOne({ email });
    let created = false;

    if (!user) {
      const tempPassword = crypto.randomBytes(6).toString('hex');
      const hashed = await bcrypt.hash(tempPassword, 10);

      user = await User.create({
        email,
        name: email.split('@')[0],
        password: hashed,
        isSuper: false,
      });

      created = true;
    }

    const org = await Organization.findById(orgId);
    if (!org) return res.status(404).json({ error: 'Organization not found' });

    await Membership.findOneAndUpdate(
      { userId: user._id, orgId },
      { role: 'ADMIN' },
      { upsert: true, new: true },
    );

    res.json({
      ok: true,
      message: created
        ? `User '${email}' created and promoted to Admin in ${org.name}.`
        : `Existing user '${email}' promoted to Admin in ${org.name}.`,
    });
  } catch (err) {
    console.error('Add admin error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Super admin: demote an admin back to regular user.
 */
export async function removeAdmin(req, res) {
  const { email, orgId } = req.body;

  if (!email || !orgId) return res.status(400).json({ error: 'Email and orgId required' });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const member = await Membership.findOne({ userId: user._id, orgId });
  if (!member) return res.status(404).json({ error: 'Membership not found' });

  member.role = 'USER';
  await member.save();

  res.json({ ok: true, message: `${email} demoted to User in org` });
}

/**
 * Super admin: list all members for a given organization.
 */
export async function listOrgMembersForSuper(req, res) {
  const { orgId } = req.params;

  const members = await Membership.find({ orgId })
    .populate('userId', 'email name isSuper')
    .populate('orgId', 'name');

  res.json(
    members.map((m) => ({
      userId: m.userId._id,
      email: m.userId.email,
      name: m.userId.name,
      role: m.role,
      orgName: m.orgId.name,
    })),
  );
}

/**
 * Super admin: reset a member password.
 */
export async function updateMemberPassword(req, res) {
  const { userId } = req.params;
  const { password } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.password = password;
  await user.save();

  res.json({ ok: true, message: `Password updated for ${user.email}` });
}

