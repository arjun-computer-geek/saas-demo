import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '../lib/db.js';
import User from '../models/User.js';
import Org from '../models/Org.js';
import { verifyPassword, hashPassword } from '../lib/crypto.js';
import Invite from '../models/Invite.js';
import { generateToken } from '../lib/crypto.js';
import Todo from '../models/Todo.js';

const app = express();
const PORT = process.env.API_PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || [ 'http://localhost:3000' ], credentials: false }));

// Auth middleware
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

// Tenant enforcement by domain for org-scoped routes
async function requireTenantDomain(req, res, next) {
  try {
    if (!req.user || !req.user.orgId) return res.status(400).json({ error: 'Org context required' });
    const host = req.headers['x-org-domain'];
    if (!host) return res.status(400).json({ error: 'Missing x-org-domain' });
    await connectToDatabase();
    const org = await Org.findById(req.user.orgId);
    if (!org) return res.status(404).json({ error: 'Org not found' });
    console.log('org', org);
    console.log('host', host);
    const allowed = (org.domains || []).some(d => (d.domain || '').toLowerCase() === String(host).toLowerCase());
    if (!allowed) return res.status(403).json({ error: 'Domain not allowed for org' });
    if (org.isDisabled) return res.status(403).json({ error: 'Org disabled' });
    next();
  } catch (e) {
    return res.status(500).json({ error: 'Tenant check failed' });
  }
}

// Health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Create to do 
app.post('/api/todos', requireAuth, requireRole('user'), async (req, res) => {
  const { title, description } = req.body || {};
  if (!title || !description) return res.status(400).json({ error: 'title and description required' });
  await connectToDatabase();
  const todo = await Todo.create({ title, description, userId: req.user.id });
  res.status(201).json({ todo });
});

// Get all todos
app.get('/api/todos', requireAuth, requireRole('user'), async (req, res) => {
  await connectToDatabase();
  const todos = await Todo.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();
  res.json({ todos });
});

// Update a todo
app.put('/api/todos/:id', requireAuth, requireRole('user'), async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body || {};
  if (!title || !description) return res.status(400).json({ error: 'title and description required' });
  await connectToDatabase();
  const todo = await Todo.findByIdAndUpdate(id, { title, description }, { new: true });
  res.json({ todo });
});

// Delete a todo
app.delete('/api/todos/:id', requireAuth, requireRole('user'), async (req, res) => {
  const { id } = req.params;
  await connectToDatabase();
  await Todo.findByIdAndDelete(id);
  res.json({ message: 'Todo deleted' });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });
  await connectToDatabase();
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  if (user.isDisabled) return res.status(403).json({ error: 'User disabled' });
  if (user.orgId) {
    const org = await Org.findById(user.orgId);
    if (org?.isDisabled) return res.status(403).json({ error: 'Org disabled' });
  }
  const token = jwt.sign({ id: String(user._id), role: user.role, orgId: user.orgId ? String(user.orgId) : null }, JWT_SECRET, { expiresIn: '1d' });
  res.json({ token, role: user.role, orgId: user.orgId ? String(user.orgId) : null });
});

// Super admin: Orgs
app.get('/api/super/orgs', requireAuth, requireRole('super_admin'), async (req, res) => {
  await connectToDatabase();
  const orgs = await Org.find({}).sort({ createdAt: -1 }).lean();
  res.json({ orgs });
});

app.post('/api/super/orgs', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { name, slug, domain } = req.body || {};
  if (!name || !slug || !domain) return res.status(400).json({ error: 'name, slug, domain required' });
  await connectToDatabase();
  const exists = await Org.findOne({ $or: [ { slug }, { 'domains.domain': domain } ] });
  if (exists) return res.status(409).json({ error: 'Org or domain exists' });
  const org = await Org.create({ name, slug, domains: [ { domain, verified: false } ] });
  res.status(201).json({ org });
});

// Super admin: Update org (disable/enable, domains, feature flags)
app.patch('/api/super/orgs/:id', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { id } = req.params;
  const { isDisabled, addDomain, removeDomain, featureFlags } = req.body || {};
  await connectToDatabase();
  const org = await Org.findById(id);
  if (!org) return res.status(404).json({ error: 'Org not found' });
  if (typeof isDisabled === 'boolean') org.isDisabled = isDisabled;
  if (addDomain) {
    if (org.domains.find(d => d.domain === addDomain)) return res.status(409).json({ error: 'Domain exists' });
    const domainTaken = await Org.findOne({ 'domains.domain': addDomain });
    if (domainTaken) return res.status(409).json({ error: 'Domain in use' });
    org.domains.push({ domain: addDomain, verified: false });
  }
  if (removeDomain) {
    org.domains = org.domains.filter(d => d.domain !== removeDomain);
  }
  if (featureFlags && typeof featureFlags === 'object') {
    Object.entries(featureFlags).forEach(([k, v]) => { org.featureFlags.set(k, Boolean(v)); });
  }
  await org.save();
  res.json({ org });
});

