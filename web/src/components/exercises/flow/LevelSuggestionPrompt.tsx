"use client";

import { LevelSuggestionCard } from "@/components/shared/LevelSuggestionCard";
import { useToast } from "@/components/ui/toast";
import { dismissLevelSuggestion } from "@/lib/db/settings";
import { LEVEL_LABELS, type LevelledExerciseType, type LevelSuggestion, type PracticeLevel } from "@/lib/exercise/levels";

/** After Finish: offer the next level. Accept sets it for the next exercise; dismiss is remembered. */
export function LevelSuggestionPrompt({
  type,
  suggestion,
  onChoose,
  onClose,
}: {
  type: LevelledExerciseType;
  suggestion: LevelSuggestion;
  onChoose: (level: PracticeLevel) => void;
  onClose: () => void;
}) {
  const { show: showToast } = useToast();
  if (!suggestion) return null;
  return (
    <LevelSuggestionCard
      suggestion={suggestion}
      onAccept={() => {
        onChoose(suggestion.to);
        showToast(`Level set to ${LEVEL_LABELS[suggestion.to]} for your next exercise.`);
        onClose();
      }}
      onDismiss={() => {
        void dismissLevelSuggestion(type);
        onClose();
      }}
    />
  );
}
