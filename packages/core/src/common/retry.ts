const DEFAULT_MAX_RETRIES = 10;
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 32_000;
const JITTER_FACTOR = 0.25;

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const status = (error as { status?: number }).status;
    if (status !== undefined && RETRYABLE_STATUS_CODES.has(status)) return true;
    if (error.message.includes("ECONNRESET")) return true;
    if (error.message.includes("ETIMEDOUT")) return true;
    if (error.message.includes("socket hang up")) return true;
    if (error.message.includes("rate limit")) return true;
    if (error.message.includes("overloaded")) return true;
  }
  return false;
}

function getDelayMs(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const exponential = baseDelayMs * Math.pow(2, attempt - 1);
  const capped = Math.min(exponential, maxDelayMs);
  const jitter = capped * JITTER_FACTOR * (Math.random() * 2 - 1);
  return Math.max(0, capped + jitter);
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? BASE_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? MAX_DELAY_MS;

  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (!isRetryableError(error) || attempt > maxRetries) {
        throw lastError;
      }
      const delayMs = getDelayMs(attempt, baseDelayMs, maxDelayMs);
      options.onRetry?.(attempt, lastError, delayMs);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}
