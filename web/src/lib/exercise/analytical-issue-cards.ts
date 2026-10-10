import type { AnalyticalResult, EmbeddedIssue, TagType } from "@/lib/types/exercise";
import type { AnalyticalCardKey } from "@/lib/exercise/analytical-issue-guide";
import { firstKeys } from "@/lib/exercise/take-with-you";

const isIssueType = (t: TagType | null | undefined): t is EmbeddedIssue["type"] =>
  t != null && t !== "valid_point" && t !== "unclear";

/**
 * Which issue types get a "Take with you" card, decided in code so the server prompt
 * and the answer key agree: first issues the user missed, then ones found with another
 * tag, then the tag they put on a sound statement (the one they over-use), then the
 * rest. A passage with no planned issues starts with "Sound reasoning".
 */
export function pickIssueCards(
  embeddedIssues: Pick<EmbeddedIssue, "type">[],
  result: Pick<AnalyticalResult, "issues" | "decoys" | "total">,
): AnalyticalCardKey[] {
  const planned = (i: number) => embeddedIssues[i]?.type;
  return firstKeys([
    result.total === 0 ? "sound_reasoning" : null,
    ...result.issues.filter((o) => !o.found).map((o) => planned(o.index)),
    ...result.issues.filter((o) => o.found && !o.tagCorrect).map((o) => planned(o.index)),
    ...result.decoys.filter((d) => d.trapped && isIssueType(d.userTag)).map((d) => d.userTag),
    ...result.issues.map((o) => planned(o.index)),
  ]) as AnalyticalCardKey[];
}
