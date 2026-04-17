import { readAiSecretFromStorage } from "@/lib/api/ai-client";
import { AI_SECRET_HEADER } from "@/lib/api/ai-secret-constants";

/**
 * POST (or other) to `/api/ai/...` with the app secret header from localStorage.
 * Call only from client components after sign-in.
 */
export async function aiFetch(path: string, init?: RequestInit): Promise<Response> {
  const secret = readAiSecretFromStorage();
  if (!secret) {
    return Promise.reject(new Error("Not signed in"));
  }
  const headers = new Headers(init?.headers);
  headers.set(AI_SECRET_HEADER, secret);
  if (init?.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(path, { ...init, headers });
}
