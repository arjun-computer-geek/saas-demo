import Redis from 'ioredis';
import { env } from './env.js';

/**
 * Singleton Redis client.
 * We defer connection until startup to keep unit tests lightweight.
 */
export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('[redis] connection error', err);
});

export async function connectRedis() {
  if (redis.status === 'ready' || redis.status === 'connecting') return;
  await redis.connect();
}

