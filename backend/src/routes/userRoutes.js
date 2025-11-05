import express from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";

import User from "../models/User.js";
import Membership from "../models/Membership.js";
import Organization from "../models/Organization.js";
import Invite from "../models/Invite.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireSuper, requireOrgRole } from "../middlewares/roleMiddleware.js";

const router = express.Router();

// ===================================================================
//  ADMIN (org): list users in org (general)
// ===================================================================
router.get("/", authMiddleware, requireOrgRole(["ADMIN"]), async (req, res) => {
  try {
    const { orgId } = req.session;
    if (!orgId) return res.status(400).json({ error: "Organization not found in session" });

    const memberships = await Membership.find({ orgId })
      .populate("userId", "email name isSuper")
      .sort({ createdAt: -1 });

    const users = memberships.map((m) => ({
      userId: m.userId._id,
      email: m.userId.email,
      name: m.userId.name,
      role: m.role,
    }));

    res.json(users);
  } catch (err) {
    console.error("Error in GET /users:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ===================================================================
//  ADMIN (org): list members (explicit endpoint for frontend)
// ===================================================================
router.get("/members", authMiddleware, requireOrgRole(["ADMIN"]), async (req, res) => {
  try {
    const { orgId } = req.session;
    if (!orgId) return res.status(400).json({ error: "Organization not found in session" });

    const members = await Membership.find({ orgId })
      .populate("userId", "email name")
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
    console.error("Error in GET /users/members:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ===================================================================
//  ADMIN (org): change member role (promote/demote within org)
// ===================================================================
router.post("/members/:userId/role", authMiddleware, requireOrgRole(["ADMIN"]), async (req, res) => {
  try {
    const { orgId } = req.session;
    const { userId } = req.params;
    const { role } = req.body; // expects { role: "ADMIN" } or { role: "USER" }

    if (!orgId) return res.status(400).json({ error: "Organization not found in session" });
    if (!["ADMIN", "USER"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const membership = await Membership.findOne({ userId, orgId });
    if (!membership) {
      return res.status(404).json({ error: "Membership not found" });
    }

    membership.role = role;
    await membership.save();

    res.json({ ok: true, message: `User role updated to ${role}` });
  } catch (err) {
    console.error("Error updating member role:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/members/:userId/disable", authMiddleware, requireOrgRole("ADMIN"), async (req, res) => {
  const orgId = req.session.orgId;
  const { userId } = req.params;

  const member = await Membership.findOne({ userId, orgId });
  if (!member) return res.status(404).json({ error: "Membership not found" });

  member.disabled = !member.disabled; // toggle
  await member.save();

  res.json({
    ok: true,
    message: member.disabled ? "User disabled" : "User re-enabled",
    disabled: member.disabled,
  });
});

// ===================================================================
//  ADMIN (org): get all pending invites + tokens for copyable links
// ===================================================================
router.get("/invites", authMiddleware, requireOrgRole(["ADMIN"]), async (req, res) => {
  try {
    const { orgId } = req.session;
    if (!orgId) return res.status(400).json({ error: "Organization not found in session" });

    const invites = await Invite.find({ orgId, accepted: false })
      .sort({ createdAt: -1 })
      .select("email role expiresAt createdAt token");

    const baseUrl = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

    res.json(
      invites.map((i) => ({
        email: i.email,
        role: i.role,
        createdAt: i.createdAt,
        expiresAt: i.expiresAt,
        inviteUrl: `${baseUrl}/invite/${i.token}`,
      }))
    );
  } catch (err) {
    console.error("Error fetching invites:", err);
    res.status(500).json({ error: "Server error" });
  }
});



// ===================================================================
//  ADMIN (org): invite user
// ===================================================================
router.post("/invite", authMiddleware, requireOrgRole(["ADMIN"]), async (req, res) => {
  try {
    const { email } = req.body;
    const { orgId, userId } = req.session;

    if (!email) return res.status(400).json({ error: "Email is required" });
    if (!orgId) return res.status(400).json({ error: "No organization found in session" });

    // Check if already exists
    let user = await User.findOne({ email });
    if (user) {
      const existing = await Membership.findOne({ userId: user._id, orgId });
      if (existing) {
        return res.status(400).json({ error: "User already exists in this organization" });
      }
    }

    // Remove any old invites for this email/org
    await Invite.deleteMany({ email, orgId });

    const token = crypto.randomBytes(32).toString("hex");

    await Invite.create({
      email,
      orgId,
      role: "USER",
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    const inviteUrl = `http://localhost:3000/invite/${token}`;

    res.json({
      ok: true,
      message: `Invite created successfully`,
      inviteUrl,
    });
  } catch (err) {
    console.error("Invite error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// ===================================================================
//  PUBLIC: verify invite token
// ===================================================================
router.get("/invite/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const invite = await Invite.findOne({ token, accepted: false }).populate("orgId", "name");
    if (!invite) return res.status(404).json({ error: "Invalid or expired invite" });

    if (invite.expiresAt < new Date()) {
      return res.status(410).json({ error: "Invite expired" });
    }

    res.json({
      email: invite.email,
      orgId: invite.orgId._id,
      orgName: invite.orgId.name,
      role: invite.role,
    });
  } catch (err) {
    console.error("Error verifying invite:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ===================================================================
//  PUBLIC: accept invite (create user + membership)
// ===================================================================
router.post("/invite/:token/accept", async (req, res) => {
  try {
    const { token } = req.params;
    const { name, password } = req.body;

    const invite = await Invite.findOne({ token, accepted: false });
    if (!invite) return res.status(404).json({ error: "Invalid or expired invite" });
    if (invite.expiresAt < new Date()) {
      return res.status(410).json({ error: "Invite expired" });
    }

    // Create user if not exists
    let user = await User.findOne({ email: invite.email });
    if (!user) {
      user = new User({
        email: invite.email,
        name: name || invite.email.split("@")[0],
        password,      // ⚠️ raw password — pre-save hook will hash it
        isSuper: false,
      });
      await user.save();
    } else {
      // User already exists but might not belong to this org
      if (!user.password && password) {
        // if user created before invite (without password)
        user.password = password;
        await user.save();
      }
    }

    // Add membership if missing
    const existing = await Membership.findOne({ userId: user._id, orgId: invite.orgId });
    if (!existing) {
      await Membership.create({
        userId: user._id,
        orgId: invite.orgId,
        role: invite.role,
      });
    }

    // Mark invite accepted
    invite.accepted = true;
    await invite.save();

    res.json({ ok: true, message: "Invite accepted successfully! You can now log in." });
  } catch (err) {
    console.error("Accept invite error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// ===================================================================
//  SUPER ADMIN: manage admins
// ===================================================================
router.get("/super/admins", authMiddleware, requireSuper(), async (_req, res) => {
  const admins = await Membership.find({ role: "ADMIN" })
    .populate("userId", "email name")
    .populate("orgId", "name");

  const result = admins.map((a) => ({
    userId: a.userId._id,
    email: a.userId.email,
    name: a.userId.name,
    orgId: a.orgId._id,
    orgName: a.orgId.name,
  }));

  res.json(result);
});

// Promote to admin
router.post("/super/admins/add", authMiddleware, requireSuper(), async (req, res) => {
  try {
    const { email, orgId } = req.body;
    if (!email || !orgId) return res.status(400).json({ error: "Email and orgId required" });

    let user = await User.findOne({ email });
    let created = false;

    if (!user) {
      const tempPassword = crypto.randomBytes(6).toString("hex");
      const hashed = await bcrypt.hash(tempPassword, 10);

      user = await User.create({
        email,
        name: email.split("@")[0],
        password: hashed,
        isSuper: false,
      });

      created = true;
    }

    const org = await Organization.findById(orgId);
    if (!org) return res.status(404).json({ error: "Organization not found" });

    await Membership.findOneAndUpdate(
      { userId: user._id, orgId },
      { role: "ADMIN" },
      { upsert: true, new: true }
    );

    res.json({
      ok: true,
      message: created
        ? `User '${email}' created and promoted to Admin in ${org.name}.`
        : `Existing user '${email}' promoted to Admin in ${org.name}.`,
    });
  } catch (err) {
    console.error("Add admin error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Remove admin privileges
router.post("/super/admins/remove", authMiddleware, requireSuper(), async (req, res) => {
  const { email, orgId } = req.body;

  if (!email || !orgId)
    return res.status(400).json({ error: "Email and orgId required" });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "User not found" });

  const member = await Membership.findOne({ userId: user._id, orgId });
  if (!member) return res.status(404).json({ error: "Membership not found" });

  member.role = "USER";
  await member.save();

  res.json({ ok: true, message: `${email} demoted to User in org` });
});

// ===================================================================
//  SUPER ADMIN: manage members + passwords
// ===================================================================
router.get("/super/members/:orgId", authMiddleware, requireSuper(), async (req, res) => {
  const { orgId } = req.params;

  const members = await Membership.find({ orgId })
    .populate("userId", "email name isSuper")
    .populate("orgId", "name");

  res.json(
    members.map((m) => ({
      userId: m.userId._id,
      email: m.userId.email,
      name: m.userId.name,
      role: m.role,
      orgName: m.orgId.name,
    }))
  );
});

router.post("/super/members/:userId/password", authMiddleware, requireSuper(), async (req, res) => {
  const { userId } = req.params;
  const { password } = req.body;

  if (!password || password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters" });

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  user.password = password; // 👈 raw password only
  await user.save();         // 👈 pre-save hook hashes it

  res.json({ ok: true, message: `Password updated for ${user.email}` });
});


export default router;
