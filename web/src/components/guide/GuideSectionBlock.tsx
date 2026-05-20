import Link from "next/link";
import type { GuideSection } from "@/lib/guide/guide-sections";
import { MinimalContainer } from "@/components/shared/MinimalContainer";

export function GuideSectionBlock({ section }: { section: GuideSection }) {
  return (
    <MinimalContainer
      data-testid={`guide-section-${section.id}`}
      title={
        <span id={section.id} className="scroll-mt-28">
          {section.title}
        </span>
      }
      description={section.summary}
      bodyClassName="space-y-4"
    >
      <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-800">
        {section.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>

      {section.subsections?.map((sub) => (
        <div key={sub.title} className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-900">{sub.title}</h3>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-700">
            {sub.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      ))}

      {section.links && section.links.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-t border-zinc-200 pt-4">
          <span className="w-full text-xs font-medium text-zinc-500">Try it</span>
          {section.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex items-center rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
            >
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </MinimalContainer>
  );
}
