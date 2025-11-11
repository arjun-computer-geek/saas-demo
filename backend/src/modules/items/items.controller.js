import Item from '../../models/Item.js';

/**
 * List items for the authenticated user's organization.
 */
export async function listItems(req, res) {
  const orgId = req.auth?.orgId;
  const items = await Item.find({ orgId }).sort({ createdAt: -1 });
  res.json(items);
}

/**
 * Create a new item within the current organization.
 */
export async function createItem(req, res) {
  const orgId = req.auth?.orgId;
  const { title, content } = req.body;
  const item = await Item.create({
    orgId,
    title,
    content,
    createdBy: req.auth?.userId,
  });
  res.json(item);
}

/**
 * Update an existing item, ensuring ownership by org.
 */
export async function updateItem(req, res) {
  const orgId = req.auth?.orgId;
  const { id } = req.params;
  const { title, content } = req.body;
  const item = await Item.findById(id);
  if (!item || String(item.orgId) !== String(orgId)) {
    return res.status(404).json({ error: 'Not found' });
  }

  item.title = title ?? item.title;
  item.content = content ?? item.content;
  await item.save();
  res.json(item);
}

/**
 * Delete an item belonging to the current organization.
 */
export async function deleteItem(req, res) {
  const orgId = req.auth?.orgId;
  const { id } = req.params;
  const item = await Item.findById(id);
  if (!item || String(item.orgId) !== String(orgId)) {
    return res.status(404).json({ error: 'Not found' });
  }

  await Item.findByIdAndDelete(id);
  res.json({ ok: true });
}

