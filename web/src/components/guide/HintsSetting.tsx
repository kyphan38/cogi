"use client";

import { useState, useSyncExternalStore } from "react";

import { WordChoice } from "@/components/shared/WordChoice";
import { hintStore } from "@/lib/guide/hint-store";

/** Settings row: hints fade out by themselves; this turns them off or starts them again. */
export function HintsSetting() {
  const on = useSyncExternalStore(
    hintStore.subscribe,
    hintStore.on,
    () => true,
  );
  const [reset, setReset] = useState(false);
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
      <WordChoice
        label="Hints"
        value={on ? "on" : "off"}
        options={[
          { value: "on", label: "on" },
          { value: "off", label: "off" },
        ]}
        onChange={(v) => hintStore.setOn(v === "on")}
      />
      <button
        type="button"
        onClick={() => {
          hintStore.reset();
          setReset(true);
        }}
        className="py-1 text-body text-faint hover:text-foreground"
      >
        {reset ? "shown again" : "show again"}
      </button>
    </div>
  );
}
