"use client";

import { LevelPicker } from "@/components/exercises/LevelPicker";
import {
  DomainField,
  SetupActions,
  SourceSelect,
  SuggestedTopics,
} from "@/components/exercises/flow/SetupParts";
import { EVALUATIVE_LEVELS } from "@/lib/exercise/evaluative-levels";
import { ENTRY_MODE_OPTIONS } from "@/components/shared/entry-mode";
import { WordChoice } from "@/components/shared/WordChoice";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type EvaluativeTaskType } from "@/lib/ai/validators/evaluative";
import {
  SOURCE_OPTIONS,
  FlowStep,
} from "@/components/exercises/evaluative/shared";
import type { EvaluativeFlowState } from "@/components/exercises/evaluative/useEvaluativeFlow";

export function SetupStep({ s }: { s: EvaluativeFlowState }) {
  const {
    domain,
    setDomain,
    setupMode,
    setSetupMode,
    evaluativeTaskType,
    setEvaluativeTaskType,
    entryMode,
    setEntryMode,
    customScenarioText,
    setCustomScenarioText,
    domainSuggestions,
    setStep,
    level,
    exercise,
    loading,
    chooseLevel,
    startGenerate,
  } = s;

  return (
    <>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <WordChoice
            label="Topic"
            value={entryMode}
            onChange={setEntryMode}
            options={ENTRY_MODE_OPTIONS}
          />

          <LevelPicker
            value={level}
            onChange={chooseLevel}
            descriptions={{
              guided: EVALUATIVE_LEVELS.guided.description,
              standard: EVALUATIVE_LEVELS.standard.description,
              expert: EVALUATIVE_LEVELS.expert.description,
            }}
            note="Geopolitics topics: Guided compares two stakeholders' interests on a 2x2 board."
          />

          {EVALUATIVE_LEVELS[level].taskTypes.length > 1 ? (
            <div className="grid gap-2">
              <Label>Task type</Label>
              <Select
                value={evaluativeTaskType}
                onValueChange={(v) =>
                  setEvaluativeTaskType((v as EvaluativeTaskType) ?? "auto")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Surprise me</SelectItem>
                  <SelectItem value="dealbreaker">Dealbreaker check</SelectItem>
                  <SelectItem value="uncertainty">
                    Uncertainty & expected value
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <SuggestedTopics
            area="evaluative"
            hidden={entryMode !== "suggested"}
            onPick={(title) => {
              setSetupMode("generated");
              setDomain(title);
              void startGenerate(title, "generated");
            }}
          />
          <div className={cn("space-y-4", entryMode !== "manual" && "hidden")}>
            <DomainField
              value={domain}
              onChange={setDomain}
              suggestions={domainSuggestions}
              optional={setupMode === "custom_scenario"}
            />
            <SourceSelect
              value={setupMode}
              onChange={setSetupMode}
              options={SOURCE_OPTIONS}
            />
            {setupMode === "custom_scenario" ? (
              <div className="grid gap-2">
                <Label htmlFor="ev-custom-scenario">Your scenario</Label>
                <Textarea
                  id="ev-custom-scenario"
                  rows={5}
                  value={customScenarioText}
                  onChange={(e) => setCustomScenarioText(e.target.value)}
                  placeholder="Describe the situation, trade-offs, and what you want to practice..."
                  className="min-h-[5rem]"
                />
              </div>
            ) : null}
            <SetupActions
              loading={loading}
              onGenerate={() => void startGenerate()}
              onContinue={
                exercise
                  ? () => setStep((exercise.currentStep ?? 1) as FlowStep)
                  : undefined
              }
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
