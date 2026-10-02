"use client";

import { useMemo, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  AIPerspectiveStructured,
  EvaluativeScoringCriterionBreakdown,
} from "@/lib/types/perspective";
import type { ClarityPerspectiveKind } from "@/lib/types/perspective";
import { isLegacyPerspectiveStructured } from "@/lib/types/perspective";
import type { PerspectiveKind } from "@/lib/types/perspective";
import {
  getPerspectiveViewModel,
  getStructuredPerspectiveSections,
} from "@/lib/perspective/format-structured";
import { highlightTerms as applyHighlightTerms } from "@/lib/text/highlight-terms";

export interface AIPerspectiveProps {
  text: string;
  structured?: AIPerspectiveStructured | null;
  perspectiveKind: PerspectiveKind;
  /** Client-computed weight/score breakdown, replaces the run-on "You wrote / selected" line for evaluative-scoring. */
  evaluativeScoringBreakdown?: EvaluativeScoringCriterionBreakdown[];
  /** Option titles + criterion/axis labels to highlight in AI-generated prose. Nothing else is highlighted. */
  highlightTerms?: string[];
}

function highlightedText(text: string, terms: string[] | undefined): ReactNode {
  return terms && terms.length > 0 ? applyHighlightTerms(text, terms) : text;
}

function PerspectivePoint({ children }: { children: ReactNode }) {
  return <li className="border-muted space-y-2 border-b py-3 last:border-0">{children}</li>;
}

function CriterionBreakdownTable({ breakdown }: { breakdown: EvaluativeScoringCriterionBreakdown }) {
  return (
    <div className="bg-muted/40 border-muted rounded-md border px-3 py-2 text-xs">
      <p className="text-foreground mb-1 font-medium">
        Your weight: {breakdown.userWeight}/5
        {breakdown.aiSuggestedWeight != null ? (
          <span className="text-muted-foreground font-normal">
            {" "}
            · AI suggested: {breakdown.aiSuggestedWeight}/5
          </span>
        ) : null}
      </p>
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-muted-foreground">
            <th className="py-0.5 text-left font-medium">Option</th>
            <th className="py-0.5 text-right font-medium">Your score</th>
            <th className="py-0.5 text-right font-medium">AI suggested</th>
          </tr>
        </thead>
        <tbody>
          {breakdown.optionScores.map((o) => (
            <tr key={o.optionId} className="border-muted/60 border-t">
              <td className="py-1 pr-2">{o.optionTitle}</td>
              <td className="py-1 text-right font-medium">{o.userScore}</td>
              <td className="py-1 text-muted-foreground text-right">
                {o.aiSuggestedScore ?? "–"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Structured AI feedback sections (read-only). */
export function AIPerspective({
  text,
  structured,
  perspectiveKind,
  evaluativeScoringBreakdown,
  highlightTerms,
}: AIPerspectiveProps) {
  const breakdownById = useMemo(() => {
    const m = new Map<string, EvaluativeScoringCriterionBreakdown>();
    for (const b of evaluativeScoringBreakdown ?? []) m.set(b.criterionId, b);
    return m;
  }, [evaluativeScoringBreakdown]);

  const clarityKind: ClarityPerspectiveKind = perspectiveKind;

  const viewModel =
    structured && clarityKind ? getPerspectiveViewModel(structured, clarityKind) : null;

  const legacySections =
    structured && isLegacyPerspectiveStructured(structured)
      ? getStructuredPerspectiveSections(structured)
      : viewModel?.format === "legacy"
        ? viewModel.sections
        : null;

  const suitableFor = viewModel?.format === "clarity_v2" ? viewModel.suitableFor : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">AI perspective</CardTitle>
        {suitableFor ? (
          <p className="text-muted-foreground text-sm font-normal">{suitableFor}</p>
        ) : null}
      </CardHeader>
      <CardContent className="max-h-[min(70vh,720px)] overflow-y-auto pr-1">
        {viewModel?.format === "clarity_v2" ? (
          <div className="text-muted-foreground space-y-6 text-sm leading-relaxed">
            <ul className="list-none space-y-0 pl-0">
              {viewModel.blocks.map((b) => {
                const breakdown = breakdownById.get(b.id);
                return (
                  <PerspectivePoint key={b.id}>
                    <div className="space-y-2">
                      {b.title ? <p className="text-foreground font-medium">{b.title}</p> : null}
                      {breakdown ? (
                        <CriterionBreakdownTable breakdown={breakdown} />
                      ) : b.userSnippet ? (
                        <div className="bg-muted/40 border-muted rounded-md border px-3 py-2 text-xs">
                          <span className="text-foreground font-medium">You wrote / selected: </span>
                          <span className="whitespace-pre-wrap">{b.userSnippet}</span>
                        </div>
                      ) : null}
                      <p className="whitespace-pre-wrap">{highlightedText(b.body, highlightTerms)}</p>
                      {b.remediation ? (
                        <p className="whitespace-pre-wrap">
                          <span className="text-foreground font-medium">Stronger alternative: </span>
                          {highlightedText(b.remediation, highlightTerms)}
                        </p>
                      ) : null}
                    </div>
                  </PerspectivePoint>
                );
              })}
            </ul>
            {viewModel.openQuestions.length > 0 ? (
              <div>
                <h3 className="text-foreground mb-3 font-semibold">Open questions</h3>
                <ul className="list-none space-y-0 pl-0">
                  {viewModel.openQuestions.map((q, i) => {
                    return (
                      <PerspectivePoint key={`open_${i + 1}`}>
                        <p className="whitespace-pre-wrap">{highlightedText(q, highlightTerms)}</p>
                      </PerspectivePoint>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        ) : legacySections ? (
          <div className="text-muted-foreground space-y-6 text-sm leading-relaxed">
            {legacySections.map((sec) => (
              <div key={sec.key}>
                <h3 className="text-foreground mb-3 font-semibold">{sec.title}</h3>
                <ul className="list-none space-y-0 pl-0">
                  {sec.points.map((p) => (
                    <PerspectivePoint key={p.id}>
                      <div className="whitespace-pre-wrap">
                        {p.title ? (
                          <>
                            <span className="text-foreground font-medium">{p.title}</span>
                            {" - "}
                          </>
                        ) : null}
                        {highlightedText(p.body, highlightTerms)}
                      </div>
                    </PerspectivePoint>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
            {text}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
