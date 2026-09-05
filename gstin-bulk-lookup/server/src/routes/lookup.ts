import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { validateGstin } from '../lib/gstin.js';
import { getProvider } from '../providers/index.js';
import { cacheSize, clearCache, lookupBatch } from '../services/lookupService.js';

const batchSchema = z.object({
  gstins: z
    .array(z.string())
    .min(1, 'Provide at least one GSTIN')
    .max(config.maxBatchSize, `A single batch is limited to ${config.maxBatchSize} GSTINs`),
});

export const lookupRouter: Router = Router();

/** Offline validation only — no upstream calls, so the UI can preview a paste instantly. */
lookupRouter.post('/validate', (req, res) => {
  const parsed = z.object({ gstins: z.array(z.string()).max(50_000) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_REQUEST', message: parsed.error.issues[0]?.message ?? 'Invalid body' });
    return;
  }
  const items = parsed.data.gstins.map((input) => {
    const check = validateGstin(input);
    return {
      input,
      gstin: check.gstin,
      valid: check.valid,
      checksumValid: check.checksumValid,
      errors: check.errors,
      warnings: check.warnings,
      stateName: check.parts?.stateName ?? null,
      pan: check.parts?.pan ?? null,
      entityType: check.parts?.entityType ?? null,
    };
  });
  res.json({
    items,
    validCount: items.filter((item) => item.valid).length,
    invalidCount: items.filter((item) => !item.valid).length,
  });
});

/** Resolve a whole batch and return once every row has settled. */
lookupRouter.post('/lookup', async (req, res) => {
  const parsed = batchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_REQUEST', message: parsed.error.issues[0]?.message ?? 'Invalid body' });
    return;
  }

  const controller = new AbortController();
  req.on('close', () => controller.abort());

  try {
    const { results, summary } = await lookupBatch(parsed.data.gstins, { signal: controller.signal });
    res.json({ results, summary });
  } catch (error) {
    res.status(502).json({
      error: 'LOOKUP_FAILED',
      message: error instanceof Error ? error.message : 'Lookup failed',
    });
  }
});

/**
 * Same batch, streamed as newline-delimited JSON so rows appear in the table as
 * they resolve rather than after the slowest one. Each line is one of:
 *   {"type":"start","total":n,"provider":"..."}
 *   {"type":"result","completed":k,"total":n,"result":{...}}
 *   {"type":"summary","summary":{...}}
 *   {"type":"error","message":"..."}
 */
lookupRouter.post('/lookup/stream', async (req, res) => {
  const parsed = batchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_REQUEST', message: parsed.error.issues[0]?.message ?? 'Invalid body' });
    return;
  }

  res.status(200);
  res.setHeader('content-type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('cache-control', 'no-cache, no-transform');
  res.setHeader('x-accel-buffering', 'no');
  res.flushHeaders?.();

  const write = (payload: unknown) =>
    new Promise<void>((resolve) => {
      // Respect backpressure so a slow client cannot balloon server memory.
      if (!res.write(`${JSON.stringify(payload)}\n`)) res.once('drain', () => resolve());
      else resolve();
    });

  const controller = new AbortController();
  req.on('close', () => controller.abort());

  try {
    const provider = getProvider();
    await write({ type: 'start', total: parsed.data.gstins.length, provider: provider.id });

    const { summary } = await lookupBatch(parsed.data.gstins, {
      signal: controller.signal,
      onResult: async (result, completed, total) => {
        if (!res.writableEnded) await write({ type: 'result', completed, total, result });
      },
    });

    if (!res.writableEnded) await write({ type: 'summary', summary });
  } catch (error) {
    if (!res.writableEnded) {
      await write({ type: 'error', message: error instanceof Error ? error.message : 'Lookup failed' });
    }
  } finally {
    res.end();
  }
});

lookupRouter.get('/cache', (_req, res) => {
  res.json({ enabled: config.cacheEnabled, entries: cacheSize(), ttlMinutes: config.cacheTtlMs / 60_000 });
});

lookupRouter.delete('/cache', (_req, res) => {
  clearCache();
  res.json({ cleared: true });
});
