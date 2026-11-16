"use client";

import { ConfidenceSlider } from "@/components/shared/ConfidenceSlider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { putExercise } from "@/lib/db/exercises";
import { PerspectiveLoadingCard } from "@/components/shared/PerspectiveLoadingCard";
import { GeoGuessStep } from "@/components/exercises/GeoGuessStep";
import type { AnalyticalFlowState } from "@/components/exercises/analytical/useAnalyticalFlow";

export function GeoStep({
  s,
  exercise,
}: {
  s: AnalyticalFlowState;
  exercise: NonNullable<AnalyticalFlowState["exercise"]>;
}) {
  const {
    highlights,
    userPerspectiveGuess,
    setUserPerspectiveGuess,
    missingActorGuess1,
    setMissingActorGuess1,
    missingActorGuess2,
    setMissingActorGuess2,
    setStep,
    loading,
    confidence,
    setConfidence,
    submitMetaGuess,
    geoCfg,
    saveRow,
  } = s;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Perspective & missing actors</CardTitle>
          <CardDescription>
            Before seeing the debrief: whose viewpoint is this written from?
            Which stakeholders or perspectives are absent?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {geoCfg && exercise.perspectiveOptions?.length ? (
            <GeoGuessStep ex={exercise} cfg={geoCfg} onChange={saveRow} />
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="perspective-guess">
                  Whose perspective is this written from?
                </Label>
                <Textarea
                  id="perspective-guess"
                  rows={3}
                  placeholder="e.g. US-aligned security think tank, ASEAN small-state pragmatist…"
                  value={userPerspectiveGuess}
                  onChange={(e) => setUserPerspectiveGuess(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="missing-actor-1">
                  Missing actor or perspective (at least one)
                </Label>
                <Input
                  id="missing-actor-1"
                  value={missingActorGuess1}
                  onChange={(e) => setMissingActorGuess1(e.target.value)}
                  placeholder="e.g. Vietnam / coastal ASEAN states"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="missing-actor-2">
                  Second missing actor (optional)
                </Label>
                <Input
                  id="missing-actor-2"
                  value={missingActorGuess2}
                  onChange={(e) => setMissingActorGuess2(e.target.value)}
                  placeholder="e.g. fishing communities / informal economy"
                />
              </div>
            </>
          )}
          <ConfidenceSlider value={confidence} onChange={setConfidence} />
          {loading ? <PerspectiveLoadingCard /> : null}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={loading}
              onClick={() => {
                void putExercise({
                  ...exercise,
                  userHighlights: highlights,
                  currentStep: 1,
                });
                setStep(1);
              }}
            >
              Back
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={() => void submitMetaGuess()}
            >
              {loading ? "Loading…" : "Get AI feedback"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
