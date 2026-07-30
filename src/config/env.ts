import 'dotenv/config';
import { z } from 'zod';

/**
 * Typed environment variable loader with Zod validation.
 * The server will fail fast on startup if any required variable is missing.
 *
 * All env vars are accessed via this module — never via process.env directly.
 */

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform(Number),
  API_PREFIX: z.string().default('/api'),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // MySQL
  DB_HOST: z.string().min(1, 'DB_HOST is required'),
  DB_PORT: z.string().default('3306').transform(Number),
  DB_USER: z.string().min(1, 'DB_USER is required'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().min(1, 'DB_NAME is required'),
  DB_POOL_MIN: z.string().default('2').transform(Number),
  DB_POOL_MAX: z.string().default('20').transform(Number),
  DB_CONNECT_TIMEOUT: z.string().default('10000').transform(Number),

  // JWT — Admin
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 chars'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 chars'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),

  // JWT — Canteen Staff
  JWT_STAFF_ACCESS_SECRET: z.string().min(16, 'JWT_STAFF_ACCESS_SECRET must be at least 16 chars'),
  JWT_STAFF_REFRESH_SECRET: z.string().min(16, 'JWT_STAFF_REFRESH_SECRET must be at least 16 chars'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),
  AUTH_RATE_LIMIT_MAX: z.string().default('10').transform(Number),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_DIR: z.string().default('./logs'),

  // AWS S3 Configuration
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().default(''),
  AWS_SECRET_ACCESS_KEY: z.string().default(''),
  AWS_S3_BUCKET_NAME: z.string().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌  Invalid environment variables:\n');
  parsed.error.issues.forEach((issue) => {
    console.error(`   ${issue.path.join('.')} — ${issue.message}`);
  });
  console.error('\n💡  Copy .env.example to .env and fill in the required values.\n');
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
