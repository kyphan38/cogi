"use client";

import { ExerciseStepCard } from "@/components/shared/ExerciseStepCard";
import { GenerateButton } from "@/components/exercises/flow/SetupParts";
import { LevelPicker } from "@/components/exercises/LevelPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { TRICKY_ASKERS, TRICKY_LEVELS } from "@/lib/exercise/tricky-levels";
import type { TrickyFlowState } from "@/components/exercises/tricky/useTrickyFlow";

export function SetupStep({ s }: { s: TrickyFlowState }) {
  const { asker, setAsker, context, setContext, source, setSource, ownSituation, setOwnSituation, level, loading, setupLevel, chooseLevel, generate } = s;

  return (
    <ExerciseStepCard data-testid="tricky-setup">
      <LevelPicker
        value={level}
        onChange={chooseLevel}
        descriptions={{
          guided: TRICKY_LEVELS.guided.description,
          standard: TRICKY_LEVELS.standard.description,
          expert: TRICKY_LEVELS.expert.description,
        }}
        note={`Takes ${setupLevel.minutes}.`}
      />
      <div className="grid gap-2">
        <Label>Who asks</Label>
        <div className="flex flex-wrap gap-2" data-testid="tricky-askers">
          {TRICKY_ASKERS.map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={asker === a}
              onClick={() => setAsker(a)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-body",
                asker === a ? "border-foreground bg-primary text-primary-foreground" : "border-border hover:bg-muted",
              )}
            >
              {a}
            </button>
          ))}
        </div>
        <Input
          aria-label="Someone else"
          placeholder="Or type who asks"
          value={(TRICKY_ASKERS as readonly string[]).includes(asker) ? "" : asker}
          onChange={(e) => setAsker(e.target.value)}
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
          <Label>Question</Label>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={source === "generated" ? "default" : "outline"} onClick={() => setSource("generated")}>
              A new question
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
                placeholder="Who asked, what they asked, and who was listening."
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
