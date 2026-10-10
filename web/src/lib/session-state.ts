/**
 * Small per-tab memory for page state (filters, generated lists), so going back to a
 * page shows what was there. Lost when the tab closes. Storage can be blocked, so every
 * call is safe to fail.
 */
export function readSessionState<T>(key: string): T | null {
  try {
    const raw = typeof window !== "undefined" ? window.sessionStorage.getItem(key) : null;
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeSessionState(key: string, value: unknown): void {
  try {
    if (value == null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Only a convenience.
  }
}
