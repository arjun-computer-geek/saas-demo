import Organization from '../../models/Organization.js';
import Membership from '../../models/Membership.js';
import {
  markOrgDisabled,
  markOrgEnabled,
  revokeOrgRefreshTokens,
  setOrgVersion,
} from '../../services/tokenService.js';

/**
 * Super admin: create a new organization.
 */
export async function createOrganization(req, res) {
  const { name } = req.body;
  const org = await Organization.create({ name });
  res.json(org);
}

/**
 * Super admin: list all organizations.
 */
export async function listOrganizations(_req, res) {
  const orgs = await Organization.find().sort({ createdAt: -1 });
  res.json(orgs);
}

/**
 * Super admin: disable an organization and clear active sessions.
 */
export async function disableOrganization(req, res) {
  const { id } = req.params;
  const org = await Organization.findByIdAndUpdate(
    id,
    { status: 'DISABLED', $inc: { authVersion: 1 } },
    { new: true },
  );
  if (!org) return res.status(404).json({ error: 'Not found' });
  await revokeOrgRefreshTokens(id);
  await markOrgDisabled(id);
  await setOrgVersion(id, org.authVersion);
  res.json(org);
}

/**
 * Super admin: reactivate a disabled organization.
 */
export async function enableOrganization(req, res) {
  try {
    const { id } = req.params;
    const org = await Organization.findById(id);
    if (!org) return res.status(404).json({ error: 'Organization not found' });

    org.status = 'ACTIVE';
    org.authVersion = Date.now();
    await org.save();
    await markOrgEnabled(id);
    await setOrgVersion(id, org.authVersion);

    res.json({ ok: true, message: `Organization '${org.name}' enabled successfully` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Super admin: soft delete an organization and remove memberships.
 */
export async function deleteOrganization(req, res) {
  const { id } = req.params;
  await Membership.deleteMany({ orgId: id });
  const org = await Organization.findByIdAndUpdate(
    id,
    { status: 'DELETED', $inc: { authVersion: 1 } },
    { new: true },
  );
  if (!org) return res.status(404).json({ error: 'Not found' });
  await revokeOrgRefreshTokens(id);
  await markOrgDisabled(id);
  await setOrgVersion(id, org.authVersion);
  res.json({ ok: true });
}

/**
 * Super admin: restore a previously deleted organization (now disabled).
 */
export async function undeleteOrganization(req, res) {
  try {
    const { id } = req.params;
    const org = await Organization.findById(id);
    if (!org) return res.status(404).json({ error: 'Organization not found' });

    if (org.status !== 'DELETED') {
      return res.status(400).json({ error: 'Organization is not deleted' });
    }

    org.status = 'DISABLED';
    org.authVersion = Date.now();
    await org.save();
    await markOrgDisabled(id);
    await setOrgVersion(id, org.authVersion);

    res.json({ ok: true, message: `Organization '${org.name}' restored (now DISABLED)` });
  } catch (err) {
    console.error('Error undeleting org:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

