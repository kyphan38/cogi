import type { ClarityPerspectiveKind } from "@/lib/types/perspective";
import type {
  AIPerspectiveStructured,
  AnalyticalCoachingStructured,
  ClarityPerspectiveStructured,
  LegacyPerspectiveStructured,
  PerspectivePoint,
} from "@/lib/types/perspective";
import {
  isAnalyticalCoachingStructured,
  isClarityPerspectiveStructured,
  isLegacyPerspectiveStructured,
} from "@/lib/types/perspective";

export const PERSPECTIVE_UI_SECTIONS = [
  { key: "embedded" as const, title: "What I intentionally embedded" },
  { key: "userFound" as const, title: "Things you found that I didn't plan" },
  { key: "additional" as const, title: "Additional perspectives to consider" },
  { key: "openQuestions" as const, title: "Open questions" },
];

export type ClarityPerspectiveBlock = {
  id: string;
  title: string | null;
  userSnippet: string | null;
  body: string;
  remediation: string | null;
};

export type ClarityPerspectiveViewModel = {
  format: "clarity_v2";
  suitableFor: string;
  blocks: ClarityPerspectiveBlock[];
  openQuestions: string[];
};

/** @deprecated Use getPerspectiveViewModel */
export function getStructuredPerspectiveSections(s: LegacyPerspectiveStructured): {
  key: (typeof PERSPECTIVE_UI_SECTIONS)[number]["key"];
  title: string;
  points: PerspectivePoint[];
}[] {
  return PERSPECTIVE_UI_SECTIONS.map(({ key, title }) => ({
    key,
    title,
    points: s[key],
  }));
}

function legacySection(title: string, points: { title?: string; body: string }[]): string {
  const lines = points.map((p) => {
    const head = p.title?.trim() ? `**${p.title.trim()}** - ` : "";
    return `- ${head}${p.body.trim()}`;
  });
  return `## ${title}\n${lines.join("\n")}`;
}

export function getClarityPerspectiveViewModel(
  s: ClarityPerspectiveStructured,
  kind: ClarityPerspectiveKind,
): ClarityPerspectiveViewModel {
  const openQuestions = s.openQuestions ?? [];
  const blocks: ClarityPerspectiveBlock[] = [];

  if (kind === "analytical" && "highlightCritiques" in s) {
    for (const [i, row] of s.highlightCritiques.entries()) {
      const id = row.id ?? `hc_${i + 1}`;
      blocks.push({
        id,
        title: null,
        userSnippet: row.userTextSnippet,
        body: row.critique,
        remediation: row.remediationAlternative,
      });
    }
  } else if (kind === "systems" && "nodeCritiques" in s) {
    for (const row of s.nodeCritiques) {
      blocks.push({
        id: row.nodeId,
        title: row.nodeLabel,
        userSnippet: row.userContextSnippet || `Impact: ${row.userImpact}`,
        body: row.critique,
        remediation: row.remediationAlternative,
      });
    }
  } else if (kind === "evaluative-matrix" && "placementCritiques" in s) {
    for (const row of s.placementCritiques) {
      blocks.push({
        id: row.optionId,
        title: row.optionTitle,
        userSnippet: row.userValueContext,
        body: row.aiEvaluationText,
        remediation: null,
      });
    }
  } else if (kind === "evaluative-scoring" && "critiqueMatrix" in s) {
    for (const row of s.critiqueMatrix) {
      blocks.push({
        id: row.criterionId,
        title: row.criterionLabel,
        userSnippet: row.userValueContext,
        body: row.aiEvaluationText,
        remediation: null,
      });
    }
  } else if (kind === "evaluative-uncertainty" && "outcomeCritiques" in s) {
    for (const row of s.outcomeCritiques) {
      const evLine = `Implied user EV: ${row.userImpliedEv ?? "n/a"} · AI EV: ${row.aiEv ?? "n/a"}`;
      blocks.push({
        id: row.optionId,
        title: row.optionTitle,
        userSnippet: evLine,
        body: row.critique,
        remediation: null,
      });
    }
  }


  return {
    format: "clarity_v2",
    suitableFor: s.suitableFor,
    blocks,
    openQuestions,
  };
}

