import express from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import { requireSuper } from '../../middlewares/roleMiddleware.js';
import {
  createOrganization,
  deleteOrganization,
  disableOrganization,
  enableOrganization,
  listOrganizations,
  undeleteOrganization,
} from './organizations.controller.js';

const router = express.Router();

router.post('/', authMiddleware, requireSuper(), createOrganization);
router.get('/', authMiddleware, requireSuper(), listOrganizations);
router.post('/:id/disable', authMiddleware, requireSuper(), disableOrganization);
router.post('/:id/enable', authMiddleware, requireSuper(), enableOrganization);
router.delete('/:id', authMiddleware, requireSuper(), deleteOrganization);
router.post('/:id/undelete', authMiddleware, requireSuper(), undeleteOrganization);

export default router;

