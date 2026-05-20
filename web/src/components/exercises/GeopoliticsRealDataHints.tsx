"use client";

import { isGeopoliticsRelated } from "@/lib/exercise/geopolitics-domains";

export const GEOPOLITICS_REAL_DATA_SOURCES = [
  { label: "Foreign Affairs (foreignaffairs.com)", note: "US establishment view" },
  { label: "The Diplomat (thediplomat.com)", note: "Asia-Pacific focus" },
  { label: "IISS Strategic Comments", note: "Concise strategic analysis" },
  { label: "CSIS (csis.org)", note: "US-aligned think tank" },
  { label: "Chatham House (chathamhouse.org)", note: "UK/European perspective" },
  { label: "South China Morning Post", note: "Hong Kong-based, Chinese perspective on Asia" },
  { label: "VnExpress International", note: "Vietnamese perspective" },
  { label: "East Asia Forum (eastasiaforum.org)", note: "Academic, multi-perspective" },
  { label: "War on the Rocks (warontherocks.com)", note: "Defense and security" },
  { label: "Fulcrum (fulcrum.sg)", note: "ASEAN-focused, ISEAS" },
] as const;

export function GeopoliticsRealDataHints({
  domain,
  mode,
}: {
  domain: string;
  mode: "generated" | "real_data" | "custom_scenario";
}) {
  if (!isGeopoliticsRelated(domain)) return null;

  return (
    <div className="animate-in fade-in-0 min-h-[2.5rem] duration-200">
      {mode === "generated" ? (
        <p className="text-muted-foreground text-xs">
          Tip: For geopolitics, try pasting a real article or analysis from a think tank, news
          outlet, or policy brief. Real-world framing biases are more instructive than
          AI-generated ones.
        </p>
      ) : null}
      {mode === "real_data" ? (
        <details className="text-muted-foreground text-xs">
          <summary className="cursor-pointer">Suggested sources for geopolitics practice</summary>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {GEOPOLITICS_REAL_DATA_SOURCES.map((s) => (
              <li key={s.label}>
                {s.label} - {s.note}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
