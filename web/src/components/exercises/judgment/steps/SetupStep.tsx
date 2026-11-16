"use client";

import { ExerciseStepCard } from "@/components/shared/ExerciseStepCard";
import { GenerateButton } from "@/components/exercises/flow/SetupParts";
import { LevelPicker } from "@/components/exercises/LevelPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { JUDGMENT_LEVELS, LIFE_AREAS } from "@/lib/exercise/judgment-levels";
import type { JudgmentFlowState } from "@/components/exercises/judgment/useJudgmentFlow";

export function SetupStep({ s }: { s: JudgmentFlowState }) {
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
      <ExerciseStepCard data-testid="judgment-setup">
        <LevelPicker
          value={level}
          onChange={chooseLevel}
          descriptions={{
            guided: JUDGMENT_LEVELS.guided.description,
            standard: JUDGMENT_LEVELS.standard.description,
            expert: JUDGMENT_LEVELS.expert.description,
          }}
          note={`Takes ${setupLevel.minutes}.`}
        />
        <div className="grid gap-2">
          <Label>Area of life</Label>
          <div className="flex flex-wrap gap-2" data-testid="life-areas">
            {LIFE_AREAS.map((a) => (
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
            value={(LIFE_AREAS as readonly string[]).includes(area) ? "" : area}
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
                  placeholder="What happened, who was involved, and what you have to decide."
                />
                <p className="text-muted-foreground text-meta">
                  Private. No real names.
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
