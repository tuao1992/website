import { Router } from 'express';
import { z } from 'zod';
import { toCsv, toJson, toPdf, toXlsx } from '../services/exporters.js';
import type { LookupResult, LookupSummary } from '../types.js';

/**
 * The client posts back the result set it is displaying, so exports always match
 * exactly what the user sees — including their filters — with no second lookup
 * and no server-side session state.
 */
const exportSchema = z.object({
  results: z.array(z.unknown()).min(1, 'Nothing to export'),
  summary: z.unknown().optional(),
  filename: z.string().max(120).optional(),
});

const FORMATS = ['csv', 'xlsx', 'pdf', 'json'] as const;
type Format = (typeof FORMATS)[number];

function fallbackSummary(results: LookupResult[]): LookupSummary {
  return {
    total: results.length,
    success: results.filter((r) => r.status === 'success').length,
    derived: results.filter((r) => r.status === 'derived').length,
    invalid: results.filter((r) => r.status === 'invalid').length,
    notFound: results.filter((r) => r.status === 'not_found').length,
    errors: results.filter((r) => r.status === 'error').length,
    cached: results.filter((r) => r.cached).length,
    durationMs: 0,
    provider: results[0]?.source ?? 'unknown',
  };
}

/** Keep a user-supplied filename from escaping the Content-Disposition header. */
function safeBase(name: string | undefined): string {
  const base = (name ?? '').replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 80);
  return base || `gstin-lookup-${new Date().toISOString().slice(0, 10)}`;
}

export const exportRouter: Router = Router();

exportRouter.post('/export/:format', async (req, res) => {
  const format = req.params.format as Format;
  if (!FORMATS.includes(format)) {
    res.status(400).json({ error: 'UNSUPPORTED_FORMAT', message: `Format must be one of: ${FORMATS.join(', ')}` });
    return;
  }

  const parsed = exportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_REQUEST', message: parsed.error.issues[0]?.message ?? 'Invalid body' });
    return;
  }

  const results = parsed.data.results as LookupResult[];
  const summary = (parsed.data.summary as LookupSummary | undefined) ?? fallbackSummary(results);
  const base = safeBase(parsed.data.filename);

  try {
    switch (format) {
      case 'csv': {
        res.setHeader('content-type', 'text/csv; charset=utf-8');
        res.setHeader('content-disposition', `attachment; filename="${base}.csv"`);
        res.send(toCsv(results));
        return;
      }
      case 'json': {
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.setHeader('content-disposition', `attachment; filename="${base}.json"`);
        res.send(toJson(results, summary));
        return;
      }
      case 'xlsx': {
        const buffer = await toXlsx(results, summary);
        res.setHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('content-disposition', `attachment; filename="${base}.xlsx"`);
        res.send(buffer);
        return;
      }
      case 'pdf': {
        const buffer = await toPdf(results, summary);
        res.setHeader('content-type', 'application/pdf');
        res.setHeader('content-disposition', `attachment; filename="${base}.pdf"`);
        res.send(buffer);
        return;
      }
    }
  } catch (error) {
    res.status(500).json({
      error: 'EXPORT_FAILED',
      message: error instanceof Error ? error.message : 'Could not build the export',
    });
  }
});
