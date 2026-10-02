"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface PracticeFinishCardProps {
  takeaway: string;
  onTakeawayChange: (value: string) => void;
  onFinish: () => void | Promise<void>;
  saving: boolean;
  finished: boolean;
}

/**
 * End of the 3-step practice loop, under the AI feedback: one optional takeaway and
 * Finish. Replaces the old Journal, Action and Done steps.
 */
export function PracticeFinishCard({
  takeaway,
  onTakeawayChange,
  onFinish,
  saving,
  finished,
}: PracticeFinishCardProps) {
  if (finished) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saved</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {takeaway.trim() ? (
            <p className="text-sm">
              <span className="text-muted-foreground">Takeaway: </span>
              {takeaway.trim()}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Link href="/reasoning" className={cn(buttonVariants(), "inline-flex items-center")}>
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
        <Label htmlFor="practice-takeaway" className="text-sm font-medium">
          What will you take away? <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="practice-takeaway"
          value={takeaway}
          onChange={(e) => onTakeawayChange(e.target.value)}
          placeholder="One line is enough."
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
