import Redis from 'ioredis';
import { config } from '../config';

/**
 * Minimal key-value interface used for presence + login lockout.
 * Backed by Redis in staging/production; falls back to an in-process store
 * for local development so the API runs with zero external services.
 */
export interface KvStore {
  setex(key: string, ttlSec: number, value: string): Promise<void>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<void>;
  incrWithTtl(key: string, ttlSec: number): Promise<number>;
  keys(prefix: string): Promise<string[]>;
}

class RedisStore implements KvStore {
  constructor(private readonly client: Redis) {}
  async setex(key: string, ttlSec: number, value: string) {
    await this.client.setex(key, ttlSec, value);
  }
  async get(key: string) {
    return this.client.get(key);
  }
  async del(key: string) {
    await this.client.del(key);
  }
  async incrWithTtl(key: string, ttlSec: number) {
    const n = await this.client.incr(key);
    if (n === 1) await this.client.expire(key, ttlSec);
    return n;
  }
  async keys(prefix: string) {
    const found: string[] = [];
    let cursor = '0';
    do {
      const [next, batch] = await this.client.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 200);
      cursor = next;
      found.push(...batch);
    } while (cursor !== '0');
    return found;
  }
}

class MemoryStore implements KvStore {
  private readonly data = new Map<string, { value: string; expiresAt: number }>();

  private sweep(key: string): string | null {
    const entry = this.data.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.data.delete(key);
      return null;
    }
    return entry.value;
  }
  async setex(key: string, ttlSec: number, value: string) {
    this.data.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
  }
  async get(key: string) {
    return this.sweep(key);
  }
  async del(key: string) {
    this.data.delete(key);
  }
  async incrWithTtl(key: string, ttlSec: number) {
    const current = this.sweep(key);
    const n = current ? Number(current) + 1 : 1;
    const expiresAt = current ? this.data.get(key)!.expiresAt : Date.now() + ttlSec * 1000;
    this.data.set(key, { value: String(n), expiresAt });
    return n;
  }
  async keys(prefix: string) {
    const now = Date.now();
    const out: string[] = [];
    for (const [key, entry] of this.data) {
      if (entry.expiresAt <= now) {
        this.data.delete(key);
      } else if (key.startsWith(prefix)) {
        out.push(key);
      }
    }
    return out;
  }
}

function createStore(): KvStore {
  if (config.redisUrl) {
    const client = new Redis(config.redisUrl, { maxRetriesPerRequest: 3 });
    client.on('error', (err) => console.error('Redis error:', err.message));
    console.log('KV store: Redis');
    return new RedisStore(client);
  }
  console.log('KV store: in-memory (set REDIS_URL for multi-instance deployments)');
  return new MemoryStore();
}

export const kv: KvStore = createStore();
