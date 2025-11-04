import { headers } from 'next/headers';
import { connectToDatabase } from './db';
import Org from '../models/Org';

export async function resolveTenant() {
  const hdrs = headers();
  const host = hdrs.get('x-tenant-host') || hdrs.get('host') || '';
  if (!host) return null;
  await connectToDatabase();
  const domain = host.toLowerCase();
  const org = await Org.findOne({ 'domains.domain': domain });
  return org;
}

export function effectiveFeatureFlags(user, org) {
  const flags = new Map();
  if (org?.featureFlags) {
    for (const [k, v] of org.featureFlags.entries()) flags.set(k, v);
  }
  if (user?.featureFlags) {
    for (const [k, v] of user.featureFlags.entries()) flags.set(k, v);
  }
  return Object.fromEntries(flags);
}

