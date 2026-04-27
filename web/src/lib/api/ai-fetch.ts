import { getFirebaseAuth } from "@/lib/auth/firebase-client";

/**
 * POST (or other) to `/api/ai/...` with Firebase ID token when available.
 */
export async function aiFetch(path: string, init?: RequestInit): Promise<Response> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    return Promise.reject(new Error("Not signed in — please refresh and sign in again."));
  }
  const headers = new Headers(init?.headers);
  let idToken: string;
  try {
    idToken = await user.getIdToken();
  } catch {
    return Promise.reject(
      new Error("Session expired — please refresh the page to sign in again."),
    );
  }
  headers.set("Authorization", `Bearer ${idToken}`);
  if (init?.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(path, { ...init, headers });
}
