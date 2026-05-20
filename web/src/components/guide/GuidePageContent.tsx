"use client";

import { GUIDE_SECTIONS } from "@/lib/guide/guide-sections";
import {
  MinimalContainer,
  MinimalContainerAction,
  MinimalContainerFooter,
} from "@/components/shared/MinimalContainer";
import { GuideSectionBlock } from "@/components/guide/GuideSectionBlock";
import { GuideTableOfContents } from "@/components/guide/GuideTableOfContents";

export function GuidePageContent() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
      <header className="mb-8 space-y-3">
        <p className="font-tracker">Reference</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          Cogi guide
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-600">
          Everything in the app in one place: exercise types, navigation, dashboard,
          history, settings, geopolitics practice, and troubleshooting.
        </p>
      </header>

      <MinimalContainer
        data-testid="guide-hero"
        title="Ready to practice?"
        description="Most people start with a short Analytical exercise, then explore other modes from Home."
        className="mb-8"
        footer={
          <MinimalContainerFooter>
            <MinimalContainerAction
              label="Start Analytical exercise"
              href="/exercise/analytical"
              variant="primary"
            />
            <MinimalContainerAction label="Back to Home" href="/" variant="secondary" />
          </MinimalContainerFooter>
        }
      >
        <p className="text-sm leading-relaxed text-zinc-600">
          Use the table of contents to jump to any section. Links labeled Try it open the
          relevant screen with no extra setup.
        </p>
      </MinimalContainer>

      <GuideTableOfContents variant="mobile" className="mb-6" />

      <div className="grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        <GuideTableOfContents variant="sidebar" />
        <div className="min-w-0 space-y-6">
          {GUIDE_SECTIONS.map((section) => (
            <GuideSectionBlock key={section.id} section={section} />
          ))}
        </div>
      </div>
    </div>
  );
}
