import express from "express";
import Item from "../models/Item.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireOrgRole } from "../middlewares/roleMiddleware.js";

const router = express.Router();

// List items
router.get("/", authMiddleware, requireOrgRole(["USER", "ADMIN"]), async (req, res) => {
  const orgId = req.session.orgId;
  const items = await Item.find({ orgId }).sort({ createdAt: -1 });
  res.json(items);
});

// Create item
router.post("/", authMiddleware, requireOrgRole(["USER", "ADMIN"]), async (req, res) => {
  const orgId = req.session.orgId;
  const { title, content } = req.body;
  const item = await Item.create({
    orgId,
    title,
    content,
    createdBy: req.session.userId,
  });
  res.json(item);
});

// Update item
router.put("/:id", authMiddleware, requireOrgRole(["USER", "ADMIN"]), async (req, res) => {
  const orgId = req.session.orgId;
  const { id } = req.params;
  const { title, content } = req.body;
  const item = await Item.findById(id);
  if (!item || String(item.orgId) !== String(orgId))
    return res.status(404).json({ error: "Not found" });

  item.title = title ?? item.title;
  item.content = content ?? item.content;
  await item.save();
  res.json(item);
});

// Delete item
router.delete("/:id", authMiddleware, requireOrgRole(["USER", "ADMIN"]), async (req, res) => {
  const orgId = req.session.orgId;
  const { id } = req.params;
  const item = await Item.findById(id);
  if (!item || String(item.orgId) !== String(orgId))
    return res.status(404).json({ error: "Not found" });

  await Item.findByIdAndDelete(id);
  res.json({ ok: true });
});

export default router;
