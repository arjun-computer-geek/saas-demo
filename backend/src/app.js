import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { env } from './config/env.js';

import authRoutes from './routes/authRoutes.js';
import orgRoutes from './routes/orgRoutes.js';
import userRoutes from './routes/userRoutes.js';
import inviteRoutes from './routes/inviteRoutes.js';
import itemRoutes from './routes/itemRoutes.js';

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/auth', authRoutes);
app.use('/orgs', orgRoutes);
app.use('/users', userRoutes);
app.use('/invites', inviteRoutes);
app.use('/items', itemRoutes);

export default app;
