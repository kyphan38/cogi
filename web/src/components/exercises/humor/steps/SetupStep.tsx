"use client";

import { ExerciseStepCard } from "@/components/shared/ExerciseStepCard";
import { GenerateButton } from "@/components/exercises/flow/SetupParts";
import { LevelPicker } from "@/components/exercises/LevelPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { HUMOR_PLACES, HUMOR_LEVELS } from "@/lib/exercise/humor-levels";
import type { HumorFlowState } from "@/components/exercises/humor/useHumorFlow";

export function SetupStep({ s }: { s: HumorFlowState }) {
  const { place, setPlace, context, setContext, source, setSource, ownSituation, setOwnSituation, level, loading, setupLevel, chooseLevel, generate } = s;

  return (
    <ExerciseStepCard data-testid="humor-setup">
      <LevelPicker
        value={level}
        onChange={chooseLevel}
        descriptions={{
          guided: HUMOR_LEVELS.guided.description,
          standard: HUMOR_LEVELS.standard.description,
          expert: HUMOR_LEVELS.expert.description,
        }}
        note={`Takes ${setupLevel.minutes}.`}
      />
      <div className="grid gap-2">
        <Label>Where</Label>
        <div className="flex flex-wrap gap-2" data-testid="humor-places">
          {HUMOR_PLACES.map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={place === a}
              onClick={() => setPlace(a)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-body",
                place === a ? "border-foreground bg-primary text-primary-foreground" : "border-border hover:bg-muted",
              )}
            >
              {a}
            </button>
          ))}
        </div>
        <Input
          aria-label="Somewhere else"
          placeholder="Or type where"
          value={(HUMOR_PLACES as readonly string[]).includes(place) ? "" : place}
          onChange={(e) => setPlace(e.target.value)}
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
          <Label>Moment</Label>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={source === "generated" ? "default" : "outline"} onClick={() => setSource("generated")}>
              New moments
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
                placeholder="Where you were, what happened, and what was said."
              />
              <p className="text-muted-foreground text-meta">Private. No real names.</p>
            </>
          ) : null}
        </div>
      ) : null}
      <div>
        <GenerateButton loading={loading} onClick={() => void generate()} />
      </div>
    </ExerciseStepCard>
  );
}
