import { getFirebaseAuth } from "@/lib/auth/firebase-client";

function isE2EAuthBypass(): boolean {
  return (
    typeof window !== "undefined" &&
    !!(window as unknown as Record<string, unknown>).__E2E_AUTH_BYPASS__
  );
}

/**
 * POST (or other) to `/api/ai/...` with Firebase ID token when available.
 */
export async function aiFetch(path: string, init?: RequestInit): Promise<Response> {
  if (isE2EAuthBypass()) {
    const headers = new Headers(init?.headers);
    if (init?.body != null && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return fetch(path, { ...init, headers });
  }

  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    return Promise.reject(new Error("Not signed in - please refresh and sign in again."));
  }
  const headers = new Headers(init?.headers);
  let idToken: string;
  try {
    idToken = await user.getIdToken();
  } catch {
    return Promise.reject(
      new Error("Session expired - please refresh the page to sign in again."),
    );
  }
  headers.set("Authorization", `Bearer ${idToken}`);
  if (init?.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(path, { ...init, headers });
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
