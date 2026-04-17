import { AI_SECRET_STORAGE_KEY } from "@/lib/api/ai-secret-constants";

export { AI_SECRET_STORAGE_KEY, AI_SECRET_HEADER } from "@/lib/api/ai-secret-constants";

export function readAiSecretFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(AI_SECRET_STORAGE_KEY)?.trim();
  return v && v.length > 0 ? v : null;
}
