/**
 * Masters India (a GSTN-authorised GSP) — GSTIN search API.
 *
 * Two steps: an OAuth2 password-grant token (cached until it expires), then
 *   GET {base}/commonapis/searchgstin?gstin={GSTIN}
 *   headers: Authorization: Bearer <token>, client_id: <client id>
 *   -> { error: false, data: { ...GSTN payload... } }
 */

import { config } from '../config.js';
import { requestJson, withRetry } from '../lib/http.js';
import { mapGstnPayload, type RawGstnPayload } from '../lib/gstnMapper.js';
import type { GstinProvider, ProviderResponse } from '../types.js';
import { describeFailure } from './failure.js';

interface TokenBody {
  access_token?: string;
  expires_in?: number;
  error?: string;
  message?: string;
}

interface SearchBody {
  error?: boolean | string;
  message?: string;
  data?: RawGstnPayload;
}

export class MastersIndiaProvider implements GstinProvider {
  readonly id = 'mastersindia';
  readonly name = 'Masters India (GSP)';
  readonly docsUrl = 'https://docs.mastersindia.co/docs/gst-apis/search-taxpayer';

  /** Cached bearer token; refreshed a minute before it actually expires. */
  private token: { value: string; expiresAt: number } | null = null;
  private inFlightToken: Promise<string> | null = null;

  isConfigured(): boolean {
    const p = config.providers.mastersindia;
    return [p.clientId, p.clientSecret, p.username, p.password].every((value) => value.trim().length > 0);
  }

  configurationHint(): string {
    return 'Set MASTERSINDIA_CLIENT_ID, MASTERSINDIA_CLIENT_SECRET, MASTERSINDIA_USERNAME and MASTERSINDIA_PASSWORD.';
  }

  private async getToken(signal: AbortSignal): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now()) return this.token.value;
    // Collapse concurrent refreshes so a 500-row batch does not open 500 token calls.
    if (this.inFlightToken) return this.inFlightToken;

    const p = config.providers.mastersindia;
    this.inFlightToken = (async () => {
      try {
        const body = await requestJson<TokenBody>(`${p.baseUrl.replace(/\/+$/, '')}/oauth/access_token`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            username: p.username,
            password: p.password,
            client_id: p.clientId,
            client_secret: p.clientSecret,
            grant_type: 'password',
          }),
          timeoutMs: config.requestTimeoutMs,
          signal,
        });
        if (!body.access_token) {
          throw new Error(body.message ?? body.error ?? 'token endpoint returned no access_token');
        }
        const ttlMs = Math.max(60_000, (body.expires_in ?? 3600) * 1000 - 60_000);
        this.token = { value: body.access_token, expiresAt: Date.now() + ttlMs };
        return body.access_token;
      } finally {
        this.inFlightToken = null;
      }
    })();
    return this.inFlightToken;
  }

  async lookup(gstin: string, signal: AbortSignal): Promise<ProviderResponse> {
    const p = config.providers.mastersindia;
    try {
      const token = await this.getToken(signal);
      const url = `${p.baseUrl.replace(/\/+$/, '')}/commonapis/searchgstin?gstin=${encodeURIComponent(gstin)}`;
      const headers: Record<string, string> = { Authorization: `Bearer ${token}`, client_id: p.clientId };
      if (p.gstin) headers.gstin = p.gstin;

      const body = await withRetry(
        () => requestJson<SearchBody>(url, { headers, timeoutMs: config.requestTimeoutMs, signal }),
        { retries: config.maxRetries },
      );

      if (body.data && Object.keys(body.data).length > 0) {
        return { kind: 'found', record: mapGstnPayload(gstin, body.data) };
      }

      const message = body.message ?? 'Provider did not return taxpayer details';
      if (/invalid|not ?found|no record|does not exist/i.test(message)) {
        return { kind: 'not_found', message, code: 'NOT_FOUND' };
      }
      return { kind: 'error', message, code: 'PROVIDER_REJECTED' };
    } catch (error) {
      // A rejected token means the cached one is useless; drop it so the next call re-authenticates.
      this.token = null;
      return describeFailure(error, this.name);
    }
  }
}
