"use client";

import { useEffect, useState } from "react";

import { Section, WORD_LINK } from "@/components/shared/Section";
import { LevelSuggestionCard } from "@/components/shared/LevelSuggestionCard";
import { RecapBody } from "@/components/tracks/RecapBody";
import { useToast } from "@/components/ui/toast";
import { dismissLevelSuggestion, getPracticeLevel, setPracticeLevel } from "@/lib/db/settings";
import { TYPE_LABEL } from "@/lib/exercise/exercise-mode-cards";
import { levelSuggestionFor } from "@/lib/exercise/level-suggestion";
import { LEVEL_LABELS, type LevelledExerciseType, type LevelSuggestion } from "@/lib/exercise/levels";
import { recapExerciseTypes, type TrackRecap as Recap } from "@/lib/tracks/adaptive";
import type { Exercise } from "@/lib/types/exercise";

const LEVELLED: readonly string[] = ["analytical", "systems", "evaluative", "judgment", "strategy", "reframe", "calibration", "tricky", "humor"];

/** The first level change the usual rules suggest for a type done in the track. */
async function firstSuggestion(types: string[]): Promise<{ type: LevelledExerciseType; suggestion: NonNullable<LevelSuggestion> } | null> {
  for (const t of types) {
    if (!LEVELLED.includes(t)) continue;
    const type = t as LevelledExerciseType;
    const suggestion = await levelSuggestionFor(type, await getPracticeLevel(type));
    if (suggestion) return { type, suggestion };
  }
  return null;
}

/**
 * Today, once after a track closes: its numbers, and at most one level change to
 * accept in one tap (the app only suggests, PLAN-adaptive-tracks.md A4).
 */
export function TrackRecap({
  recap,
  previous,
  completed,
  onSeen,
}: {
  recap: Recap;
  previous?: Recap;
  completed: Exercise[];
  onSeen: () => void;
}) {
  const { show: showToast } = useToast();
  const [level, setLevel] = useState<Awaited<ReturnType<typeof firstSuggestion>>>(null);

  useEffect(() => {
    let cancelled = false;
    void firstSuggestion(recapExerciseTypes(recap.id, completed))
      .then((s) => {
        if (!cancelled) setLevel(s);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [recap.id, completed]);

  return (
    <Section
      title="Last track"
      data-testid="track-recap"
      action={
        <button type="button" className={WORD_LINK} onClick={onSeen} data-testid="track-recap-ok">
          ok
        </button>
      }
    >
      <div className="space-y-4">
        <RecapBody recap={recap} previous={previous} />
        {level ? (
          <LevelSuggestionCard
            suggestion={level.suggestion}
            typeLabel={TYPE_LABEL[level.type] ?? level.type}
            onAccept={() => {
              void setPracticeLevel(level.type, level.suggestion.to);
              showToast(`${TYPE_LABEL[level.type] ?? level.type} level set to ${LEVEL_LABELS[level.suggestion.to]}.`);
              setLevel(null);
            }}
            onDismiss={() => {
              void dismissLevelSuggestion(level.type);
              setLevel(null);
            }}
          />
        ) : null}
      </div>
    </Section>
  );
}
