import express from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import { requireOrgRole, requireSuper } from '../../middlewares/roleMiddleware.js';
import {
  acceptInvite,
  addAdmin,
  createInvite,
  getInviteDetails,
  listAdmins,
  listInvites,
  listMembers,
  listOrgMembersForSuper,
  listOrgUsers,
  removeAdmin,
  toggleMemberDisabled,
  updateMemberPassword,
  updateMemberRole,
} from './users.controller.js';

const router = express.Router();

// Admin scoped membership endpoints
router.get('/', authMiddleware, requireOrgRole(['ADMIN']), listOrgUsers);
router.get('/members', authMiddleware, requireOrgRole(['ADMIN']), listMembers);
router.post('/members/:userId/role', authMiddleware, requireOrgRole(['ADMIN']), updateMemberRole);
router.post('/members/:userId/disable', authMiddleware, requireOrgRole('ADMIN'), toggleMemberDisabled);

router.get('/invites', authMiddleware, requireOrgRole(['ADMIN']), listInvites);
router.post('/invite', authMiddleware, requireOrgRole(['ADMIN']), createInvite);

// Public invite endpoints
router.get('/invite/:token', getInviteDetails);
router.post('/invite/:token/accept', acceptInvite);

// Super admin endpoints
router.get('/super/admins', authMiddleware, requireSuper(), listAdmins);
router.post('/super/admins/add', authMiddleware, requireSuper(), addAdmin);
router.post('/super/admins/remove', authMiddleware, requireSuper(), removeAdmin);

router.get('/super/members/:orgId', authMiddleware, requireSuper(), listOrgMembersForSuper);
router.post('/super/members/:userId/password', authMiddleware, requireSuper(), updateMemberPassword);

export default router;

