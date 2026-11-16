"use client";

import {
  getPerspectiveViewModel,
  getStructuredPerspectiveSections,
} from "@/lib/perspective/format-structured";
import { isLegacyPerspectiveStructured } from "@/lib/types/perspective";
import type { ClarityPerspectiveKind } from "@/lib/types/perspective";
import type { AIPerspectiveStructured } from "@/lib/types/perspective";

export default function HistoryPerspectiveBody({
  structured,
  kind,
}: {
  structured: AIPerspectiveStructured;
  kind: ClarityPerspectiveKind | null;
}) {
  if (kind && !isLegacyPerspectiveStructured(structured)) {
    const vm = getPerspectiveViewModel(structured, kind);
    if (vm.format === "clarity_v2") {
      return (
        <div className="text-muted-foreground space-y-4 text-body leading-relaxed">
          <p className="text-foreground text-body font-medium">
            {vm.suitableFor}
          </p>
          <ul className="list-none space-y-4 pl-0">
            {vm.blocks.map((b) => (
              <li key={b.id} className="space-y-2">
                {b.title ? (
                  <p className="text-foreground font-medium">{b.title}</p>
                ) : null}
                {b.userSnippet ? (
                  <p className="border-l-2 pl-3 text-meta">
                    <span className="font-medium">You wrote / selected: </span>
                    {b.userSnippet}
                  </p>
                ) : null}
                <p className="whitespace-pre-wrap">{b.body}</p>
                {b.remediation ? (
                  <p className="whitespace-pre-wrap text-meta">
                    <span className="font-medium">Stronger alternative: </span>
                    {b.remediation}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
          {vm.openQuestions.length > 0 ? (
            <div>
              <h4 className="text-foreground mb-2 font-medium">
                Open questions
              </h4>
              <ul className="list-disc space-y-1 pl-5">
                {vm.openQuestions.map((q, i) => (
                  <li key={i} className="whitespace-pre-wrap">
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      );
    }
  }
  if (isLegacyPerspectiveStructured(structured)) {
    return (
      <div className="text-muted-foreground space-y-4 text-body leading-relaxed">
        {getStructuredPerspectiveSections(structured).map((sec) => (
          <div key={sec.key}>
            <h4 className="text-foreground mb-2 font-medium">{sec.title}</h4>
            <ul className="list-disc space-y-2 pl-5">
              {sec.points.map((p) => (
                <li key={p.id} className="whitespace-pre-wrap">
                  {p.title ? (
                    <>
                      <span className="text-foreground font-medium">
                        {p.title}
                      </span>
                      {" - "}
                    </>
                  ) : null}
                  {p.body}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }
  return null;
}
