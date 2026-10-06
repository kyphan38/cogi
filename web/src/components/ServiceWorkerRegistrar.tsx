'use client';

import { useEffect } from 'react';

import { registerServiceWorker } from '@/lib/sw';

/**
 * Registers the service worker for the whole app.
 *
 * Copied from fina. Renders nothing. Lives in the root layout so it runs on
 * the sign-in screen too.
 *
 * Imports from `@/lib/sw`, not from push: push pulls in all of
 * `firebase/messaging`, and the app-shell cache should not wait for it.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    void registerServiceWorker();
  }, []);
  return null;
}
