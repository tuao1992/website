/**
 * Appyflow GST verification API (https://appyflow.in/gst-api).
 *
 *   GET {base}/api/verifyGST?gstNo={GSTIN}&key_secret={KEY}
 *   -> { taxpayerInfo: { ...GSTN payload... } }
 *   -> { error: true, message: "..." }
 */

import { config } from '../config.js';
import { requestJson, withRetry } from '../lib/http.js';
import { mapGstnPayload, type RawGstnPayload } from '../lib/gstnMapper.js';
import type { GstinProvider, ProviderResponse } from '../types.js';
import { describeFailure } from './failure.js';

interface AppyflowBody {
  taxpayerInfo?: RawGstnPayload;
  error?: boolean | string;
  message?: string;
}

export class AppyflowProvider implements GstinProvider {
  readonly id = 'appyflow';
  readonly name = 'Appyflow GST API';
  readonly docsUrl = 'https://appyflow.in/gst-api';

  isConfigured(): boolean {
    return config.providers.appyflow.apiKey.trim().length > 0;
  }

  configurationHint(): string {
    return 'Set APPYFLOW_API_KEY to your Appyflow key secret.';
  }

  async lookup(gstin: string, signal: AbortSignal): Promise<ProviderResponse> {
    const { apiKey, baseUrl } = config.providers.appyflow;
    const url =
      `${baseUrl.replace(/\/+$/, '')}/api/verifyGST` +
      `?gstNo=${encodeURIComponent(gstin)}&key_secret=${encodeURIComponent(apiKey)}`;

    try {
      const body = await withRetry(
        () => requestJson<AppyflowBody>(url, { timeoutMs: config.requestTimeoutMs, signal }),
        { retries: config.maxRetries },
      );

      if (body.taxpayerInfo && Object.keys(body.taxpayerInfo).length > 0) {
        return { kind: 'found', record: mapGstnPayload(gstin, body.taxpayerInfo) };
      }

      const message = body.message ?? 'Provider did not return taxpayer details';
      if (/invalid|not ?found|no record|does not exist/i.test(message)) {
        return { kind: 'not_found', message, code: 'NOT_FOUND' };
      }
      return { kind: 'error', message, code: 'PROVIDER_REJECTED' };
    } catch (error) {
      return describeFailure(error, this.name);
    }
  }
}