// Super admin: Create admin user in an org
app.post('/api/super/admins', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { orgId, email, password, name } = req.body || {};
  if (!orgId || !email || !password) return res.status(400).json({ error: 'orgId, email, password required' });
  await connectToDatabase();
  const org = await Org.findById(orgId);
  if (!org) return res.status(404).json({ error: 'Org not found' });
  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ error: 'User exists' });
  const passwordHash = await hashPassword(password);
  const user = await User.create({ email, name: name || 'Admin', passwordHash, role: 'admin', orgId: org._id });
  res.status(201).json({ user: { id: String(user._id), email: user.email } });
});

// Admin: list org users
app.get('/api/admin/users', requireAuth, requireRole('admin'), requireTenantDomain, async (req, res) => {
  await connectToDatabase();
  const users = await User.find({ orgId: req.user.orgId }).sort({ createdAt: -1 }).lean();
  res.json({ users });
});

// Admin: update user (disable, feature flags)
app.patch('/api/admin/users/:id', requireAuth, requireRole('admin'), requireTenantDomain, async (req, res) => {
  const { id } = req.params;
  const { isDisabled, featureFlags } = req.body || {};
  await connectToDatabase();
  const user = await User.findById(id);
  if (!user || String(user.orgId) !== String(req.user.orgId)) return res.status(404).json({ error: 'User not found' });
  if (typeof isDisabled === 'boolean') user.isDisabled = isDisabled;
  if (featureFlags && typeof featureFlags === 'object') {
    Object.entries(featureFlags).forEach(([k, v]) => { user.featureFlags.set(k, Boolean(v)); });
  }
  await user.save();
  res.json({ user });
});

// Admin: create invite
app.post('/api/admin/invites', requireAuth, requireRole('admin'), requireTenantDomain, async (req, res) => {
  const { email, role } = req.body || {};
  if (!email || !role || !['admin', 'user'].includes(role)) return res.status(400).json({ error: 'email and role required' });
  await connectToDatabase();
  const token = generateToken(16);
  const expiresAt = new Date(Date.now() + 1000*60*60*24*7); // 7 days
  const invite = await Invite.create({ email, orgId: req.user.orgId, role, token, expiresAt, createdBy: req.user.id });
  // In production, send email with invite link
  res.status(201).json({ invite: { token: invite.token, email: invite.email, role: invite.role, expiresAt: invite.expiresAt } });
});

// Public: accept invite
app.post('/api/invites/accept', async (req, res) => {
  const { token, name, password } = req.body || {};
  if (!token || !password) return res.status(400).json({ error: 'token and password required' });
  await connectToDatabase();
  const invite = await Invite.findOne({ token });
  if (!invite) return res.status(404).json({ error: 'Invalid invite' });
  if (invite.expiresAt < new Date()) return res.status(410).json({ error: 'Invite expired' });
  const exists = await User.findOne({ email: invite.email });
  if (exists) return res.status(409).json({ error: 'User already exists' });
  const passwordHash = await hashPassword(password);
  const user = await User.create({ email: invite.email, name: name || 'User', passwordHash, role: invite.role, orgId: invite.orgId });
  invite.acceptedAt = new Date();
  await invite.save();
  res.status(201).json({ user: { id: String(user._id), email: user.email } });
});

// Me: profile
app.get('/api/me', requireAuth, requireTenantDomain, async (req, res) => {
  await connectToDatabase();
  const user = await User.findById(req.user.id).lean();
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({ id: String(user._id), email: user.email, role: user.role, orgId: user.orgId ? String(user.orgId) : null });
});

// Me: feature flags (effective org+user)
app.get('/api/me/features', requireAuth, requireTenantDomain, async (req, res) => {
  await connectToDatabase();
  const user = await User.findById(req.user.id);
  const org = user?.orgId ? await Org.findById(user.orgId) : null;
  const flags = new Map();
  if (org?.featureFlags) for (const [k, v] of org.featureFlags.entries()) flags.set(k, v);
  if (user?.featureFlags) for (const [k, v] of user.featureFlags.entries()) flags.set(k, v);
  res.json({ features: Object.fromEntries(flags) });
});

// Seed super admin on startup if env provided
async function ensureSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!email || !password) return;
  await connectToDatabase();
  let user = await User.findOne({ email });
  if (!user) {
    const passwordHash = await hashPassword(password);
    user = await User.create({ email, name: 'Super Admin', passwordHash, role: 'super_admin' });
    // eslint-disable-next-line no-console
    console.log('Created super admin:', email);
  }
}

app.listen(PORT, async () => {
  await ensureSuperAdmin();
  // eslint-disable-next-line no-console
  console.log(`API server listening on http://localhost:${PORT}`);
});


