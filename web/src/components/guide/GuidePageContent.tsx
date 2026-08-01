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
          System overview and practice reference.
        </p>
      </header>



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
