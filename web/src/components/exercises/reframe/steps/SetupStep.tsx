"use client";

import { ExerciseStepCard } from "@/components/shared/ExerciseStepCard";
import { GenerateButton } from "@/components/exercises/flow/SetupParts";
import { LevelPicker } from "@/components/exercises/LevelPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { REFRAME_AREAS, REFRAME_LEVELS } from "@/lib/exercise/reframe-levels";
import type { ReframeFlowState } from "@/components/exercises/reframe/useReframeFlow";

export function SetupStep({ s }: { s: ReframeFlowState }) {
  const {
    area,
    setArea,
    context,
    setContext,
    source,
    setSource,
    ownSituation,
    setOwnSituation,
    level,
    loading,
    setupLevel,
    chooseLevel,
    generate,
  } = s;

  return (
    <>
      <ExerciseStepCard data-testid="reframe-setup">
        <LevelPicker
          value={level}
          onChange={chooseLevel}
          descriptions={{
            guided: REFRAME_LEVELS.guided.description,
            standard: REFRAME_LEVELS.standard.description,
            expert: REFRAME_LEVELS.expert.description,
          }}
          note={`Takes ${setupLevel.minutes}. This is thinking practice, not therapy.`}
        />
        <div className="grid gap-2">
          <Label>Area of life</Label>
          <div className="flex flex-wrap gap-2" data-testid="reframe-areas">
            {REFRAME_AREAS.map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={area === a}
                onClick={() => setArea(a)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-body",
                  area === a
                    ? "border-foreground bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted",
                )}
              >
                {a}
              </button>
            ))}
          </div>
          <Input
            aria-label="Other area"
            placeholder="Or type another area"
            value={
              (REFRAME_AREAS as readonly string[]).includes(area) ? "" : area
            }
            onChange={(e) => setArea(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label>Setting</Label>
          <div className="flex gap-2">
            {(["vietnam", "general"] as const).map((c) => (
              <Button
                key={c}
                type="button"
                size="sm"
                variant={context === c ? "default" : "outline"}
                aria-pressed={context === c}
                onClick={() => setContext(c)}
              >
                {c === "vietnam" ? "Vietnam" : "General"}
              </Button>
            ))}
          </div>
        </div>
        {setupLevel.ownSituation ? (
          <div className="grid gap-2">
            <Label>Situation</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={source === "generated" ? "default" : "outline"}
                onClick={() => setSource("generated")}
              >
                A new situation
              </Button>
              <Button
                type="button"
                size="sm"
                variant={source === "custom_scenario" ? "default" : "outline"}
                onClick={() => setSource("custom_scenario")}
              >
                My situation
              </Button>
            </div>
            {source === "custom_scenario" ? (
              <>
                <Textarea
                  aria-label="My situation"
                  rows={4}
                  value={ownSituation}
                  onChange={(e) => setOwnSituation(e.target.value)}
                  placeholder="What happened, and what went through your mind right after."
                />
                <p className="text-muted-foreground text-meta">
                  Private. No real names. In crisis? Talk to someone you trust.
                </p>
              </>
            ) : null}
          </div>
        ) : null}
        <div>
          <GenerateButton loading={loading} onClick={() => void generate()} />
        </div>
      </ExerciseStepCard>
    </>
  );
}
