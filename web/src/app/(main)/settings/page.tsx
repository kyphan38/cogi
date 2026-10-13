"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  getAppSettings,
  getUserContext,
  setLanguageLevel,
  setUserContext,
} from "@/lib/db/settings";
import {
  DEFAULT_LANGUAGE_LEVEL,
  LANGUAGE_LEVEL_DESCRIPTIONS,
  LANGUAGE_LEVELS,
} from "@/lib/adaptive/language-level";
import { exportAllJsonString, importBackupJson } from "@/lib/db/backup";
import { themeStore, type Theme } from "@/lib/theme";
import { getFirebaseAuth } from "@/lib/auth/firebase-client";
import { awaitRouterReplace } from "@/lib/nav/await-router-replace";

const THEMES: readonly Theme[] = ["system", "light", "dark"];

export default function SettingsPage() {
  const [ctx, setCtx] = useState("");
  const [languageLevelIndex, setLanguageLevelIndex] = useState(
    LANGUAGE_LEVELS.indexOf(DEFAULT_LANGUAGE_LEVEL),
  );
  const [saved, setSaved] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const [backupErr, setBackupErr] = useState<string | null>(null);
  const theme = useSyncExternalStore(
    themeStore.subscribe,
    themeStore.get,
    themeStore.getServer,
  );
  const router = useRouter();

  const signOutAndLeave = async () => {
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
    } catch {
      // Session cookie cleanup is best-effort.
    }
    await signOut(getFirebaseAuth());
    await awaitRouterReplace(router, "/login");
  };

  useEffect(() => {
    void (async () => {
      const [text, s] = await Promise.all([getUserContext(), getAppSettings()]);
      setCtx(text);
      const levelIdx = LANGUAGE_LEVELS.indexOf(
        s.languageLevel ?? DEFAULT_LANGUAGE_LEVEL,
      );
      setLanguageLevelIndex(
        levelIdx >= 0
          ? levelIdx
          : LANGUAGE_LEVELS.indexOf(DEFAULT_LANGUAGE_LEVEL),
      );
    })();
  }, []);

  const save = async () => {
    await setUserContext(ctx);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
    <main className="mx-auto w-full min-w-0 max-w-3xl px-4 pt-8 pb-24 sm:px-6">
      <div className="max-w-xl">
        <h1 className="text-lg font-semibold">Settings</h1>

        <section className="mt-8 grid gap-3">
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
            Controls sentence complexity and vocabulary in generated exercises,
            independent of difficulty. Your current real-world level is roughly
            IELTS 6.0-6.5, so &quot;Intermediate&quot; is the default. Raise
            this over time as your English improves.
          </p>
        </section>

        <section className="mt-10 grid gap-2">
          <Label htmlFor="ctx">Personal context</Label>
          <Textarea
            id="ctx"
            rows={8}
            value={ctx}
            onChange={(e) => setCtx(e.target.value)}
            placeholder="Context..."
          />
          <div className="mt-2 flex items-baseline gap-5">
            <Button type="button" onClick={() => void save()}>
              Save
            </Button>
            <Link href="/" className={WORD}>
              Home
            </Link>
            {saved ? (
              <span className="text-sm text-muted-foreground">Saved.</span>
            ) : null}
          </div>
        </section>

        <Section title="Theme">
          {/* The current choice is ink and medium; the others are faint and tappable. */}
          <div
            className="flex gap-4 text-sm"
            role="radiogroup"
            aria-label="Theme"
          >
            {THEMES.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={theme === t}
                onClick={() => themeStore.set(t)}
                className={
                  theme === t
                    ? "font-medium text-foreground"
                    : "text-zinc-500 hover:text-foreground"
                }
              >
                {t}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Keyboard">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Delete dialog:</span>{" "}
            press{" "}
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
              Escape
            </kbd>{" "}
            to close. Type{" "}
            <span className="font-mono font-semibold text-foreground">
              Delete
            </span>
            .
          </p>
        </Section>

        <Section title="Data backup">
          <div className="grid gap-3 text-sm">
            <button
              type="button"
              onClick={() => void exportJson()}
              className={cn(WORD, "w-fit")}
            >
              Download JSON backup
            </button>
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
            {backupMsg ? (
              <p className="text-muted-foreground">{backupMsg}</p>
            ) : null}
            {backupErr ? (
              <p className="font-medium text-destructive">{backupErr}</p>
            ) : null}
          </div>
        </Section>

        <Section title="Account">
          <button
            type="button"
            onClick={() => void signOutAndLeave()}
            className={WORD}
          >
            Sign out
          </button>
        </Section>
      </div>
    </main>
  );
}

/** A secondary action as a plain word (DESIGN.md "Words as buttons"). */
const WORD =
  "text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline";

/** One settings group: a small heading and space, no card. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}
