import type { Exercise } from "@/lib/types/exercise";
import type { ConfidenceRecord } from "@/lib/types/exercise";

const TOP_DOMAINS = 8;

export function aggregateCompletedByType(exercises: Exercise[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const e of exercises) {
    m[e.type] = (m[e.type] ?? 0) + 1;
  }
  return m;
}

export function aggregateCompletedByDomain(exercises: Exercise[]): { domain: string; count: number }[] {
  const m = new Map<string, number>();
  for (const e of exercises) {
    const d = e.domain.trim() || "Unknown";
    m.set(d, (m.get(d) ?? 0) + 1);
  }
  const arr = [...m.entries()]
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count);
  const top = arr.slice(0, TOP_DOMAINS);
  const rest = arr.slice(TOP_DOMAINS).reduce((s, x) => s + x.count, 0);
  if (rest > 0) top.push({ domain: "Other", count: rest });
  return top;
}

export function calibrationGapSeries(records: ConfidenceRecord[]): { t: string; gap: number }[] {
  return [...records]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((r) => ({ t: r.createdAt, gap: r.gap }));
}

export function totalCompleted(exercises: Exercise[]): number {
  return exercises.length;
}
