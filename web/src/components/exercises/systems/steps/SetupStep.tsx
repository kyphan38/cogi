"use client";

import { LevelPicker } from "@/components/exercises/LevelPicker";
import {
  DomainField,
  SetupActions,
  SourceSelect,
  SuggestedTopics,
} from "@/components/exercises/flow/SetupParts";
import { SYSTEMS_LEVELS } from "@/lib/exercise/systems-levels";
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
import type { SystemsTaskType } from "@/lib/types/exercise";
import {
  SOURCE_OPTIONS,
  FlowStep,
} from "@/components/exercises/systems/shared";
import type { SystemsFlowState } from "@/components/exercises/systems/useSystemsFlow";

export function SetupStep({ s }: { s: SystemsFlowState }) {
  const {
    domain,
    setDomain,
    setupMode,
    setSetupMode,
    entryMode,
    setEntryMode,
    customScenarioText,
    setCustomScenarioText,
    domainSuggestions,
    systemsTaskType,
    setSystemsTaskType,
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
              guided: SYSTEMS_LEVELS.guided.description,
              standard: SYSTEMS_LEVELS.standard.description,
              expert: SYSTEMS_LEVELS.expert.description,
            }}
            note="Geopolitics topics: Guided maps one side's view; Standard and Expert add the other side's view, which you predict first."
          />

          {SYSTEMS_LEVELS[level].taskTypes.length > 1 ? (
            <div className="grid gap-2">
              <Label>Task type</Label>
              <Select
                value={systemsTaskType}
                onValueChange={(v) =>
                  setSystemsTaskType((v as SystemsTaskType) ?? "auto")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="geopolitics">
                    Geopolitical (dual perspective)
                  </SelectItem>
                  <SelectItem value="resilience">Resilience audit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <SuggestedTopics
            area="systems"
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
                <Label htmlFor="sys-custom-scenario">Your scenario</Label>
                <Textarea
                  id="sys-custom-scenario"
                  rows={5}
                  value={customScenarioText}
                  onChange={(e) => setCustomScenarioText(e.target.value)}
                  placeholder="Describe stakeholders, components, and tensions for the dependency map..."
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