export type PerspectiveViewModel =
  | { format: "legacy"; sections: ReturnType<typeof getStructuredPerspectiveSections> }
  | ({ format: "clarity_v2" } & ClarityPerspectiveViewModel);

export function getPerspectiveViewModel(
  structured: AIPerspectiveStructured,
  kind: ClarityPerspectiveKind,
): PerspectiveViewModel {
  if (isClarityPerspectiveStructured(structured)) {
    return getClarityPerspectiveViewModel(structured, kind);
  }
  if (isAnalyticalCoachingStructured(structured)) {
    // The answer key renders v3 with its context; this is only a plain fallback.
    return {
      format: "clarity_v2",
      suitableFor: "",
      blocks: structured.items.map((it) => ({
        id: it.ref,
        title: it.subtypeName ?? null,
        userSnippet: null,
        body: `${it.why}\nClue: ${it.clue}\nNext time, ask: ${it.nextTimeAsk}`,
        remediation: null,
      })),
      openQuestions: structured.takeaways,
    };
  }
  if (isLegacyPerspectiveStructured(structured)) {
    return { format: "legacy", sections: getStructuredPerspectiveSections(structured) };
  }
  return { format: "legacy", sections: getStructuredPerspectiveSections(structured as LegacyPerspectiveStructured) };
}

/**
 * Flatten analytical v3 feedback to markdown for storage. `heading` turns a ref into a
 * readable line (the route knows the passage text behind each ref).
 */
export function analyticalCoachingToMarkdown(
  s: AnalyticalCoachingStructured,
  heading: (ref: string) => string = (ref) => ref,
): string {
  const parts = s.items.map((it) =>
    [
      `**${heading(it.ref)}**${it.subtypeName ? ` (${it.subtypeName})` : ""}`,
      `Why: ${it.why}`,
      `Clue: ${it.clue}`,
      `Next time, ask: ${it.nextTimeAsk}`,
    ].join("\n"),
  );
  if (s.metaNote) parts.push(`**Perspective:** ${s.metaNote}`);
  parts.push(legacySection("Take with you", s.takeaways.map((t) => ({ body: t }))));
  return parts.join("\n\n");
}

/** Flatten structured perspective to markdown for storage / legacy consumers. */
export function structuredPerspectiveToMarkdown(
  s: AIPerspectiveStructured,
  kind: ClarityPerspectiveKind,
): string {
  if (isAnalyticalCoachingStructured(s)) return analyticalCoachingToMarkdown(s);
  if (isClarityPerspectiveStructured(s)) {
    const vm = getClarityPerspectiveViewModel(s, kind);
    const parts: string[] = [`### ${vm.suitableFor}`, ""];
    for (const b of vm.blocks) {
      const head = b.title ? `**${b.title}**\n` : "";
      parts.push(
        `${head}**You wrote/selected:** ${b.userSnippet ?? ""}\n\n${b.body}${
          b.remediation ? `\n\n**Stronger alternative:** ${b.remediation}` : ""
        }`,
      );
    }
    if (vm.openQuestions.length) {
      parts.push(
        legacySection(
          "Open questions",
          vm.openQuestions.map((q) => ({ body: q })),
        ),
      );
    }
    return parts.join("\n\n");
  }

  const legacy = s as LegacyPerspectiveStructured;
  return [
    legacySection("What I intentionally embedded", legacy.embedded),
    legacySection("Things you found that I didn't plan", legacy.userFound),
    legacySection("Additional perspectives to consider", legacy.additional),
    legacySection("Open questions", legacy.openQuestions),
  ].join("\n\n");
}
