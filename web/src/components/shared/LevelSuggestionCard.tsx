"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LEVEL_LABELS, type LevelSuggestion } from "@/lib/exercise/levels";

/** Offer a level change after an exercise. The user decides; nothing changes on its own. */
export function LevelSuggestionCard({
  suggestion,
  onAccept,
  onDismiss,
}: {
  suggestion: NonNullable<LevelSuggestion>;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const to = LEVEL_LABELS[suggestion.to];
  return (
    <Card data-testid="level-suggestion">
      <CardContent className="space-y-3 pt-6 text-sm">
        <p>
          {suggestion.direction === "up"
            ? `Your last three exercises went well. Ready to try ${to}?`
            : `The last two exercises were hard. ${to} gives more help - want to switch for a while?`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onAccept}>
            Switch to {to}
          </Button>
          <Button type="button" variant="secondary" onClick={onDismiss}>
            Not now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
