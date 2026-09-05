import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { GST_STATE_CODES } from './lib/gstReference.js';
import { PROVIDER_IDS, getProvider } from './providers/index.js';
import { exportRouter } from './routes/exportRoutes.js';
import { lookupRouter } from './routes/lookup.js';
import { uploadRouter } from './routes/upload.js';

const here = path.dirname(fileURLToPath(import.meta.url));
/** Built SPA, when `npm run build` has been run in the web workspace. */
const webDist = path.resolve(here, '../../web/dist');

export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map((o) => o.trim()) }));
  // Exports post the whole displayed result set back, so allow a generous body.
  app.use(express.json({ limit: '32mb' }));

  const api = express.Router();
  api.use(
    rateLimit({
      windowMs: config.rateLimitWindowMs,
      max: config.rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'RATE_LIMITED', message: 'Too many requests. Wait a moment and try again.' },
    }),
  );

  api.get('/health', (_req, res) => {
    let provider: { id: string; name: string; ready: boolean; error?: string };
    try {
      const active = getProvider();
      provider = { id: active.id, name: active.name, ready: true };
    } catch (error) {
      provider = {
        id: config.provider,
        name: config.provider,
        ready: false,
        error: error instanceof Error ? error.message : 'provider unavailable',
      };
    }
    res.status(provider.ready ? 200 : 503).json({ status: provider.ready ? 'ok' : 'degraded', provider, uptimeSeconds: Math.round(process.uptime()) });
  });

  /** Everything the front end needs to configure itself: limits, provider, state list. */
  api.get('/config', (_req, res) => {
    let providerInfo: { id: string; name: string; docsUrl?: string; ready: boolean; synthetic: boolean; error?: string };
    try {
      const active = getProvider();
      providerInfo = {
        id: active.id,
        name: active.name,
        docsUrl: active.docsUrl,
        ready: true,
        synthetic: active.id === 'mock',
      };
    } catch (error) {
      providerInfo = {
        id: config.provider,
        name: config.provider,
        ready: false,
        synthetic: false,
        error: error instanceof Error ? error.message : 'provider unavailable',
      };
    }

    res.json({
      provider: providerInfo,
      availableProviders: PROVIDER_IDS,
      limits: {
        maxBatchSize: config.maxBatchSize,
        concurrency: config.concurrency,
        maxUploadBytes: config.maxUploadBytes,
      },
      cache: { enabled: config.cacheEnabled, ttlMinutes: config.cacheTtlMs / 60_000 },
      stateCodes: GST_STATE_CODES,
    });
  });

  api.use(lookupRouter);
  api.use(uploadRouter);
  api.use(exportRouter);

  app.use('/api', api);

  // Serve the built SPA when it exists; in development Vite serves it on its own port.
  app.use(express.static(webDist, { index: false, maxAge: '1h' }));
  app.get(/^\/(?!api\/).*/, (_req, res, next) => {
    res.sendFile(path.join(webDist, 'index.html'), (error) => {
      if (error) next();
    });
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'NOT_FOUND', message: 'No such endpoint' });
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const isMulterLimit = error instanceof Error && 'code' in error && error.code === 'LIMIT_FILE_SIZE';
    if (isMulterLimit) {
      res.status(413).json({
        error: 'FILE_TOO_LARGE',
        message: `File exceeds the ${Math.round(config.maxUploadBytes / (1024 * 1024))} MB limit`,
      });
      return;
    }
    console.error('[gstin-bulk-lookup] unhandled error', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unexpected server error',
    });
  });

  return app;
}
