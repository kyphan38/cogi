"use client";

import { CONNECTION_TYPE_INFO } from "@/lib/exercise/systems-labels";

function GuideList() {
  return (
    <ul className="space-y-1">
      {Object.entries(CONNECTION_TYPE_INFO).map(([key, t]) => (
        <li key={key} className="text-sm">
          <span className="font-medium text-zinc-900">A {t.label} B</span>
          <span className="text-zinc-500"> - {t.meaning}</span>
        </li>
      ))}
    </ul>
  );
}

/** The four link types in plain words. "shown" at Guided, "toggle" at Standard. */
export function LinkTypeGuide({ mode }: { mode: "shown" | "toggle" }) {
  if (mode === "shown") {
    return (
      <div className="rounded-2xl border border-zinc-200 p-4" data-testid="link-type-guide">
        <p className="mb-2 text-sm font-medium text-zinc-900">Link types (arrow A -&gt; B):</p>
        <GuideList />
      </div>
    );
  }
  return (
    <details className="rounded-2xl border border-zinc-200 p-4" data-testid="link-type-guide">
      <summary className="cursor-pointer text-sm font-medium text-zinc-900">What each link type means</summary>
      <div className="mt-2">
        <GuideList />
      </div>
    </details>
  );
}
