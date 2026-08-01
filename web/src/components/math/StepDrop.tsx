"use client";

import type { Scenario } from "@/lib/types/math-scenario";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface StepDropProps {
  scenario: Scenario;
  onProceed: () => void;
}

export function StepDrop({ scenario, onProceed }: StepDropProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4">
          <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
            <span className="bg-foreground/60 h-1.5 w-1.5 rounded-full" />
            <span>Step 1 — Real-world dilemma</span>
          </div>
          <h2 className="text-xl font-semibold">{scenario.title}</h2>
          <p className="text-sm leading-relaxed whitespace-pre-line">{scenario.situation}</p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onProceed} size="lg">
          Commit my prediction →
        </Button>
      </div>
    </div>
  );
}
