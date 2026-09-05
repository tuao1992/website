/**
 * Exercises the real provider HTTP path — request, retry, error mapping and
 * payload normalisation — against a local stub that speaks the GSTN response
 * shape the commercial providers relay.
 */
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { GstinProvider } from '../types.js';

const GSTIN = '27AAPFU0939F1ZV';

const TAXPAYER = {
  gstin: GSTIN,
  lgnm: 'UMBRELLA TRADERS',
  tradeNam: 'UMBRELLA',
  sts: 'Active',
  dty: 'Regular',
  ctb: 'Partnership',
  rgdt: '01/07/2017',
  stj: 'State - Maharashtra, Ward 12',
  nba: ['Retail Business'],
  pradr: { addr: { bno: '14', st: 'MG Road', city: 'Pune', dst: 'Pune', stcd: 'Maharashtra', pncd: '411005' } },
};

let server: http.Server;
let provider: GstinProvider;
/** Number of times the flaky route has been hit, so we can assert on retries. */
let flakyHits = 0;

beforeAll(async () => {
  // The stub switches behaviour on the value substituted for {gstin}, because
  // config.ts snapshots the URL template at import time and cannot be re-pointed.
  server = http.createServer((req, res) => {
    const token = decodeURIComponent((req.url ?? '/').split('/').pop() ?? '');
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };

    switch (token) {
      case 'EMPTY':
        return send(200, { data: {} });
      case 'UNAUTHORIZED':
        return send(401, { message: 'bad key' });
      case 'RATELIMITED':
        return send(429, { message: 'slow down' });
      case 'FLAKY':
        flakyHits += 1;
        return flakyHits === 1 ? send(503, { message: 'upstream down' }) : send(200, { data: TAXPAYER });
      case 'SLOW':
        // Never responds: the client-side timeout must fire.
        return undefined;
      default:
        return send(200, { data: TAXPAYER });
    }
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  // config.ts snapshots process.env on import, so set it up before importing.
  process.env.CUSTOM_PROVIDER_URL = `http://127.0.0.1:${port}/{gstin}`;
  process.env.CUSTOM_PROVIDER_DATA_PATH = 'data';
  process.env.REQUEST_TIMEOUT_MS = '600';
  process.env.MAX_RETRIES = '1';

  const { CustomProvider } = await import('../providers/custom.js');
  provider = new CustomProvider();
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

const look = (token: string) => provider.lookup(token, new AbortController().signal);

describe('CustomProvider over HTTP', () => {
  it('is configured once CUSTOM_PROVIDER_URL is set', () => {
    expect(provider.isConfigured()).toBe(true);
  });

  it('normalises a GSTN payload read from the configured data path', async () => {
    const response = await look(GSTIN);
    expect(response.kind).toBe('found');
    if (response.kind !== 'found') return;
    expect(response.record.legalName).toBe('UMBRELLA TRADERS');
    expect(response.record.principalAddress?.formatted).toBe('14, MG Road, Pune, Maharashtra, 411005');
    expect(response.record.derived?.pan).toBe('AAPFU0939F');
  });

  it('reports an empty payload as not found rather than an empty record', async () => {
    const response = await look('EMPTY');
    expect(response.kind).toBe('not_found');
  });

  it('maps 401 to a credentials error the user can act on', async () => {
    const response = await look('UNAUTHORIZED');
    expect(response).toMatchObject({ kind: 'error', code: 'PROVIDER_UNAUTHORIZED' });
    if (response.kind === 'error') expect(response.message).toMatch(/API key/i);
  });

  it('maps 429 to a rate-limit error that names the knob to turn', async () => {
    const response = await look('RATELIMITED');
    expect(response).toMatchObject({ kind: 'error', code: 'PROVIDER_RATE_LIMITED' });
    if (response.kind === 'error') expect(response.message).toMatch(/LOOKUP_CONCURRENCY/);
  });

  it('retries a 5xx and succeeds on the second attempt', async () => {
    flakyHits = 0;
    const response = await look('FLAKY');
    expect(response.kind).toBe('found');
    expect(flakyHits).toBe(2);
  });

  it('times out instead of hanging when the upstream never answers', async () => {
    const response = await look('SLOW');
    expect(response).toMatchObject({ kind: 'error', code: 'PROVIDER_TIMEOUT' });
  }, 10_000);
});
