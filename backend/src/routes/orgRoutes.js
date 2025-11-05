import express from 'express';
import Organization from '../models/Organization.js';
import Membership from '../models/Membership.js';
import Session from '../models/Session.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requireSuper } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// Create org
router.post('/', authMiddleware, requireSuper(), async (req, res) => {
  const { name } = req.body;
  const org = await Organization.create({ name });
  res.json(org);
});

// List orgs
router.get('/', authMiddleware, requireSuper(), async (_req, res) => {
  const orgs = await Organization.find().sort({ createdAt: -1 });
  res.json(orgs);
});

// Disable org (auto logout all)
router.post('/:id/disable', authMiddleware, requireSuper(), async (req, res) => {
  const { id } = req.params;
  const org = await Organization.findByIdAndUpdate(
    id,
    { status: 'DISABLED', $inc: { authVersion: 1 } },
    { new: true }
  );
  if (!org) return res.status(404).json({ error: 'Not found' });
  await Session.deleteMany({ orgId: id });
  res.json(org);
});

// Enable (reactivate) organization
router.post("/:id/enable", authMiddleware, requireSuper(), async (req, res) => {
  try {
    const { id } = req.params;
    const org = await Organization.findById(id);
    if (!org) return res.status(404).json({ error: "Organization not found" });

    org.status = "ACTIVE";
    org.authVersion = Date.now(); // reset auth version so all sessions refresh
    await org.save();

    res.json({ ok: true, message: `Organization '${org.name}' enabled successfully` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});


// Delete org (soft delete + clear sessions + data)
router.delete('/:id', authMiddleware, requireSuper(), async (req, res) => {
  const { id } = req.params;
  await Session.deleteMany({ orgId: id });
  await Membership.deleteMany({ orgId: id });
  // If you want to wipe items too:
  // await Item.deleteMany({ orgId: id });
  const org = await Organization.findByIdAndUpdate(
    id,
    { status: 'DELETED', $inc: { authVersion: 1 } },
    { new: true }
  );
  if (!org) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

// UNDELETE organization (bring back from DELETED)
router.post("/:id/undelete", authMiddleware, requireSuper(), async (req, res) => {
  try {
    const { id } = req.params;
    const org = await Organization.findById(id);
    if (!org) return res.status(404).json({ error: "Organization not found" });

    if (org.status !== "DELETED") {
      return res.status(400).json({ error: "Organization is not deleted" });
    }

    org.status = "DISABLED"; // restore as disabled
    org.authVersion = Date.now();
    await org.save();

    res.json({ ok: true, message: `Organization '${org.name}' restored (now DISABLED)` });
  } catch (err) {
    console.error("Error undeleting org:", err);
    res.status(500).json({ error: "Server error" });
  }
});


export default router;
