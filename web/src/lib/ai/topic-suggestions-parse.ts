export interface TopicSuggestion {
  title: string;
  blurb: string;
}

function normalizeKey(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Parses and checks the model's raw JSON output; drops excluded and repeated titles. */
export function parseTopicSuggestions(raw: string, excludeTitles: string[]): TopicSuggestion[] | null {
  const excludeKeys = new Set(excludeTitles.map(normalizeKey));
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return null;
    const result: TopicSuggestion[] = [];
    const seenKeys = new Set<string>();
    for (const item of arr) {
      if (
        typeof item !== "object" ||
        item === null ||
        typeof (item as Record<string, unknown>).title !== "string" ||
        typeof (item as Record<string, unknown>).blurb !== "string"
      )
        continue;
      const title = ((item as Record<string, unknown>).title as string).trim();
      const blurb = ((item as Record<string, unknown>).blurb as string).trim();
      if (!title || !blurb) continue;
      const key = normalizeKey(title);
      if (excludeKeys.has(key) || seenKeys.has(key)) continue;
      seenKeys.add(key);
      result.push({ title, blurb });
      if (result.length >= 5) break;
    }
    return result.length > 0 ? result : null;
  } catch {
    return null;
  }
}
