"use client";

import { useState } from "react";
import type { Scenario } from "@/lib/types/math-scenario";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface StepRevealProps {
  scenario: Scenario;
  isCorrect: boolean;
  onProceedToTeachBack: (userBoundaryGuess: string) => void;
}

export function StepReveal({ scenario, isCorrect, onProceedToTeachBack }: StepRevealProps) {
  const [boundaryGuess, setBoundaryGuess] = useState<string>("");
  const [showBoundaries, setShowBoundaries] = useState<boolean>(false);

  const handleRevealBoundaries = () => {
    setShowBoundaries(true);
  };

  return (
    <div className="space-y-6">
      {/* Ground Truth Reveal & Named Mental Model */}
      <Card>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Step 4 — Reveal &amp; name the tool
            </span>
            <Badge variant={isCorrect ? "positive" : "attention"}>
              {isCorrect ? "Prediction aligned ✓" : "Intuition trap identified"}
            </Badge>
          </div>

          {/* Canonical Answer & Named Tool */}
          <div className="border-border bg-muted/30 rounded-lg border p-4">
            <div className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
              Named mental model
            </div>
            <div className="mb-2 text-lg font-semibold">{scenario.toolName}</div>
            <div className="mb-2 text-sm font-medium">{scenario.canonicalAnswer}</div>
            <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
              {scenario.explanation}
            </p>
          </div>

          {/* Cross-Domain Transfers */}
          <div className="space-y-3">
            <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Cross-domain transfers (same structure, different domain)
            </h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {scenario.transfers.map((t, idx) => (
                <div key={idx} className="border-border rounded-lg border p-3">
                  <div className="mb-1 text-xs font-semibold">{t.domain}</div>
                  <div className="text-muted-foreground text-xs leading-normal">{t.mapping}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Field Note Real-Life Takeaway */}
          <div className="border-border bg-muted/30 rounded-lg border p-3 text-xs">
            <span className="font-semibold">Real-life takeaway:</span> {scenario.fieldNote}
          </div>

          {/* Active Boundary Beat: Predict Where It Breaks */}
          <div className="border-border space-y-4 border-t pt-5">
            <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Boundary breaking question
            </div>
            <p className="text-sm font-medium">
              Where does this analogy break? What assumption or condition would make this model
              fail?
            </p>

            {!showBoundaries ? (
              <div className="space-y-3">
                <Textarea
                  value={boundaryGuess}
                  onChange={(e) => setBoundaryGuess(e.target.value)}
                  rows={2}
                  placeholder="Predict when this model fails before seeing authored boundaries..."
                />
                <div className="flex justify-end">
                  <Button onClick={handleRevealBoundaries}>Reveal failure boundaries →</Button>
                </div>
              </div>
            ) : (
              <div className="border-border bg-muted/30 space-y-3 rounded-lg border p-4">
                <div className="text-xs font-semibold">Authored failure boundaries</div>
                {scenario.boundaries.map((b, idx) => (
                  <div key={idx} className="space-y-1 text-xs">
                    <div className="font-medium">• Condition: {b.condition}</div>
                    <div className="text-muted-foreground pl-3">Why it breaks: {b.whyItBreaks}</div>
                  </div>
                ))}

                {boundaryGuess.trim() && (
                  <div className="border-border text-muted-foreground mt-3 border-t pt-3 text-xs">
                    <span className="text-foreground font-semibold">Your boundary prediction:</span>{" "}
                    &ldquo;{boundaryGuess}&rdquo;
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          disabled={!showBoundaries}
          onClick={() => onProceedToTeachBack(boundaryGuess)}
          size="lg"
        >
          Proceed to teach-back (Feynman step) →
        </Button>
      </div>
    </div>
  );
}
