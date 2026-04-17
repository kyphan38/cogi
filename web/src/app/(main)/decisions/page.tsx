"use client";

import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RealDecisionLogEntry } from "@/lib/types/decision";
import {
  deleteDecision,
  listDecisions,
  putDecision,
} from "@/lib/db/decisions";
import { listRecentExercisesForPicker } from "@/lib/db/exercises";

const DOMAINS = [
  "DevOps / SRE",
  "MLOps / Data Engineering",
  "Solution Architecture",
  "HPC",
  "Financial Planning",
  "Life Strategy",
  "Social & Communication",
  "Custom",
] as const;

export default function DecisionsPage() {
  const [rows, setRows] = useState<RealDecisionLogEntry[]>([]);
  const [text, setText] = useState("");
  const [domain, setDomain] = useState<string>(DOMAINS[0]);
  const [customDomain, setCustomDomain] = useState("");
  const [decidedAt, setDecidedAt] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [linkId, setLinkId] = useState<string>("");
  const [picker, setPicker] = useState<{ id: string; title: string }[]>([]);
  const [followUp, setFollowUp] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(true);

  const effectiveDomain =
    domain === "Custom" ? customDomain.trim() : domain;

  const load = () => {
    void listDecisions().then(setRows);
    void listRecentExercisesForPicker(30).then((ex) =>
      setPicker(ex.map((e) => ({ id: e.id, title: e.title }))),
    );
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!text.trim() || !effectiveDomain) return;
    const decidedDate = new Date(decidedAt + "T12:00:00");
    const remindOutcomeAt = reminderEnabled
      ? new Date(decidedDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : null;
    const row: RealDecisionLogEntry = {
      id: crypto.randomUUID(),
      text: text.trim(),
      decidedAt: decidedDate.toISOString(),
      domain: effectiveDomain,
      linkedExerciseId: linkId || null,
      followUpNote: followUp.trim() || null,
      remindOutcomeAt,
      createdAt: new Date().toISOString(),
    };
    await putDecision(row);
    setText("");
    setFollowUp("");
    setLinkId("");
    load();
  };

  const updateFollowUp = async (id: string, note: string) => {
    const cur = rows.find((r) => r.id === id);
    if (!cur) return;
    await putDecision({ ...cur, followUpNote: note || null });
    load();
  };

  return (
    <main className="mx-auto max-w-2xl space-y-8 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Real decisions</h1>
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "secondary", size: "sm" }),
            "inline-flex items-center justify-center",
          )}
        >
          Home
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add decision</CardTitle>
          <CardDescription>Log a real-world decision (optional link to an exercise).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid gap-2">
            <Label htmlFor="dtext">Decision</Label>
            <Textarea
              id="dtext"
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Domain</Label>
              <Select
                value={domain}
                onValueChange={(v) => setDomain(v ?? DOMAINS[0])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOMAINS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {domain === "Custom" ? (
                <Input
                  placeholder="Custom domain"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                />
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dat">Date decided</Label>
              <Input
                id="dat"
                type="date"
                value={decidedAt}
                onChange={(e) => setDecidedAt(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Outcome reminder</Label>
            <div className="text-xs text-muted-foreground">
              Optional: set a reminder to review the outcome in 7 days.
            </div>
            <Select
              value={reminderEnabled ? "on" : "off"}
              onValueChange={(v) => setReminderEnabled(v === "on")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on">
                  Set reminder 7 days after decided date
                </SelectItem>
                <SelectItem value="off">No reminder</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Link exercise (optional)</Label>
            <Select
              value={linkId || "__none__"}
              onValueChange={(v) =>
                setLinkId(v === "__none__" || v == null ? "" : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {picker.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" onClick={() => void add()}>
            Save decision
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">No entries yet.</p>
          ) : (
            rows.map((r) => (
              <div key={r.id} className="space-y-2 rounded-lg border p-3 text-sm">
                <p className="font-medium">{r.text}</p>
                <p className="text-muted-foreground">
                  {r.domain} · {r.decidedAt.slice(0, 10)}
                </p>
                <div className="grid gap-1">
                  <Label className="text-xs">Outcome / follow-up note</Label>
                  <Textarea
                    rows={2}
                    defaultValue={r.followUpNote ?? ""}
                    onBlur={(e) =>
                      void updateFollowUp(r.id, e.target.value)
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => void deleteDecision(r.id).then(load)}
                >
                  Delete
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </main>
  );
}
