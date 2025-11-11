import express from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import { login, logout, me, refresh, signup } from './auth.controller.js';

const router = express.Router();

// Registration & login
router.post('/signup', signup);
router.post('/login', login);

// Token orchestration
router.all('/refresh', refresh);
router.all('/refresh-token', refresh);
router.all('/logout', authMiddleware, logout);

// Session bootstrap
router.get('/me', authMiddleware, me);

export default router;

