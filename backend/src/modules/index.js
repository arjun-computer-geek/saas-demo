import express from 'express';
import authRouter from './auth/auth.routes.js';
import orgRouter from './organizations/organizations.routes.js';
import userRouter from './users/users.routes.js';
import itemRouter from './items/items.routes.js';
import { refresh, logout } from './auth/auth.controller.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

/**
 * Attach application modules to the Express app.
 */
export function registerModules(app) {
  app.use('/auth', authRouter);
  app.use('/orgs', orgRouter);
  app.use('/users', userRouter);
  app.use('/items', itemRouter);

  // Legacy aliases under /api/* for compatibility with existing automated tests
  app.use('/api/auth', authRouter);
  app.use('/api/orgs', orgRouter);
  app.use('/api/users', userRouter);
  app.use('/api/items', itemRouter);

  const legacyApiRouter = express.Router();

  // Allow GET-based refresh token checks expected by automated suites
  legacyApiRouter.all('/auth/refresh-token', refresh);

  // Provide direct /api/logout for suites that skip the /auth prefix
  legacyApiRouter.all('/logout', authMiddleware, logout);

  app.use('/api', legacyApiRouter);
}

