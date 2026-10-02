// ============================================================
// cogi - Dang ky service worker
//
// Copy tu fina/src/lib/sw.ts. File nay KHONG import gi ca, co y.
//
// Cache app-shell - thu quyet dinh app mo nhanh hay cham - khong co ly do
// gi phai cho SDK push tai va khoi tao duoc. Hai viec khong lien quan thi
// dung de mot cai dung sau cai kia.
// ============================================================

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    // Safari private mode va mot vai ngu canh khac tu choi. App van chay,
    // chi la khong co cache va khong nhan duoc push.
    return null;
  }
}
