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
import {
  getAppSettings,
  getUserContext,
  setAdaptiveDifficultyEnabled,
  setDelayedRecallEnabled,
  setUserContext,
} from "@/lib/db/settings";
import {
  exportAllJsonString,
  exportJournalMarkdown,
  importBackupJson,
} from "@/lib/db/backup";

export default function SettingsPage() {
  const [ctx, setCtx] = useState("");
  const [recallOn, setRecallOn] = useState(true);
  const [adaptiveOn, setAdaptiveOn] = useState(false);
  const [saved, setSaved] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const [backupErr, setBackupErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [text, s] = await Promise.all([getUserContext(), getAppSettings()]);
      setCtx(text);
      setRecallOn(s.delayedRecallEnabled !== false);
      setAdaptiveOn(s.adaptiveDifficultyEnabled === true);
    })();
  }, []);

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
          "Import mode: OK = merge rows by id (recommended). Cancel = replace all local data with the file (destructive).",
        )
          ? "merge"
          : "replace";
        if (
          merge === "replace" &&
          !window.confirm("This will DELETE existing IndexedDB data in this app. Continue?")
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
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            Personal context is injected into AI prompts for exercises and
            perspective.
          </CardDescription>
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
              Enable delayed recall (48h card on dashboard)
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
              Enable adaptive difficulty (tier + weakness hints on exercise generation)
            </Label>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ctx">Personal context</Label>
            <Textarea
              id="ctx"
              rows={8}
              value={ctx}
              onChange={(e) => setCtx(e.target.value)}
              placeholder="e.g. role, goals, constraints..."
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
            <p className="text-muted-foreground text-sm">Saved to this browser.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Data backup</CardTitle>
          <CardDescription>
            Export or import everything stored in this browser (IndexedDB). Journal-only export is
            Markdown for reading outside the app.
          </CardDescription>
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
