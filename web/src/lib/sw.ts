// ============================================================
// cogi - Service worker registration
//
// Copied from fina/src/lib/sw.ts. This file imports nothing, on purpose.
//
// The app-shell cache decides how fast the app opens. It should not wait for
// the push SDK to load and start. Unrelated jobs should not queue behind
// each other.
// ============================================================

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    // Safari private mode and some other contexts refuse. The app still
    // works, just without the cache and push.
    return null;
  }
}
