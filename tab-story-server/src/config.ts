import 'dotenv/config';
import { z } from 'zod';

const env = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  SYNC_BOOTSTRAP_SECRET: z.string().min(32),
  GOOGLE_CLIENT_IDS: z.string().default(''),
  GOOGLE_WEB_CLIENT_ID: z.string().default(''),
  ACCESS_TOKEN_MINUTES: z.coerce.number().int().min(1).max(60).default(15),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  TOMBSTONE_RETENTION_DAYS: z.coerce.number().int().min(1).max(3650).default(30),
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  CLIENT_ORIGINS: z.string().default(''),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(1).default(0),
}).parse(process.env);

const origins = env.CLIENT_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean);
const googleClientIds = [...new Set([...env.GOOGLE_CLIENT_IDS.split(',').map((clientId) => clientId.trim()), env.GOOGLE_WEB_CLIENT_ID.trim()].filter(Boolean))];
if (origins.includes('*')) throw new Error('CLIENT_ORIGINS cannot contain * when credentials are enabled');
if (origins.some((origin) => origin.includes('YOUR_EXTENSION_ID'))) throw new Error('Replace the extension origin placeholder before starting the server');
if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) throw new Error('JWT access and refresh secrets must differ');
if ([env.JWT_ACCESS_SECRET, env.JWT_REFRESH_SECRET, env.SYNC_BOOTSTRAP_SECRET].some((secret) => secret.startsWith('replace-with-'))) throw new Error('Replace all secret placeholders before starting the server');
if (env.DATABASE_URL.includes('replace-with-')) throw new Error('Replace the database password placeholder before starting the server');

export const config = {
  databaseUrl: env.DATABASE_URL,
  accessSecret: env.JWT_ACCESS_SECRET,
  refreshSecret: env.JWT_REFRESH_SECRET,
  bootstrapSecret: env.SYNC_BOOTSTRAP_SECRET,
  googleClientIds,
  googleClientId: env.GOOGLE_WEB_CLIENT_ID || googleClientIds[0] || '',
  accessMinutes: env.ACCESS_TOKEN_MINUTES,
  refreshDays: env.REFRESH_TOKEN_DAYS,
  retentionDays: env.TOMBSTONE_RETENTION_DAYS,
  port: env.PORT,
  origins,
  trustProxyHops: env.TRUST_PROXY_HOPS,
};
