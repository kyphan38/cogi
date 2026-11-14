/**
 * "not today" on the Today page hides the next track step until the next day.
 * Stored per device; losing it only shows the step again.
 */
const KEY = "cogi.nextUpSkippedOn";

/** True when the stored day is today (both as local YYYY-MM-DD). */
export function isSkippedToday(stored: string | null, today: string): boolean {
  return stored === today;
}

export function readSkippedDay(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

const EVENT = "cogi-next-up-skip";

export function writeSkippedDay(day: string | null): void {
  try {
    if (day) window.localStorage.setItem(KEY, day);
    else window.localStorage.removeItem(KEY);
  } catch {
    // Only a convenience.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** For useSyncExternalStore: this tab's writes and other tabs' storage events. */
export function subscribeSkippedDay(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
