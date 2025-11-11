import express from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import { requireOrgRole } from '../../middlewares/roleMiddleware.js';
import { createItem, deleteItem, listItems, updateItem } from './items.controller.js';

const router = express.Router();

router.get('/', authMiddleware, requireOrgRole(['USER', 'ADMIN']), listItems);
router.post('/', authMiddleware, requireOrgRole(['USER', 'ADMIN']), createItem);
router.put('/:id', authMiddleware, requireOrgRole(['USER', 'ADMIN']), updateItem);
router.delete('/:id', authMiddleware, requireOrgRole(['USER', 'ADMIN']), deleteItem);

export default router;

