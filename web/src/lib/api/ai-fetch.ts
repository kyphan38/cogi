import { getFirebaseAuth } from "@/lib/auth/firebase-client";
import { getLanguageLevelForRequest } from "@/lib/adaptive/adaptive-hints";

function isE2EAuthBypass(): boolean {
  return (
    typeof window !== "undefined" &&
    !!(window as unknown as Record<string, unknown>).__E2E_AUTH_BYPASS__
  );
}

/**
 * Merge the current Language Level setting into a JSON request body, unless the
 * caller already set it explicitly. This lets every `/api/ai/*` call stay
 * language-aware without each call site having to fetch and thread the setting
 * itself.
 */
async function withLanguageLevel(
  body: BodyInit | null | undefined,
): Promise<BodyInit | null | undefined> {
  if (typeof body !== "string") return body;
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return body;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return body;
  const obj = parsed as Record<string, unknown>;
  if ("languageLevel" in obj) return body;
  const languageLevel = await getLanguageLevelForRequest();
  return JSON.stringify({ ...obj, languageLevel });
}

/**
 * POST (or other) to `/api/ai/...` with Firebase ID token when available.
 */
export async function aiFetch(path: string, init?: RequestInit): Promise<Response> {
  const body = await withLanguageLevel(init?.body);
  const resolvedInit: RequestInit | undefined = init ? { ...init, body } : init;

  if (isE2EAuthBypass()) {
    const headers = new Headers(resolvedInit?.headers);
    if (resolvedInit?.body != null && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return fetch(path, { ...resolvedInit, headers });
  }

  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    return Promise.reject(new Error("Not signed in - please refresh and sign in again."));
  }
  const headers = new Headers(resolvedInit?.headers);
  let idToken: string;
  try {
    idToken = await user.getIdToken();
  } catch {
    return Promise.reject(
      new Error("Session expired - please refresh the page to sign in again."),
    );
  }
  headers.set("Authorization", `Bearer ${idToken}`);
  if (resolvedInit?.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(path, { ...resolvedInit, headers });
}

/**
 * Parse an AI fetch response with proper HTTP status checking.
 * Throws a user-friendly Error when the response is not OK,
 * instead of letting JSON.parse fail on HTML error pages.
 */
export async function safeAiJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg: string;
    try {
      const body = (await res.json()) as { error?: string };
      msg = body.error || `Server error (${res.status})`;
    } catch {
      msg =
        res.status === 504
          ? "Exercise generation timed out. Please try again."
          : `Server error (${res.status}). Please try again.`;
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}
