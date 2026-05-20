"use client";

import { useCallback, useState } from "react";
import { HighlightTag } from "@/components/exercises/HighlightTag";
import { GeopoliticsProgressionCard } from "@/components/dashboard/GeopoliticsProgressionCard";
import {
  MinimalContainer,
  MinimalContainerAction,
  MinimalContainerFooter,
} from "@/components/shared/MinimalContainer";
import { Button } from "@/components/ui/button";
import { GEOPOLITICS_TAG_OPTIONS } from "@/lib/exercise/tag-labels";
import type { UserHighlight } from "@/lib/types/exercise";
import {
  LAYOUT_FIXTURE_PASSAGE,
  MOCK_GEO_COMPLETED,
} from "@/lib/dev/layout-fixtures-data";

export default function LayoutFixturesPage() {
  const [highlights, setHighlights] = useState<UserHighlight[]>([]);

  const stageSampleText = useCallback(() => {
    const el = document.querySelector<HTMLElement>('[data-testid="text-passage"]');
    if (!el) return;
    const range = document.createRange();
    const textNode = el.firstChild;
    if (textNode?.nodeType === Node.TEXT_NODE) {
      const text = textNode.textContent ?? "";
      const end = Math.min(48, text.length);
      range.setStart(textNode, 0);
      range.setEnd(textNode, end);
    } else {
      range.selectNodeContents(el);
      range.setEnd(el, Math.min(1, el.childNodes.length));
    }
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  }, []);

  const confirmSampleSelection = useCallback(() => {
    const el = document.querySelector<HTMLElement>('[data-testid="text-passage"]');
    if (!el) return;
    el.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, pointerType: "touch" }),
    );
  }, []);

  if (process.env.NODE_ENV === "production") {
    return (
      <main className="mx-auto max-w-lg p-8">
        <p className="text-sm text-muted-foreground">Not available in production.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-10 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Layout fixtures</h1>
        <p className="text-sm text-muted-foreground">
          Dev-only surfaces for Nordic Mono structural Playwright tests.
        </p>
      </header>

      <section aria-labelledby="progression-heading" className="space-y-4">
        <h2 id="progression-heading" className="font-tracker">
          Progression track
        </h2>
        <GeopoliticsProgressionCard completed={MOCK_GEO_COMPLETED} />
      </section>

      <section aria-labelledby="highlight-heading" className="space-y-4">
        <h2 id="highlight-heading" className="font-tracker">
          Highlight and semantic tags
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={stageSampleText}>
            Stage sample selection
          </Button>
          <Button type="button" variant="outline" onClick={confirmSampleSelection}>
            Tap to open tag picker
          </Button>
        </div>
        <div>
          <HighlightTag
            passage={LAYOUT_FIXTURE_PASSAGE}
            highlights={highlights}
            onChange={setHighlights}
            tagOptions={GEOPOLITICS_TAG_OPTIONS}
            onSelectionOverlap={() => {
              // no-op for fixtures
            }}
          />
        </div>
      </section>

      <section aria-labelledby="container-heading" className="space-y-4">
        <h2 id="container-heading" className="font-tracker">
          Minimal container
        </h2>
        <MinimalContainer
          data-testid="layout-fixture-container"
          title="Reference panel"
          description="Structural shell for workspace cards."
          footer={
            <MinimalContainerFooter>
              <MinimalContainerAction label="Primary action" variant="primary" />
              <MinimalContainerAction
                label="Secondary action"
                variant="secondary"
              />
            </MinimalContainerFooter>
          }
        >
          <p className="text-base leading-relaxed">
            Body content uses relaxed line-height and balanced vertical rhythm.
          </p>
        </MinimalContainer>
      </section>
    </main>
  );
}
