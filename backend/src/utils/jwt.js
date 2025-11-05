import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function sign(sessionId) {
  return jwt.sign({ sid: sessionId }, env.JWT_SECRET, { expiresIn: '7d' });
}
export function verify(token) {
  return jwt.verify(token, env.JWT_SECRET);
}
