import { verify } from '../utils/jwt.js';
import Session from '../models/Session.js';
import Organization from '../models/Organization.js';
import { env } from '../config/env.js';

export async function authMiddleware(req, res, next) {
  const token = req.cookies?.[env.COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { sid } = verify(token);
    const session = await Session.findById(sid);
    if (!session) return res.status(401).json({ error: 'Session invalid' });
    if (session.expiresAt < new Date()) {
      await Session.findByIdAndDelete(sid);
      return res.status(401).json({ error: 'Session expired' });
    }
    if (session.orgId) {
      const org = await Organization.findById(session.orgId);
      if (!org || org.status !== 'ACTIVE' || session.orgVersion !== org.authVersion) {
        await Session.findByIdAndDelete(sid);
        return res.status(403).json({ error: 'Organization access revoked' });
      }
    }
    req.session = session;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
