import User from '../models/User.js';
import Membership from '../models/Membership.js';

export function requireSuper() {
  return async (req, res, next) => {
    const user = await User.findById(req.session.userId);
    if (user?.isSuper) return next();
    return res.status(403).json({ error: 'Super admin only' });
  };
}

export function requireOrgRole(roles) {
  // roles can be a string ("ADMIN") or array (["ADMIN", "USER"])
  return async (req, res, next) => {
    const { orgId, userId } = req.session;
    const member = await Membership.findOne({ userId, orgId });
    if (!member) return res.status(403).json({ error: "No membership found" });

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    if (!allowedRoles.includes(member.role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    next();
  };
}
