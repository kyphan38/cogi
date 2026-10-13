/** Exercise setup: pick a suggested topic or type one. */
export const ENTRY_MODE_OPTIONS = [
  { value: "suggested", label: "Suggested topics" },
  { value: "manual", label: "Type your own" },
] as const satisfies readonly { value: "suggested" | "manual"; label: string }[];
