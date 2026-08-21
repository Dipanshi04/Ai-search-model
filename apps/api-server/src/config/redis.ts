import { createClient, RedisClientType } from 'redis';
import { logger } from './logger.js';

const globalForRedis = globalThis as unknown as {
  redis: RedisClientType | undefined;
};

export const redis: RedisClientType = (globalForRedis.redis ?? createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: false,
    connectTimeout: 3000,
  },
})) as RedisClientType;

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

redis.on('error', () => {});
redis.on('connect', () => logger.info('Redis connected'));

export async function connectRedis(): Promise<void> {
  if (!redis.isOpen) {
    await redis.connect();
  }
}
