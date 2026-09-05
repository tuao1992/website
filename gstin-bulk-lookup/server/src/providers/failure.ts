import { HttpError, TimeoutError } from '../lib/http.js';
import type { ProviderResponse } from '../types.js';

/** Turn a thrown transport error into a user-facing, machine-readable failure. */
export function describeFailure(error: unknown, providerName: string): ProviderResponse {
  if (error instanceof TimeoutError) {
    return {
      kind: 'error',
      message: `${providerName} timed out after ${error.timeoutMs}ms`,
      code: 'PROVIDER_TIMEOUT',
      retryable: true,
    };
  }
  if (error instanceof HttpError) {
    if (error.status === 401 || error.status === 403) {
      return {
        kind: 'error',
        message: `${providerName} rejected the credentials (HTTP ${error.status}). Check the API key / subscription.`,
        code: 'PROVIDER_UNAUTHORIZED',
      };
    }
    if (error.status === 404) {
      return { kind: 'not_found', message: `${providerName} has no record for this GSTIN`, code: 'NOT_FOUND' };
    }
    if (error.status === 429) {
      return {
        kind: 'error',
        message: `${providerName} rate limit exceeded. Lower LOOKUP_CONCURRENCY or retry later.`,
        code: 'PROVIDER_RATE_LIMITED',
        retryable: true,
      };
    }
    return {
      kind: 'error',
      message: `${providerName} error: ${error.message}${error.body ? ` — ${error.body}` : ''}`,
      code: `PROVIDER_HTTP_${error.status}`,
      retryable: error.retryable,
    };
  }
  const message = error instanceof Error ? error.message : String(error);
  return { kind: 'error', message: `${providerName} request failed: ${message}`, code: 'PROVIDER_UNREACHABLE', retryable: true };
}
