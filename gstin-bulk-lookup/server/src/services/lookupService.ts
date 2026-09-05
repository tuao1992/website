/**
 * Batch lookup orchestration.
 *
 * Order of operations per GSTIN:
 *   1. offline validation  — never spend an API call on a GSTIN that cannot exist
 *   2. cache               — repeat runs of the same spreadsheet are free
 *   3. provider            — bounded concurrency, retries handled inside the provider
 *
 * Every input produces exactly one result. Nothing is silently dropped: duplicates
 * are answered from the first lookup and flagged, and failures carry a reason.
 */

import { config } from '../config.js';
import { TtlCache } from '../lib/cache.js';
import { normalizeGstin, validateGstin } from '../lib/gstin.js';
import { runPool } from '../lib/pool.js';
import { getProvider } from '../providers/index.js';
import type { GstinRecord, LookupResult, LookupSummary, ProviderResponse } from '../types.js';

const cache = new TtlCache<ProviderResponse>(config.cacheTtlMs, config.cacheMaxEntries, config.cacheEnabled);

export function clearCache(): void {
  cache.clear();
}

export function cacheSize(): number {
  return cache.size;
}

function failedResult(
  input: string,
  gstin: string,
  status: LookupResult['status'],
  code: string,
  message: string,
  validation: LookupResult['validation'],
  source: string,
  durationMs: number,
): LookupResult {
  return { input, gstin, status, record: null, message, code, validation, source, cached: false, durationMs };
}

/** Look up a single GSTIN, applying offline validation and the cache. */
export async function lookupOne(input: string, signal: AbortSignal): Promise<LookupResult> {
  const startedAt = Date.now();
  const gstin = normalizeGstin(input);
  const check = validateGstin(gstin);
  const validation = {
    valid: check.valid,
    checksumValid: check.checksumValid,
    errors: check.errors,
    warnings: check.warnings,
  };

  if (!check.valid) {
    const code = !check.checksumValid && check.parts ? 'INVALID_CHECKSUM' : 'INVALID_FORMAT';
    return failedResult(
      input,
      gstin,
      'invalid',
      code,
      check.errors.join('; '),
      validation,
      'local-validation',
      Date.now() - startedAt,
    );
  }

  const provider = getProvider();
  const cached = cache.get(gstin);
  const response = cached ?? (await provider.lookup(gstin, signal));
  // Only cache determinate answers — a timeout or rate-limit must not be sticky.
  if (!cached && response.kind !== 'error') cache.set(gstin, response);

  const durationMs = Date.now() - startedAt;

  if (response.kind === 'found') {
    return {
      input,
      gstin,
      status: 'success',
      record: response.record,
      message: null,
      code: null,
      validation,
      source: provider.id,
      cached: cached !== undefined,
      durationMs,
    };
  }
  if (response.kind === 'not_found') {
    return {
      ...failedResult(input, gstin, 'not_found', response.code ?? 'NOT_FOUND', response.message, validation, provider.id, durationMs),
      cached: cached !== undefined,
    };
  }
  return failedResult(
    input,
    gstin,
    'error',
    response.code ?? 'PROVIDER_ERROR',
    response.message,
    validation,
    provider.id,
    durationMs,
  );
}

export interface BatchOptions {
  signal: AbortSignal;
  /** Invoked as each result settles, so callers can stream rows to the browser. */
  onResult?: (result: LookupResult, completed: number, total: number) => void | Promise<void>;
}

/**
 * Resolve a batch. Repeated GSTINs in the same batch are looked up once and the
 * answer is copied to every occurrence, so a 500-row sheet with 40 unique vendors
 * costs 40 API calls.
 */
export async function lookupBatch(inputs: readonly string[], options: BatchOptions): Promise<{
  results: LookupResult[];
  summary: LookupSummary;
}> {
  const startedAt = Date.now();
  const provider = getProvider();

  const uniqueOrder: string[] = [];
  const occurrences = new Map<string, number[]>();
  inputs.forEach((input, index) => {
    const key = normalizeGstin(input);
    const existing = occurrences.get(key);
    if (existing) {
      existing.push(index);
    } else {
      occurrences.set(key, [index]);
      uniqueOrder.push(key);
    }
  });

  const results = new Array<LookupResult>(inputs.length);
  let completed = 0;

  const emit = async (result: LookupResult, index: number) => {
    results[index] = result;
    completed += 1;
    if (options.onResult) await options.onResult(result, completed, inputs.length);
  };

  await runPool(uniqueOrder, config.concurrency, async (key) => {
    const indexes = occurrences.get(key) ?? [];
    const firstIndex = indexes[0] ?? 0;
    const base = await lookupOne(inputs[firstIndex] as string, options.signal);
    await emit(base, firstIndex);

    // Fan the single answer out to the duplicate rows, marked so the user can see why.
    for (const index of indexes.slice(1)) {
      await emit(
        {
          ...base,
          input: inputs[index] as string,
          cached: true,
          durationMs: 0,
          record: base.record ? ({ ...base.record } as GstinRecord) : null,
        },
        index,
      );
    }
  });

  const summary: LookupSummary = {
    total: results.length,
    success: results.filter((r) => r.status === 'success').length,
    invalid: results.filter((r) => r.status === 'invalid').length,
    notFound: results.filter((r) => r.status === 'not_found').length,
    errors: results.filter((r) => r.status === 'error').length,
    cached: results.filter((r) => r.cached).length,
    durationMs: Date.now() - startedAt,
    provider: provider.id,
  };

  return { results, summary };
}
