"use client";

import { Button } from "@/components/ui/button";
import { ENTRY_MODE_OPTIONS } from "@/components/shared/entry-mode";
import { WordChoice } from "@/components/shared/WordChoice";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sanitizeUserPasteOrClipboard } from "@/lib/text/sanitizeRealDataBrowser";
import { isGeopoliticsAnalyticalDomain } from "@/lib/exercise/geopolitics-domains";
import { GeopoliticsRealDataHints } from "@/components/exercises/GeopoliticsRealDataHints";
import { ExerciseStepCard } from "@/components/shared/ExerciseStepCard";
import { LevelPicker } from "@/components/exercises/LevelPicker";
import {
  DomainField,
  SetupActions,
  SourceSelect,
  SuggestedTopics,
} from "@/components/exercises/flow/SetupParts";
import {
  ANALYTICAL_LEVELS,
  GEO_ANALYTICAL_LEVELS,
} from "@/lib/exercise/analytical-levels";
import { FlowStep } from "@/components/exercises/analytical/shared";
import type { AnalyticalFlowState } from "@/components/exercises/analytical/useAnalyticalFlow";

export function SetupStep({ s }: { s: AnalyticalFlowState }) {
  const {
    domain,
    setDomain,
    domainSuggestions,
    mode,
    setMode,
    entryMode,
    setEntryMode,
    customScenarioText,
    setCustomScenarioText,
    realText,
    setRealText,
    realWordCount,
    setRealWordCount,
    pasteNotice,
    setPasteNotice,
    showToast,
    setStep,
    level,
    exercise,
    loading,
    realTextareaRef,
    realSanitizedPreview,
    chooseLevel,
    startGenerate,
  } = s;

  return (
    <>
      <ExerciseStepCard data-testid="analytical-exercise-card">
        <LevelPicker
          value={level}
          onChange={chooseLevel}
          descriptions={{
            guided: ANALYTICAL_LEVELS.guided.description,
            standard: ANALYTICAL_LEVELS.standard.description,
            expert: ANALYTICAL_LEVELS.expert.description,
          }}
          note={
            isGeopoliticsAnalyticalDomain(domain)
              ? `Geopolitics topic: ${GEO_ANALYTICAL_LEVELS[level].description}`
              : undefined
          }
        />
        <WordChoice
          label="Topic"
          value={entryMode}
          onChange={setEntryMode}
          options={ENTRY_MODE_OPTIONS}
        />

        <SuggestedTopics
          area="analytical"
          hidden={entryMode !== "suggested"}
          onPick={(title) => {
            setMode("generated");
            setDomain(title);
            void startGenerate(title, "generated");
          }}
        />
        <div className={cn("space-y-4", entryMode !== "manual" && "hidden")}>
          <DomainField
            value={domain}
            onChange={setDomain}
            suggestions={domainSuggestions}
            optional={mode === "custom_scenario"}
          />
          <SourceSelect
            value={mode}
            onChange={setMode}
            options={
              [
                { value: "generated", label: "AI-generated passage" },
                { value: "real_data", label: "Use my own text" },
                { value: "custom_scenario", label: "My scenario" },
              ] as const
            }
          />
          <GeopoliticsRealDataHints domain={domain} mode={mode} />
          {mode === "custom_scenario" ? (
            <div className="grid gap-2">
              <Label htmlFor="custom-scenario">
                Describe your situation - AI will design the passage around it
              </Label>
              <Textarea
                id="custom-scenario"
                rows={6}
                value={customScenarioText}
                onChange={(e) => setCustomScenarioText(e.target.value)}
                placeholder="Paste context, stakeholders, and the tension you want to practice..."
                className="min-h-[5rem]"
              />
              <p className="text-muted-foreground text-meta">
                Optional domain above steers tone/register; the scenario drives
                content.
              </p>
            </div>
          ) : null}
          {mode === "real_data" ? (
            <div className="grid gap-2">
              <Label htmlFor="real-text">
                Paste your own content (up to 2,000 words after sanitization)
              </Label>
              <Textarea
                ref={realTextareaRef}
                id="real-text"
                rows={6}
                value={realText}
                onChange={(e) => {
                  setRealText(e.target.value);
                  setPasteNotice(null);
                }}
                onPaste={(e) => {
                  const plain = e.clipboardData.getData("text/plain");
                  if (!plain) return;
                  e.preventDefault();
                  const el = realTextareaRef.current;
                  const start = el?.selectionStart ?? realText.length;
                  const end = el?.selectionEnd ?? realText.length;
                  const r = sanitizeUserPasteOrClipboard(plain);
                  if (r.htmlRejected) {
                    setPasteNotice(
                      "Blocked unsafe HTML from clipboard. Use plain text.",
                    );
                    return;
                  }
                  const next = `${realText.slice(0, start)}${r.text}${realText.slice(end)}`;
                  setRealText(next);
                  if (r.hadBlockedHtml) {
                    setPasteNotice(
                      "Some HTML tags were removed from the paste.",
                    );
                  } else {
                    setPasteNotice(null);
                  }
                  requestAnimationFrame(() => {
                    if (!el) return;
                    const pos = start + r.text.length;
                    el.selectionStart = pos;
                    el.selectionEnd = pos;
                  });
                }}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={loading}
                  onClick={() => {
                    void (async () => {
                      try {
                        const t = await navigator.clipboard.readText();
                        const r = sanitizeUserPasteOrClipboard(t);
                        if (r.htmlRejected) {
                          setPasteNotice("Blocked unsafe HTML from clipboard.");
                          return;
                        }
                        setRealText(r.text);
                        setRealWordCount(r.wordCount);
                        setPasteNotice(null);
                        showToast(
                          r.hadBlockedHtml
                            ? "Some HTML was flattened to plain text."
                            : "Imported from clipboard.",
                          r.hadBlockedHtml ? "info" : "success",
                        );
                      } catch {
                        showToast(
                          "Could not read clipboard. Grant permission or paste manually.",
                          "error",
                        );
                      }
                    })();
                  }}
                >
                  Import from clipboard
                </Button>
              </div>
              {pasteNotice ? (
                <p className="text-muted-foreground text-meta">{pasteNotice}</p>
              ) : null}
              {realText.trim() ? (
                <p className="text-muted-foreground text-meta">
                  Words after sanitization (same rules as server):{" "}
                  {realSanitizedPreview.wordCount}
                  {realSanitizedPreview.wordCount > 2000 ? (
                    <span className="text-destructive font-medium">
                      {" "}
                      - over 2,000; shorten before generating.
                    </span>
                  ) : null}
                  {realWordCount
                    ? ` · Last generate used: ${realWordCount} words`
                    : null}
                </p>
              ) : (
                <p className="text-muted-foreground text-meta">
                  Tip: paste an email, plan, or article you want to analyze.
                </p>
              )}
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
      </ExerciseStepCard>
    </>
  );
}
