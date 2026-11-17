/** A Gemini call that ran out of time (our abort or Gemini's own 504). */
export function isTimeoutError(e: unknown): boolean {
  return e instanceof Error && (e.name === "AbortError" || /time(d)? ?out/i.test(e.message));
}

/**
 * Run `fn`, and once more if it timed out. Slow replies come and go: the same request
 * usually works on the second try, so the user should not have to press again.
 */
export async function retryOnTimeout<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (!isTimeoutError(e)) throw e;
    return fn();
  }
}
