/** Retries a flaky call (e.g. a cold pooled DB connection at startup) with a short linear backoff. */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 1000, shouldRetry: (e: unknown) => boolean = () => true): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i >= attempts || !shouldRetry(err)) throw err
      await new Promise((r) => setTimeout(r, delayMs * i))
    }
  }
}
