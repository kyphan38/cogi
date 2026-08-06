"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  getAppSettings,
  getUserContext,
  setAdaptiveDifficultyEnabled,
  setDelayedRecallEnabled,
  setGeopoliticsProgressionEpoch,
  setLanguageLevel,
  setManualDifficultyEnabled,
  setManualDifficultyTier,
  setUserContext,
} from "@/lib/db/settings";
import { DIFFICULTY_TIERS } from "@/lib/adaptive/difficulty-tier";
import {
  DEFAULT_LANGUAGE_LEVEL,
  LANGUAGE_LEVEL_DESCRIPTIONS,
  LANGUAGE_LEVELS,
} from "@/lib/adaptive/language-level";
import {
  exportAllJsonString,
  exportJournalMarkdown,
  importBackupJson,
} from "@/lib/db/backup";

export default function SettingsPage() {
  const [ctx, setCtx] = useState("");
  const [recallOn, setRecallOn] = useState(true);
  const [adaptiveOn, setAdaptiveOn] = useState(false);
  const [manualDifficultyOn, setManualDifficultyOn] = useState(false);
  const [difficultyTierIndex, setDifficultyTierIndex] = useState(0);
  const [languageLevelIndex, setLanguageLevelIndex] = useState(
    LANGUAGE_LEVELS.indexOf(DEFAULT_LANGUAGE_LEVEL),
  );
  const [geoEpoch, setGeoEpoch] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const [backupErr, setBackupErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [text, s] = await Promise.all([getUserContext(), getAppSettings()]);
      setCtx(text);
      setRecallOn(s.delayedRecallEnabled !== false);
      setAdaptiveOn(s.adaptiveDifficultyEnabled === true);
      setManualDifficultyOn(s.manualDifficultyEnabled === true);
      const tierIdx = s.manualDifficultyTier ? DIFFICULTY_TIERS.indexOf(s.manualDifficultyTier) : 0;
      setDifficultyTierIndex(tierIdx >= 0 ? tierIdx : 0);
      const levelIdx = LANGUAGE_LEVELS.indexOf(s.languageLevel ?? DEFAULT_LANGUAGE_LEVEL);
      setLanguageLevelIndex(levelIdx >= 0 ? levelIdx : LANGUAGE_LEVELS.indexOf(DEFAULT_LANGUAGE_LEVEL));
      setGeoEpoch(s.geopoliticsProgressionEpoch);
    })();
  }, []);

  const resetGeoProgression = async () => {
    if (
      !window.confirm(
        "Reset geopolitics learning progression? Completed geo exercises before now will no longer count toward phase progress on the dashboard.",
      )
    ) {
      return;
    }
    const epoch = new Date().toISOString();
    await setGeopoliticsProgressionEpoch(epoch);
    setGeoEpoch(epoch);
    setBackupMsg("Geopolitics progression reset. Dashboard will use exercises completed from now on.");
  };

  const save = async () => {
    await setUserContext(ctx);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleRecall = async (checked: boolean) => {
    setRecallOn(checked);
    await setDelayedRecallEnabled(checked);
  };

  const toggleAdaptive = async (checked: boolean) => {
    setAdaptiveOn(checked);
    await setAdaptiveDifficultyEnabled(checked);
  };

  const toggleManualDifficulty = async (checked: boolean) => {
    setManualDifficultyOn(checked);
    await setManualDifficultyEnabled(checked);
  };

  const onDifficultyTierChange = (index: number) => {
    setDifficultyTierIndex(index);
    void setManualDifficultyTier(DIFFICULTY_TIERS[index]);
  };

  const onLanguageLevelChange = (index: number) => {
    setLanguageLevelIndex(index);
    void setLanguageLevel(LANGUAGE_LEVELS[index]);
  };

  const downloadText = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = async () => {
    setBackupErr(null);
    setBackupMsg(null);
    try {
      const json = await exportAllJsonString();
      downloadText(
        `cogi-backup-${new Date().toISOString().slice(0, 10)}.json`,
        json,
        "application/json",
      );
      setBackupMsg("JSON backup downloaded.");
    } catch (e) {
      setBackupErr(e instanceof Error ? e.message : "Export failed");
    }
  };

  const exportMd = async () => {
    setBackupErr(null);
    setBackupMsg(null);
    try {
      const md = await exportJournalMarkdown();
      downloadText(
        `cogi-journal-${new Date().toISOString().slice(0, 10)}.md`,
        md,
        "text/markdown",
      );
      setBackupMsg("Journal Markdown downloaded.");
    } catch (e) {
      setBackupErr(e instanceof Error ? e.message : "Export failed");
    }
  };

  const onImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBackupErr(null);
    setBackupMsg(null);
    void (async () => {
      try {
        const text = await file.text();
        const merge = window.confirm(
          "Import mode: OK = merge rows by id into Firebase (recommended). Cancel = replace all matching Firestore collections for this account from the file (destructive).",
        )
          ? "merge"
          : "replace";
        if (
          merge === "replace" &&
          !window.confirm(
            "This will DELETE your existing exercise data in Firebase for this account, then replace it from the file. Continue?",
          )
        ) {
          return;
        }
        await importBackupJson(text, merge);
        setBackupMsg(`Import complete (${merge}).`);
      } catch (err) {
        setBackupErr(err instanceof Error ? err.message : "Import failed");
      }
    })();
  };

  return (
    <main className="mx-auto max-w-lg p-8">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-2">
            <input
              id="recall"
              type="checkbox"
              checked={recallOn}
              onChange={(e) => void toggleRecall(e.target.checked)}
              className="size-4"
            />
            <Label htmlFor="recall" className="font-normal">
              Delayed recall
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="adaptive"
              type="checkbox"
              checked={adaptiveOn}
              onChange={(e) => void toggleAdaptive(e.target.checked)}
              className="size-4"
            />
            <Label htmlFor="adaptive" className="font-normal">
              Adaptive difficulty
            </Label>
          </div>

          {adaptiveOn ? (
            <div className="ml-6 grid gap-3 border-l border-border pl-4">
              <div className="flex items-center gap-2">
                <input
                  id="manual-difficulty"
                  type="checkbox"
                  checked={manualDifficultyOn}
                  onChange={(e) => void toggleManualDifficulty(e.target.checked)}
                  className="size-4"
                />
                <Label htmlFor="manual-difficulty" className="font-normal">
                  Manually set difficulty (overrides accuracy-based tier)
                </Label>
              </div>
              {manualDifficultyOn ? (
                <div className="grid max-w-md gap-3">
                  <Label htmlFor="difficulty-tier">
                    Difficulty: {DIFFICULTY_TIERS[difficultyTierIndex]} (
                    {difficultyTierIndex + 1}/{DIFFICULTY_TIERS.length})
                  </Label>
                  <Slider
                    id="difficulty-tier"
                    min={0}
                    max={DIFFICULTY_TIERS.length - 1}
                    step={1}
                    value={[difficultyTierIndex]}
                    onValueChange={(v) => {
                      const n = Array.isArray(v) ? v[0] : v;
                      onDifficultyTierChange(typeof n === "number" ? n : 0);
                    }}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    {DIFFICULTY_TIERS.map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid max-w-md gap-3">
            <Label htmlFor="language-level">
              Language level: {LANGUAGE_LEVELS[languageLevelIndex]} (
              {LANGUAGE_LEVEL_DESCRIPTIONS[LANGUAGE_LEVELS[languageLevelIndex]]})
            </Label>
            <Slider
              id="language-level"
              min={0}
              max={LANGUAGE_LEVELS.length - 1}
              step={1}
              value={[languageLevelIndex]}
              onValueChange={(v) => {
                const n = Array.isArray(v) ? v[0] : v;
                onLanguageLevelChange(typeof n === "number" ? n : 0);
              }}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              {LANGUAGE_LEVELS.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Controls sentence complexity and vocabulary in generated exercises, independent of
              difficulty. Your current real-world level is roughly IELTS 6.0-6.5, so
              &quot;Intermediate&quot; is the default. Raise this over time as your English
              improves.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ctx">Personal context</Label>
            <Textarea
              id="ctx"
              rows={8}
              value={ctx}
              onChange={(e) => setCtx(e.target.value)}
              placeholder="Context..."
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void save()}>
              Save
            </Button>
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "inline-flex items-center justify-center",
              )}
            >
              Home
            </Link>
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "inline-flex items-center justify-center",
              )}
            >
              Dashboard
            </Link>
          </div>
          {saved ? (
            <p className="text-muted-foreground text-sm">Saved.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle>Geopolitics progression</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button type="button" variant="secondary" onClick={() => void resetGeoProgression()}>
            Reset progression counter
          </Button>
          {geoEpoch ? (
            <p className="text-muted-foreground text-xs">
              Reset on{" "}
              {new Date(geoEpoch).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
              .
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle>Keyboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Delete dialog:</span> press{" "}
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
              Escape
            </kbd>{" "}
            to close. Type <span className="font-mono font-semibold text-foreground">Delete</span>.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle>Data backup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => void exportJson()}>
              Download JSON backup
            </Button>
            <Button type="button" variant="secondary" onClick={() => void exportMd()}>
              Download journal as Markdown
            </Button>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="import-json">Import JSON backup</Label>
            <input
              id="import-json"
              type="file"
              accept="application/json,.json"
              className="text-muted-foreground text-sm"
              onChange={onImportFile}
            />
          </div>
          {backupMsg ? <p className="text-muted-foreground text-sm">{backupMsg}</p> : null}
          {backupErr ? <p className="text-destructive text-sm">{backupErr}</p> : null}
        </CardContent>
      </Card>
    </main>
  );
}
