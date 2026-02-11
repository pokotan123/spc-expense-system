interface RetryOptions {
  readonly maxRetries?: number
  readonly baseDelayMs?: number
  readonly maxDelayMs?: number
  readonly shouldRetry?: (error: unknown) => boolean
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  shouldRetry: () => true,
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function calculateDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
): number {
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt)
  const jitter = Math.random() * baseDelayMs * 0.5
  return Math.min(exponentialDelay + jitter, maxDelayMs)
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options }
  let lastError: unknown

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (attempt >= config.maxRetries) break
      if (!config.shouldRetry(error)) break

      const delay = calculateDelay(
        attempt,
        config.baseDelayMs,
        config.maxDelayMs,
      )
      await sleep(delay)
    }
  }

  throw lastError
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('timeout') ||
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('network') ||
      message.includes('socket hang up') ||
      message.includes('too many requests')
    )
  }
  return false
}
