// Vercel deployment trigger update for database SQL migration sync v3
const env = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const isProd = process.env.NODE_ENV === 'production';

export const config = {
  isProd,
  port: Number(env('PORT', '4000')),
  webOrigin: env('WEB_ORIGIN', 'http://localhost:3000'),
  publicApiUrl: env(
    'PUBLIC_API_URL',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://xrk-api.vercel.app',
  ),

  jwt: {
    accessSecret: env('JWT_ACCESS_SECRET', 'dev-access-secret-change-me'),
    refreshSecret: env('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
    accessTtlSec: 60 * 15, // 15 minutes
    refreshTtlSec: 60 * 60 * 24 * 7, // 7 days
  },

  redisUrl: process.env.REDIS_URL ?? '', // empty → in-memory fallback (dev only)

  // Object storage (Cloudflare R2 / any S3-compatible). driver=mock keeps dev fully local.
  storage: {
    driver: env('STORAGE_DRIVER', 'mock') as 'r2' | 'mock',
    endpoint: process.env.S3_ENDPOINT ?? '',
    region: process.env.S3_REGION ?? 'auto',
    bucket: process.env.S3_BUCKET ?? 'syt-media',
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL ?? '', // e.g. https://media.syt.example.com
    presignTtlSec: 60 * 15, // presigned URLs valid 15 minutes (master.md §6)
  },

  // Video streaming provider. driver=mock returns a sample HLS stream for local dev.
  video: {
    driver: env('VIDEO_DRIVER', 'mock') as 'cloudflare' | 'mock',
    cfAccountId: process.env.CF_ACCOUNT_ID ?? '',
    cfApiToken: process.env.CF_STREAM_API_TOKEN ?? '',
    cfWebhookSecret: process.env.CF_STREAM_WEBHOOK_SECRET ?? '',
    maxDurationSec: Number(process.env.VIDEO_MAX_DURATION_SEC ?? 3600),
  },

  limits: {
    activityFileMaxBytes: 25 * 1024 * 1024, // 25MB (PRD §5.1.6)
    musicFileMaxBytes: 100 * 1024 * 1024, // 100MB raw audio before external transcode
    imageMaxBytes: 10 * 1024 * 1024,
    loginMaxAttempts: 5,
    loginWindowMin: 15, // 5 failures → 15 minute lockout (master.md §6)
  },

  presence: {
    ttlSec: 60, // presence key TTL (master.md §5)
  },

  activityLogRetentionDays: Number(process.env.ACTIVITY_LOG_RETENTION_DAYS ?? 180),
};
