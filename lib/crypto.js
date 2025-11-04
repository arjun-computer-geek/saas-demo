import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

export function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

