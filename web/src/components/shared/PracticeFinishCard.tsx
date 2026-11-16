"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface PracticeFinishCardProps {
  takeaway: string;
  onTakeawayChange: (value: string) => void;
  /** Where the user will use this in the next week. Today asks about it 7 days later. */
  usePlan: string;
  onUsePlanChange: (value: string) => void;
  onFinish: () => void | Promise<void>;
  saving: boolean;
  finished: boolean;
  /** Overrides the default hint, e.g. to point at what the user missed. */
  takeawayPlaceholder?: string;
}

/**
 * End of the 3-step practice loop, under the AI feedback: one optional takeaway, one
 * optional "where will you use this" plan, and Finish.
 */
export function PracticeFinishCard({
  takeaway,
  onTakeawayChange,
  usePlan,
  onUsePlanChange,
  onFinish,
  saving,
  finished,
  takeawayPlaceholder,
}: PracticeFinishCardProps) {
  // "Saved" fades in only when Finish was pressed in this visit. A finished
  // exercise that opens saved shows it at once.
  // A redo opens with `?resumeId=<id>&redo=1` (lib/db/redo.ts): link to the two tries in History.
  const sp = useSearchParams();
  const redoId = sp.get("redo") === "1" ? sp.get("resumeId") : null;
  const [prevFinished, setPrevFinished] = useState(finished);
  const [justSaved, setJustSaved] = useState(false);
  if (finished !== prevFinished) {
    setPrevFinished(finished);
    setJustSaved(finished);
  }

  if (finished) {
    return (
      <Card className={justSaved ? "fade-in" : undefined}>
        <CardHeader>
          <CardTitle className="text-body">Saved</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {takeaway.trim() ? (
            <p className="text-body">
              <span className="text-muted-foreground">Takeaway: </span>
              {takeaway.trim()}
            </p>
          ) : null}
          {usePlan.trim() ? (
            <p className="text-body" data-testid="use-plan-saved">
              <span className="text-muted-foreground">This week: </span>
              {usePlan.trim()}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {redoId ? (
              <Link
                href={`/exercise/history?openExercise=${encodeURIComponent(redoId)}`}
                className={cn(buttonVariants(), "inline-flex items-center")}
                data-testid="redo-compare-link"
              >
                Compare with first try
              </Link>
            ) : null}
            <Link href="/reasoning" className={cn(buttonVariants(redoId ? { variant: "secondary" } : undefined), "inline-flex items-center")}>
              New exercise
            </Link>
            <Link href="/" className={cn(buttonVariants({ variant: "secondary" }), "inline-flex items-center")}>
              Practice
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <Label htmlFor="practice-takeaway" className="text-body font-medium">
          What will you take away? <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="practice-takeaway"
          value={takeaway}
          onChange={(e) => onTakeawayChange(e.target.value)}
          placeholder={takeawayPlaceholder ?? "One line is enough."}
          rows={2}
          disabled={saving}
        />
        <Label htmlFor="practice-use-plan" className="text-body font-medium">
          Where will you use this this week? <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="practice-use-plan"
          value={usePlan}
          onChange={(e) => onUsePlanChange(e.target.value)}
          placeholder="A meeting, a decision, a talk. Today asks again in 7 days."
          rows={2}
          disabled={saving}
        />
        <Button type="button" onClick={() => void onFinish()} disabled={saving}>
          {saving ? "Saving…" : "Finish"}
        </Button>
      </CardContent>
    </Card>
  );
}
