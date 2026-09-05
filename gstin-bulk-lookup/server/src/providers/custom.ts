/**
 * Generic adapter for any endpoint that returns the standard GSTN taxpayer payload.
 *
 * Configure with:
 *   CUSTOM_PROVIDER_URL="https://gst.example.com/v1/taxpayer/{gstin}"
 *   CUSTOM_PROVIDER_HEADERS='{"Authorization":"Bearer ..."}'
 *   CUSTOM_PROVIDER_DATA_PATH="data"        # dotted path to the payload, blank = response root
 *
 * Use this to point the app at an in-house GSP integration or a corporate proxy
 * without writing a new provider class.
 */

import { config } from '../config.js';
import { requestJson, withRetry } from '../lib/http.js';
import { mapGstnPayload, readPath, type RawGstnPayload } from '../lib/gstnMapper.js';
import type { GstinProvider, ProviderResponse } from '../types.js';
import { describeFailure } from './failure.js';

function parseHeaders(raw: string): Record<string, string> {
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, String(value)]));
  } catch {
    throw new Error('CUSTOM_PROVIDER_HEADERS must be a JSON object, e.g. \'{"Authorization":"Bearer xyz"}\'');
  }
}

export class CustomProvider implements GstinProvider {
  readonly id = 'custom';
  readonly name = 'Custom endpoint';

  isConfigured(): boolean {
    return config.providers.custom.url.trim().length > 0;
  }

  configurationHint(): string {
    return 'Set CUSTOM_PROVIDER_URL (must contain the {gstin} placeholder). Optionally set CUSTOM_PROVIDER_HEADERS and CUSTOM_PROVIDER_DATA_PATH.';
  }

  async lookup(gstin: string, signal: AbortSignal): Promise<ProviderResponse> {
    const custom = config.providers.custom;
    const url = custom.url.includes('{gstin}')
      ? custom.url.replace('{gstin}', encodeURIComponent(gstin))
      : `${custom.url}${custom.url.includes('?') ? '&' : '?'}gstin=${encodeURIComponent(gstin)}`;

    try {
      const headers = parseHeaders(custom.headers);
      const body = await withRetry(
        () =>
          requestJson<unknown>(url, {
            method: custom.method,
            headers,
            timeoutMs: config.requestTimeoutMs,
            signal,
          }),
        { retries: config.maxRetries },
      );

      const payload = readPath(body, custom.dataPath) as RawGstnPayload | undefined;
      if (payload && typeof payload === 'object' && Object.keys(payload).length > 0) {
        return { kind: 'found', record: mapGstnPayload(gstin, payload) };
      }
      return {
        kind: 'not_found',
        message: custom.dataPath
          ? `No taxpayer payload at path "${custom.dataPath}" in the custom endpoint response`
          : 'Custom endpoint returned an empty payload',
        code: 'NOT_FOUND',
      };
    } catch (error) {
      return describeFailure(error, this.name);
    }
  }
}
