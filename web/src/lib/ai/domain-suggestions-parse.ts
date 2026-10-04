export interface DomainSuggestion {
  domain: string;
  subdomain: string;
  why: string;
}

const key = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Parse the model's JSON; drop broken items, repeats, and sub-domains in `exclude`. */
export function parseDomainSuggestions(raw: string, exclude: string[], max = 6): DomainSuggestion[] | null {
  const excluded = new Set(exclude.map(key));
  let arr: unknown;
  try {
    arr = JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return null;
  }
  if (!Array.isArray(arr)) return null;
  const out: DomainSuggestion[] = [];
  const seen = new Set<string>();
  for (const item of arr) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    if (typeof r.domain !== "string" || typeof r.subdomain !== "string" || typeof r.why !== "string") continue;
    const domain = r.domain.trim();
    const subdomain = r.subdomain.trim();
    const why = r.why.trim();
    if (!domain || !subdomain || !why) continue;
    const k = key(subdomain);
    if (excluded.has(k) || seen.has(k)) continue;
    seen.add(k);
    out.push({ domain, subdomain, why });
    if (out.length >= max) break;
  }
  return out.length > 0 ? out : null;
}
