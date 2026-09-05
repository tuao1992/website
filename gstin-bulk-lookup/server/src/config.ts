import 'dotenv/config';

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer, received "${raw}"`);
  }
  return parsed;
}

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: int('PORT', 4000),

  /**
   * Which source answers lookups. May be a comma-separated chain tried in order,
   * e.g. "dataset,local". See src/providers/index.ts for the catalogue.
   */
  provider: (process.env.GSTIN_PROVIDER ?? 'mock').trim().toLowerCase(),

  /** Reference files for the keyless `dataset` provider, comma-separated. */
  datasetPaths: (process.env.GSTIN_DATASET_PATH ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean),

  /** Hard ceiling on one batch, so a pasted 100k-line file cannot exhaust the API quota. */
  maxBatchSize: int('MAX_BATCH_SIZE', 500),
  /** Parallel upstream calls. Most GSTIN APIs rate-limit aggressively; keep this modest. */
  concurrency: int('LOOKUP_CONCURRENCY', 5),
  /** Per-GSTIN upstream timeout. */
  requestTimeoutMs: int('REQUEST_TIMEOUT_MS', 15_000),
  /** Retries for transient upstream failures (timeouts, 429, 5xx). */
  maxRetries: int('MAX_RETRIES', 2),

  cacheEnabled: bool('CACHE_ENABLED', true),
  cacheTtlMs: int('CACHE_TTL_MINUTES', 720) * 60_000,
  cacheMaxEntries: int('CACHE_MAX_ENTRIES', 10_000),

  rateLimitWindowMs: int('RATE_LIMIT_WINDOW_MINUTES', 15) * 60_000,
  rateLimitMax: int('RATE_LIMIT_MAX_REQUESTS', 300),

  maxUploadBytes: int('MAX_UPLOAD_MB', 10) * 1024 * 1024,

  corsOrigin: process.env.CORS_ORIGIN ?? '*',

  providers: {
    gstincheck: {
      apiKey: process.env.GSTINCHECK_API_KEY ?? '',
      baseUrl: process.env.GSTINCHECK_BASE_URL ?? 'https://sheet.gstincheck.co.in',
    },
    appyflow: {
      apiKey: process.env.APPYFLOW_API_KEY ?? '',
      baseUrl: process.env.APPYFLOW_BASE_URL ?? 'https://appyflow.in',
    },
    mastersindia: {
      clientId: process.env.MASTERSINDIA_CLIENT_ID ?? '',
      clientSecret: process.env.MASTERSINDIA_CLIENT_SECRET ?? '',
      username: process.env.MASTERSINDIA_USERNAME ?? '',
      password: process.env.MASTERSINDIA_PASSWORD ?? '',
      gstin: process.env.MASTERSINDIA_GSTIN ?? '',
      baseUrl: process.env.MASTERSINDIA_BASE_URL ?? 'https://commonapi.mastersindia.co',
    },
    custom: {
      /** URL template; "{gstin}" is substituted. */
      url: process.env.CUSTOM_PROVIDER_URL ?? '',
      method: (process.env.CUSTOM_PROVIDER_METHOD ?? 'GET').toUpperCase(),
      /** JSON object of extra request headers, e.g. '{"Authorization":"Bearer xyz"}'. */
      headers: process.env.CUSTOM_PROVIDER_HEADERS ?? '',
      /** Dot path to the GSTN-shaped payload inside the response, e.g. "data" or "taxpayerInfo". */
      dataPath: process.env.CUSTOM_PROVIDER_DATA_PATH ?? '',
    },
  },
} as const;

export type AppConfig = typeof config;
