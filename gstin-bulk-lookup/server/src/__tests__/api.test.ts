/** End-to-end tests over the real HTTP surface, using the offline demo provider. */
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import type { LookupResult } from '../types.js';

const A = '27AAPFU0939F1ZV';
const B = '09AAACH7409R1ZZ';
const BAD_CHECKSUM = '27AAPFU0939F1ZA';

let server: Server;
let base: string;

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (typeof address === 'string' || address === null) throw new Error('failed to bind test server');
  base = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

const post = (path: string, body: unknown) =>
  fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

/* eslint-disable @typescript-eslint/no-explicit-any */
const json = async (response: Response): Promise<any> => response.json();

describe('GET /api/config', () => {
  it('reports the active provider and the batch limits', async () => {
    const response = await fetch(`${base}/api/config`);
    expect(response.status).toBe(200);
    const body = await json(response);
    expect(body.provider.id).toBe('mock');
    // The demo provider must announce itself as synthetic so the UI can warn.
    expect(body.provider.synthetic).toBe(true);
    expect(body.limits.maxBatchSize).toBeGreaterThan(0);
    expect(body.stateCodes['27']).toBe('Maharashtra');
  });
});

describe('POST /api/validate', () => {
  it('validates offline without contacting a provider', async () => {
    const response = await post('/api/validate', { gstins: [A, BAD_CHECKSUM] });
    const body = await json(response);
    expect(body.validCount).toBe(1);
    expect(body.invalidCount).toBe(1);
    expect(body.items[0]).toMatchObject({ valid: true, stateName: 'Maharashtra', pan: 'AAPFU0939F' });
    expect(body.items[1].errors.join(' ')).toMatch(/check digit/);
  });
});

describe('POST /api/lookup', () => {
  it('returns one row per input and a matching summary', async () => {
    const response = await post('/api/lookup', { gstins: [A, B, BAD_CHECKSUM] });
    expect(response.status).toBe(200);
    const body = await json(response);
    const results = body.results as LookupResult[];

    expect(results).toHaveLength(3);
    expect(results.map((r) => r.input)).toEqual([A, B, BAD_CHECKSUM]);
    expect(body.summary.total).toBe(3);
    expect(body.summary.invalid).toBe(1);

    const invalid = results[2]!;
    expect(invalid.status).toBe('invalid');
    expect(invalid.code).toBe('INVALID_CHECKSUM');
    expect(invalid.message).toMatch(/check digit/);
    expect(invalid.record).toBeNull();
  });

  it('returns a full record for a resolvable GSTIN', async () => {
    const body = await json(await post('/api/lookup', { gstins: [A] }));
    const record = (body.results as LookupResult[])[0]!.record!;
    expect(record.legalName).toBeTruthy();
    expect(record.principalAddress?.formatted).toBeTruthy();
    expect(record.derived).toMatchObject({ pan: 'AAPFU0939F', stateName: 'Maharashtra' });
  });

  it('answers duplicates from the first lookup and still emits a row for each', async () => {
    const body = await json(await post('/api/lookup', { gstins: [A, A, A] }));
    const results = body.results as LookupResult[];
    expect(results).toHaveLength(3);
    expect(results[1]!.cached).toBe(true);
    expect(results[2]!.cached).toBe(true);
  });

  it('rejects an empty batch and an over-sized one', async () => {
    expect((await post('/api/lookup', { gstins: [] })).status).toBe(400);
    expect((await post('/api/lookup', { gstins: new Array(100_000).fill(A) })).status).toBe(400);
  });
});

describe('POST /api/lookup/stream', () => {
  it('streams a start frame, one frame per result, then a summary', async () => {
    const response = await post('/api/lookup/stream', { gstins: [A, B, BAD_CHECKSUM] });
    expect(response.headers.get('content-type')).toMatch(/application\/x-ndjson/);

    const frames = (await response.text())
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => JSON.parse(line));

    expect(frames[0]).toMatchObject({ type: 'start', total: 3, provider: 'mock' });
    expect(frames.filter((frame) => frame.type === 'result')).toHaveLength(3);
    expect(frames.at(-1)).toMatchObject({ type: 'summary' });
    expect(frames.at(-1).summary.total).toBe(3);
  });
});

describe('POST /api/upload', () => {
  it('extracts GSTINs from an uploaded CSV', async () => {
    const form = new FormData();
    form.append('file', new Blob([`Vendor,GSTIN\nAlpha,${A}\nBeta,${BAD_CHECKSUM}\n`], { type: 'text/csv' }), 'vendors.csv');
    const response = await fetch(`${base}/api/upload`, { method: 'POST', body: form });
    expect(response.status).toBe(200);
    const body = await json(response);
    expect(body.candidates).toEqual([A, BAD_CHECKSUM]);
    expect(body.validCount).toBe(1);
    expect(body.invalidCount).toBe(1);
  });

  it('refuses a request with no file', async () => {
    const response = await fetch(`${base}/api/upload`, { method: 'POST', body: new FormData() });
    expect(response.status).toBe(400);
  });
});

describe('POST /api/export/:format', () => {
  let results: LookupResult[];

  beforeAll(async () => {
    const body = await json(await post('/api/lookup', { gstins: [A, B, BAD_CHECKSUM] }));
    results = body.results;
  });

  it('exports CSV containing a row for the failed entry too', async () => {
    const response = await post('/api/export/csv', { results });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-disposition')).toMatch(/attachment; filename=".*\.csv"/);
    const csv = await response.text();
    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(4); // header + 3 rows
    expect(csv).toContain('Invalid GSTIN');
    expect(csv).toContain(BAD_CHECKSUM);
  });

  it('exports a real xlsx workbook', async () => {
    const response = await post('/api/export/xlsx', { results });
    const buffer = Buffer.from(await response.arrayBuffer());
    expect(buffer.subarray(0, 2).toString()).toBe('PK'); // zip magic
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });

  it('exports a real pdf', async () => {
    const response = await post('/api/export/pdf', { results });
    const buffer = Buffer.from(await response.arrayBuffer());
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('exports JSON with the summary attached', async () => {
    const body = await json(await post('/api/export/json', { results }));
    expect(body.summary.total).toBe(3);
    expect(body.results).toHaveLength(3);
  });

  it('rejects an unknown format and an empty result set', async () => {
    expect((await post('/api/export/docx', { results })).status).toBe(400);
    expect((await post('/api/export/csv', { results: [] })).status).toBe(400);
  });
});
