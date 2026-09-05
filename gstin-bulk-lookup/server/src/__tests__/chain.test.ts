/**
 * End-to-end over HTTP with the keyless chain GSTIN_PROVIDER=dataset,local —
 * the configuration a user with no API key actually runs.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { LookupResult } from '../types.js';

/** In the dataset. */
const KNOWN = '27AAPFU0939F1ZV';
/** Valid, absent from the dataset, and its PAN is not in there either. */
const UNKNOWN = '19AADCS0472N1ZZ';
/** Valid, absent, but shares the PAN of KNOWN (a Karnataka registration). */
const SAME_PAN = '29AAPFU0939F1ZR';
const BAD_CHECKSUM = '27AAPFU0939F1ZA';

let server: Server;
let base: string;
let dir: string;

const json = async (response: Response): Promise<any> => response.json();
const post = (path: string, body: unknown) =>
  fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gstin-chain-'));
  const file = path.join(dir, 'vendor-master.csv');
  fs.writeFileSync(
    file,
    `GSTIN,Legal Name,Trade Name,GST Status,City,State,Pincode\n` +
      `${KNOWN},ACME TRADING COMPANY,ACME,Active,Pune,Maharashtra,411005\n`,
  );

  // config.ts and the provider registry snapshot the environment on import.
  process.env.GSTIN_PROVIDER = 'dataset,local';
  process.env.GSTIN_DATASET_PATH = file;
  const { createApp } = await import('../app.js');

  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (typeof address === 'string' || address === null) throw new Error('failed to bind test server');
  base = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('GSTIN_PROVIDER=dataset,local', () => {
  it('reports the chain and the loaded dataset via /api/config', async () => {
    const body = await json(await fetch(`${base}/api/config`));
    expect(body.provider.ready).toBe(true);
    expect(body.provider.id).toBe('dataset,local');
    // Never mistakable for the demo provider or for a registry.
    expect(body.provider.synthetic).toBe(false);
    expect(body.provider.dataset.entries).toBe(1);
    expect(body.keylessProviders).toContain('dataset');
  });

  it('answers a GSTIN in the dataset with its name and address', async () => {
    const body = await json(await post('/api/lookup', { gstins: [KNOWN] }));
    const result = (body.results as LookupResult[])[0]!;
    expect(result.status).toBe('success');
    expect(result.record?.legalName).toBe('ACME TRADING COMPANY');
    expect(result.record?.principalAddress?.formatted).toBe('Pune, Maharashtra, 411005');
    expect(result.record?.verifiedBy).toBe('dataset');
  });

  it('falls through to local decoding for a GSTIN the dataset does not have', async () => {
    const body = await json(await post('/api/lookup', { gstins: [UNKNOWN] }));
    const result = (body.results as LookupResult[])[0]!;
    expect(result.status).toBe('derived');
    expect(result.code).toBe('DERIVED_ONLY');
    expect(result.record?.derived).toMatchObject({ stateName: 'West Bengal', pan: 'AADCS0472N' });
    // The whole point: no name or address is invented for it.
    expect(result.record?.legalName).toBeNull();
    expect(result.record?.principalAddress).toBeNull();
  });

  it('infers the legal name from another registration under the same PAN', async () => {
    const body = await json(await post('/api/lookup', { gstins: [SAME_PAN] }));
    const result = (body.results as LookupResult[])[0]!;
    expect(result.status).toBe('derived');
    expect(result.record?.legalName).toBe('ACME TRADING COMPANY');
    // Registration-specific facts belong to the sibling, not to this GSTIN.
    expect(result.record?.principalAddress).toBeNull();
    expect(result.record?.status).toBeNull();
    expect(result.record?.provenance).toMatch(new RegExp(KNOWN));
    expect(result.message).toMatch(/same PAN/i);
  });

  it('still rejects an invalid GSTIN before consulting either source', async () => {
    const body = await json(await post('/api/lookup', { gstins: [BAD_CHECKSUM] }));
    const result = (body.results as LookupResult[])[0]!;
    expect(result.status).toBe('invalid');
    expect(result.source).toBe('local-validation');
  });

  it('counts derived rows separately in the summary', async () => {
    const body = await json(await post('/api/lookup', { gstins: [KNOWN, UNKNOWN, BAD_CHECKSUM] }));
    expect(body.summary).toMatchObject({ total: 3, success: 1, derived: 1, invalid: 1 });
  });

  it('exports derived rows with their status and provenance', async () => {
    const lookup = await json(await post('/api/lookup', { gstins: [KNOWN, UNKNOWN] }));
    const csv = await (await post('/api/export/csv', { results: lookup.results })).text();
    expect(csv).toContain('Validated only');
    expect(csv).toContain('Verified By');
    expect(csv).toContain('Reference dataset: vendor-master.csv');
  });
});
