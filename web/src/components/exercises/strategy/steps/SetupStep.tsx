"use client";

import { ExerciseStepCard } from "@/components/shared/ExerciseStepCard";
import { GenerateButton } from "@/components/exercises/flow/SetupParts";
import { LevelPicker } from "@/components/exercises/LevelPicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  STRATEGY_AREAS,
  STRATEGY_LEVELS,
} from "@/lib/exercise/strategy-levels";
import { GEO_GAME_CASES } from "@/lib/geo/game-cases";
import type { StrategyFlowState } from "@/components/exercises/strategy/useStrategyFlow";

export function SetupStep({ s }: { s: StrategyFlowState }) {
  const {
    area,
    setArea,
    geoCaseId,
    setGeoCaseId,
    level,
    loading,
    pickedCase,
    setupLevel,
    chooseLevel,
    generate,
  } = s;

  return (
    <>
      <ExerciseStepCard data-testid="strategy-setup">
        <LevelPicker
          value={level}
          onChange={chooseLevel}
          descriptions={{
            guided: STRATEGY_LEVELS.guided.description,
            standard: STRATEGY_LEVELS.standard.description,
            expert: STRATEGY_LEVELS.expert.description,
          }}
          note={`Takes ${setupLevel.minutes}.`}
        />
        <div className="grid gap-2">
          <Label>Topic</Label>
          <div className="flex flex-wrap gap-2" data-testid="strategy-areas">
            {STRATEGY_AREAS.map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={!pickedCase && area === a}
                onClick={() => {
                  setArea(a);
                  setGeoCaseId(null);
                }}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-body",
                  !pickedCase && area === a
                    ? "border-foreground bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted",
                )}
              >
                {a}
              </button>
            ))}
          </div>
          <Input
            aria-label="Other topic"
            placeholder="Or type another topic"
            value={
              (STRATEGY_AREAS as readonly string[]).includes(area) ? "" : area
            }
            onChange={(e) => {
              setArea(e.target.value);
              setGeoCaseId(null);
            }}
          />
        </div>
        <div className="grid gap-2" data-testid="geo-cases">
          <Label>Or start from a real case (geopolitics)</Label>
          <p className="text-muted-foreground text-meta">
            You play a made-up story with the same game. At the end you see what
            really happened, with sources.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {GEO_GAME_CASES.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={geoCaseId === c.id}
                onClick={() => setGeoCaseId(geoCaseId === c.id ? null : c.id)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-left text-body",
                  geoCaseId === c.id
                    ? "border-foreground bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted",
                )}
                data-testid={`geo-case-${c.id}`}
              >
                <span className="block font-medium">{c.title}</span>
                <span
                  className={cn(
                    "block text-meta",
                    geoCaseId === c.id
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground",
                  )}
                >
                  {c.when}
                </span>
              </button>
            ))}
          </div>
          {pickedCase ? (
            <div
              className="space-y-1 border-l-2 border-border pl-4 text-body"
              data-testid="geo-case-summary"
            >
              <p className="leading-relaxed">{pickedCase.summary}</p>
              <p className="text-muted-foreground text-meta">
                Real cases use 2 choices for each side at every level.
              </p>
            </div>
          ) : null}
        </div>
        <div>
          <GenerateButton loading={loading} onClick={() => void generate()} />
        </div>
      </ExerciseStepCard>
    </>
  );
}
