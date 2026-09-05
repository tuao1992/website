/** Typed client for the lookup API. Same-origin in production, proxied in dev. */

import type { AppConfig, ExportFormat, LookupResult, LookupSummary, UploadResponse, ValidationItem } from './types';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function readError(response: Response): Promise<never> {
  let message = `Request failed (HTTP ${response.status})`;
  let code: string | undefined;
  try {
    const body = (await response.json()) as { message?: string; error?: string };
    if (body.message) message = body.message;
    code = body.error;
  } catch {
    /* keep the default message */
  }
  throw new ApiError(message, response.status, code);
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) await readError(response);
  return (await response.json()) as T;
}

async function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) await readError(response);
  return (await response.json()) as T;
}

export const fetchConfig = () => getJson<AppConfig>('/api/config');

export const validateGstins = (gstins: string[], signal?: AbortSignal) =>
  postJson<{ items: ValidationItem[]; validCount: number; invalidCount: number }>('/api/validate', { gstins }, signal);

export async function uploadFile(file: File, signal?: AbortSignal): Promise<UploadResponse> {
  const form = new FormData();
  form.append('file', file);
  const response = await fetch('/api/upload', { method: 'POST', body: form, signal });
  if (!response.ok) await readError(response);
  return (await response.json()) as UploadResponse;
}

export interface StreamHandlers {
  onStart?: (total: number, provider: string) => void;
  onResult: (result: LookupResult, completed: number, total: number) => void;
  onSummary?: (summary: LookupSummary) => void;
}

type Frame =
  | { type: 'start'; total: number; provider: string }
  | { type: 'result'; completed: number; total: number; result: LookupResult }
  | { type: 'summary'; summary: LookupSummary }
  | { type: 'error'; message: string };

/**
 * Stream a batch as newline-delimited JSON so rows land in the table as they
 * resolve. Falls back to nothing clever — if the browser cannot stream, the
 * caller can use `lookupBatch` instead.
 */
export async function lookupStream(gstins: string[], handlers: StreamHandlers, signal?: AbortSignal): Promise<void> {
  const response = await fetch('/api/lookup/stream', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ gstins }),
    signal,
  });
  if (!response.ok) await readError(response);
  if (!response.body) throw new ApiError('Streaming is not supported by this browser', 500);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const handleLine = (line: string) => {
    if (line.trim() === '') return;
    const frame = JSON.parse(line) as Frame;
    switch (frame.type) {
      case 'start':
        handlers.onStart?.(frame.total, frame.provider);
        break;
      case 'result':
        handlers.onResult(frame.result, frame.completed, frame.total);
        break;
      case 'summary':
        handlers.onSummary?.(frame.summary);
        break;
      case 'error':
        throw new ApiError(frame.message, 502);
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newlineIndex = buffer.indexOf('\n');
    while (newlineIndex >= 0) {
      handleLine(buffer.slice(0, newlineIndex));
      buffer = buffer.slice(newlineIndex + 1);
      newlineIndex = buffer.indexOf('\n');
    }
  }
  handleLine(buffer);
}

export const lookupBatch = (gstins: string[], signal?: AbortSignal) =>
  postJson<{ results: LookupResult[]; summary: LookupSummary }>('/api/lookup', { gstins }, signal);

/** Ask the server to render the currently displayed rows and trigger a download. */
export async function downloadExport(
  format: ExportFormat,
  results: LookupResult[],
  summary: LookupSummary | null,
  filename: string,
): Promise<void> {
  const response = await fetch(`/api/export/${format}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ results, summary, filename }),
  });
  if (!response.ok) await readError(response);

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${filename}.${format}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on the next tick so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
