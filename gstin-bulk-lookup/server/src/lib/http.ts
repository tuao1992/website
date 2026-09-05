/** Small fetch wrapper: per-request timeout, retry with backoff, JSON parsing. */

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }

  /** 408/429/5xx are worth another attempt; 4xx generally are not. */
  get retryable(): boolean {
    return this.status === 408 || this.status === 429 || this.status >= 500;
  }
}

export class TimeoutError extends Error {
  constructor(readonly timeoutMs: number) {
    super(`upstream did not respond within ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs: number;
  /** Aborts the request when the caller (e.g. a disconnected browser) gives up. */
  signal?: AbortSignal;
}

/** Perform one HTTP request, returning parsed JSON. Throws HttpError / TimeoutError. */
export async function requestJson<T = unknown>(url: string, options: RequestOptions): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new TimeoutError(options.timeoutMs)), options.timeoutMs);
  const onOuterAbort = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener('abort', onOuterAbort, { once: true });

  try {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: { accept: 'application/json', ...(options.headers ?? {}) },
      body: options.body,
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) {
      throw new HttpError(`upstream responded ${response.status} ${response.statusText}`, response.status, text.slice(0, 500));
    }
    if (text.trim() === '') return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new HttpError('upstream returned a non-JSON body', response.status, text.slice(0, 500));
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (controller.signal.aborted) {
      const reason = controller.signal.reason;
      if (reason instanceof TimeoutError) throw reason;
      throw new TimeoutError(options.timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onOuterAbort);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Retry `task` on retryable failures with exponential backoff and jitter. */
export async function withRetry<T>(
  task: (attempt: number) => Promise<T>,
  options: { retries: number; baseDelayMs?: number; isRetryable?: (error: unknown) => boolean },
): Promise<T> {
  const baseDelay = options.baseDelayMs ?? 400;
  const isRetryable =
    options.isRetryable ??
    ((error: unknown) => error instanceof TimeoutError || (error instanceof HttpError && error.retryable));

  let lastError: unknown;
  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    try {
      return await task(attempt);
    } catch (error) {
      lastError = error;
      if (attempt === options.retries || !isRetryable(error)) break;
      await sleep(baseDelay * 2 ** attempt + Math.random() * 200);
    }
  }
  throw lastError;
}
