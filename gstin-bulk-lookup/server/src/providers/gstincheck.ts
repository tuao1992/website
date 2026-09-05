/**
 * GST India API (https://gstincheck.co.in) — "sheet" endpoint.
 *
 *   GET {base}/check/{API_KEY}/{GSTIN}
 *   -> { flag: true,  message: "GSTIN found.", data: { ...GSTN payload... } }
 *   -> { flag: false, message: "Invalid GSTIN / UID", errorCode: "..." }
 */

import { config } from '../config.js';
import { requestJson, withRetry } from '../lib/http.js';
import { mapGstnPayload, type RawGstnPayload } from '../lib/gstnMapper.js';
import type { GstinProvider, ProviderResponse } from '../types.js';
import { describeFailure } from './failure.js';

interface GstincheckBody {
  flag?: boolean;
  message?: string;
  errorCode?: string;
  data?: RawGstnPayload;
}

export class GstincheckProvider implements GstinProvider {
  readonly id = 'gstincheck';
  readonly name = 'GST India API (gstincheck.co.in)';
  readonly docsUrl = 'https://gstincheck.co.in/gst-api-documentation';

  isConfigured(): boolean {
    return config.providers.gstincheck.apiKey.trim().length > 0;
  }

  configurationHint(): string {
    return 'Set GSTINCHECK_API_KEY to the API key from your gstincheck.co.in dashboard.';
  }

  async lookup(gstin: string, signal: AbortSignal): Promise<ProviderResponse> {
    const { apiKey, baseUrl } = config.providers.gstincheck;
    const url = `${baseUrl.replace(/\/+$/, '')}/check/${encodeURIComponent(apiKey)}/${encodeURIComponent(gstin)}`;

    try {
      const body = await withRetry(
        () => requestJson<GstincheckBody>(url, { timeoutMs: config.requestTimeoutMs, signal }),
        { retries: config.maxRetries },
      );

      if (body.flag === true && body.data) {
        return { kind: 'found', record: mapGstnPayload(gstin, body.data) };
      }

      const message = body.message ?? 'Provider did not return taxpayer details';
      // The API reports both "no such taxpayer" and key/quota problems through `flag:false`.
      if (/invalid gstin|not ?found|no record/i.test(message)) {
        return { kind: 'not_found', message, code: body.errorCode ?? 'NOT_FOUND' };
      }
      return { kind: 'error', message, code: body.errorCode ?? 'PROVIDER_REJECTED' };
    } catch (error) {
      return describeFailure(error, this.name);
    }
  }
}
