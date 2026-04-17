"use client";

import { useEffect, useState } from "react";
import type { AdaptiveExerciseType } from "@/lib/adaptive/types";
import {
  getPerformanceSnapshotForThinkingType,
  MIN_SAMPLES_FOR_TIER,
} from "@/lib/adaptive/performance-profile";
import { getAppSettings } from "@/lib/db/settings";

export function AdaptiveSetupHint({ exerciseType }: { exerciseType: AdaptiveExerciseType }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const s = await getAppSettings();
      if (s.adaptiveDifficultyEnabled !== true) {
        setText(null);
        return;
      }
      const snap = await getPerformanceSnapshotForThinkingType(exerciseType);
      if (snap.tier && snap.rollingMean != null) {
        setText(
          `Adaptive: ${snap.tier} tier (~${snap.rollingMean}% over last ${snap.sampleCount} exercise(s)).`,
        );
        return;
      }
      if (snap.sampleCount > 0 && snap.rollingMean != null) {
        const need = Math.max(0, MIN_SAMPLES_FOR_TIER - snap.sampleCount);
        setText(
          need > 0
            ? `Adaptive: ~${snap.rollingMean}% recent accuracy (need ${need} more completed to unlock a tier label).`
            : `Adaptive: ~${snap.rollingMean}% recent accuracy.`,
        );
        return;
      }
      setText("Adaptive: complete a few exercises to unlock tier-based generation hints.");
    })();
  }, [exerciseType]);

  if (!text) return null;
  return <p className="text-muted-foreground text-xs">{text}</p>;
}
