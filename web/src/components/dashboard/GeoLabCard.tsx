"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { localDay, reviewCounts } from "@/lib/geo/quiz";
import { quizAttempts, quizDoneOn } from "@/lib/geo/rows";
import type { Exercise } from "@/lib/types/exercise";

function quizStatus(completed: Exercise[]): string {
  const today = localDay(new Date());
  if (quizDoneOn(completed, today)) return "Today's map quiz is done.";
  const { due } = reviewCounts(quizAttempts(completed), today);
  return due > 0
    ? `Today's map quiz is ready, with ${due} ${due === 1 ? "place" : "places"} to review.`
    : "Today's map quiz is ready.";
}

/** Practice page: a door to the Geo Lab with today's map quiz status (PLAN-geopolitics.md G2). */
export function GeoLabCard({ completed }: { completed: Exercise[] | null }) {
  return (
    <Card data-testid="geo-lab-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Geo Lab</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="min-w-0 flex-1">
          <p className="text-foreground">Maps, sea routes and a 2-minute daily map quiz.</p>
          {completed ? (
            <p className="text-muted-foreground text-xs" data-testid="geo-lab-card-status">
              {quizStatus(completed)}
            </p>
          ) : null}
        </div>
        <Link
          href="/geo"
          className={cn(buttonVariants({ size: "sm", variant: "outline" }), "inline-flex shrink-0 items-center gap-1")}
          data-testid="geo-lab-link"
        >
          Open <ChevronRight className="size-4" aria-hidden />
        </Link>
      </CardContent>
    </Card>
  );
}
