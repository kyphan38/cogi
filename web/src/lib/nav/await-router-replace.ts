type RouterLike = { replace: (href: string) => unknown };

function isAbortLike(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  if ("name" in e && (e as { name: string }).name === "AbortError") return true;
  return false;
}

/**
 * `router.replace` may return a Promise (App Router) that rejects with AbortError when
 * a newer navigation supersedes it - must be awaited or explicitly handled.
 */
export async function awaitRouterReplace(router: RouterLike, href: string): Promise<void> {
  try {
    await Promise.resolve(router.replace(href));
  } catch (e) {
    if (isAbortLike(e)) {
      return;
    }
    console.error("[nav] router.replace failed", e);
  }
}
