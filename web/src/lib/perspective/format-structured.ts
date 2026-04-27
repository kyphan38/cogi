import type { AIPerspectiveStructured, PerspectivePoint } from "@/lib/types/perspective";

export const PERSPECTIVE_UI_SECTIONS = [
  { key: "embedded" as const, title: "What I intentionally embedded" },
  { key: "userFound" as const, title: "Things you found that I didn't plan" },
  { key: "additional" as const, title: "Additional perspectives to consider" },
  { key: "openQuestions" as const, title: "Open questions" },
];

export function getStructuredPerspectiveSections(s: AIPerspectiveStructured): {
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

function section(title: string, points: { title?: string; body: string }[]): string {
  const lines = points.map((p) => {
    const head = p.title?.trim() ? `**${p.title.trim()}** - ` : "";
    return `- ${head}${p.body.trim()}`;
  });
  return `## ${title}\n${lines.join("\n")}`;
}

/** Flatten structured perspective to markdown for storage / legacy consumers. */
export function structuredPerspectiveToMarkdown(s: AIPerspectiveStructured): string {
  return [
    section("What I intentionally embedded", s.embedded),
    section("Things you found that I didn't plan", s.userFound),
    section("Additional perspectives to consider", s.additional),
    section("Open questions", s.openQuestions),
  ].join("\n\n");
}
