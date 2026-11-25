import { getUserContext } from "@/lib/db/settings";
import { practiceFocusLine } from "@/lib/exercise/weak-spots";

/**
 * The user context sent when a new exercise is generated. An exercise opened from
 * "Your weak spots" (`?focus=<key>`) adds one line that aims it at that mistake.
 * Feedback requests use the plain `getUserContext`.
 */
export async function getGenerationContext(): Promise<string> {
  const context = await getUserContext();
  const focus = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("focus");
  return [context.trim(), practiceFocusLine(focus)].filter(Boolean).join("\n\n");
}

/** The adaptive track step a new exercise was started from (`?step=<id>`), if any. */
export function trackStepFromUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return new URLSearchParams(window.location.search).get("step")?.trim() || undefined;
}
