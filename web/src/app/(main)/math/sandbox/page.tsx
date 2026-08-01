"use client";

import { useState } from "react";
import Link from "next/link";
import { computeSandboxEv } from "@/lib/sandbox/compute-ev";
import type {
  SandboxBranch,
  SandboxChallengeMessage,
  SandboxEvResult,
  SandboxStructuringProposal,
} from "@/lib/types/sandbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InlineSpinner } from "@/components/ui/inline-spinner";
import { cn } from "@/lib/utils";

function newBranchId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `b_${Math.random().toString(36).slice(2)}`;
}

export default function MathSandboxPage() {
  const [decisionText, setDecisionText] = useState("");
  const [structuring, setStructuring] = useState(false);
  const [structureError, setStructureError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<SandboxStructuringProposal | null>(null);

  const [branches, setBranches] = useState<SandboxBranch[]>([]);
  const [fixedCost, setFixedCost] = useState(0);
  const [oneShot, setOneShot] = useState(true);
  const [reserves, setReserves] = useState(0);

  const [result, setResult] = useState<SandboxEvResult | null>(null);

  const [messages, setMessages] = useState<SandboxChallengeMessage[]>([]);
  const [challengeInput, setChallengeInput] = useState("");
  const [challengeLoading, setChallengeLoading] = useState(false);

  const handleStructure = async () => {
    if (!decisionText.trim() || structuring) return;
    setStructuring(true);
    setStructureError(null);
    try {
      const res = await fetch("/api/math/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "sandbox_structure", decisionText: decisionText.trim() }),
      });
      const data = await res.json();
      if (data.ok && data.proposal) {
        const p = data.proposal as SandboxStructuringProposal;
        setProposal(p);
        setBranches(p.branches.map((b) => ({ ...b, id: newBranchId() })));
        setFixedCost(p.fixedCost);
        setOneShot(p.oneShot);
        setReserves(p.reserves);
        setResult(null);
        setMessages([]);
      } else {
        setStructureError(data.error ?? "Could not structure this decision. You can still build the form manually below.");
        // Fall back to an empty editable form so the user isn't blocked by an AI failure.
        setProposal({ summary: "", branches: [], fixedCost: 0, oneShot: true, reserves: 0, notes: "" });
        setBranches([{ id: newBranchId(), label: "Outcome A", probability: 0.5, payoff: 0 }]);
      }
    } catch {
      setStructureError("Network error while structuring. You can still build the form manually below.");
      setProposal({ summary: "", branches: [], fixedCost: 0, oneShot: true, reserves: 0, notes: "" });
      setBranches([{ id: newBranchId(), label: "Outcome A", probability: 0.5, payoff: 0 }]);
    } finally {
      setStructuring(false);
    }
  };

  const updateBranch = (id: string, patch: Partial<SandboxBranch>) => {
    setBranches((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    setResult(null);
  };

  const addBranch = () => {
    setBranches((prev) => [...prev, { id: newBranchId(), label: "New outcome", probability: 0, payoff: 0 }]);
    setResult(null);
  };

  const removeBranch = (id: string) => {
    setBranches((prev) => prev.filter((b) => b.id !== id));
    setResult(null);
  };

  const handleCompute = () => {
    const computed = computeSandboxEv({ decisionText, branches, fixedCost, oneShot, reserves });
    setResult(computed);
    setMessages([]);
  };

  const handleSendChallenge = async () => {
    if (!challengeInput.trim() || challengeLoading || !result) return;
    const newMsg: SandboxChallengeMessage = { sender: "user", message: challengeInput.trim() };
    const updatedHistory = [...messages, newMsg];
    setMessages(updatedHistory);
    setChallengeInput("");
    setChallengeLoading(true);
    try {
      const res = await fetch("/api/math/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "sandbox_challenge",
          decisionText,
          branches,
          fixedCost,
          oneShot,
          reserves,
          computedEv: result.ev,
          ruinFlag: result.ruinFlag,
          ruinReason: result.ruinReason,
          userMessage: newMsg.message,
          conversationHistory: updatedHistory,
        }),
      });
      const data = await res.json();
      if (data.ok && data.text) {
        setMessages((prev) => [...prev, { sender: "challenger", message: data.text }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: "challenger", message: "What would have to be true for that worst-case branch to actually happen?" },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: "challenger", message: "Does the average outcome matter here, or does the worst case dominate?" },
      ]);
    } finally {
      setChallengeLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="space-y-2">
        <Link
          href="/math"
          className="text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
        >
          ← Back to catalog
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl tracking-tight sm:text-[1.65rem]">Sandbox</h1>
          <Badge variant="secondary">Personal practice — not scored</Badge>
        </div>
        <p className="text-muted-foreground max-w-2xl text-sm">
          Bring a real decision from your own life or work and practice the expected-value
          frame on it. This is not saved and does not feed your calibration history —
          it&apos;s a space to think, not to be assessed.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Describe the decision</CardTitle>
          <CardDescription>
            Plain language is fine — e.g. &ldquo;should I pay $8k/mo for a second k8s cluster
            given our outage history.&rdquo;
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={decisionText}
            onChange={(e) => setDecisionText(e.target.value)}
            rows={3}
            placeholder="Describe the decision you're weighing..."
          />
          {structureError ? <p className="text-destructive text-xs">{structureError}</p> : null}
          <div className="flex justify-end">
            <Button disabled={!decisionText.trim() || structuring} onClick={() => void handleStructure()}>
              {structuring ? (
                <>
                  <InlineSpinner /> Structuring…
                </>
              ) : (
                "Structure it"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {proposal ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Draft structure — edit every number</CardTitle>
              <Badge variant="attention">AI draft, unverified</Badge>
            </div>
            {proposal.summary ? <CardDescription>{proposal.summary}</CardDescription> : null}
          </CardHeader>
          <CardContent className="space-y-5">
            {proposal.notes ? (
              <p className="border-border bg-muted/50 text-muted-foreground rounded-lg border p-3 text-xs">
                <span className="text-foreground font-medium">Model notes:</span> {proposal.notes}
              </p>
            ) : null}
            <p className="text-muted-foreground text-xs">
              These probabilities and payoffs are the AI&apos;s best guess, not a fact. You own
              every number below — challenge and correct them before computing anything.
            </p>

            <div className="space-y-3">
              {branches.map((b) => (
                <div key={b.id} className="border-border grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_auto_auto_auto]">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Outcome</Label>
                    <Input value={b.label} onChange={(e) => updateBranch(b.id, { label: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Probability (0–1)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={1}
                      step={0.05}
                      value={b.probability}
                      onChange={(e) => updateBranch(b.id, { probability: Number(e.target.value) })}
                      className="w-28"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Payoff ($, signed)</Label>
                    <Input
                      type="number"
                      value={b.payoff}
                      onChange={(e) => updateBranch(b.id, { payoff: Number(e.target.value) })}
                      className="w-36"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button variant="ghost" size="sm" onClick={() => removeBranch(b.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addBranch}>
                + Add branch
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Fixed/recurring cost ($)</Label>
                <Input
                  type="number"
                  value={fixedCost}
                  onChange={(e) => {
                    setFixedCost(Number(e.target.value));
                    setResult(null);
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Reserves / bankroll ($)</Label>
                <Input
                  type="number"
                  value={reserves}
                  onChange={(e) => {
                    setReserves(Number(e.target.value));
                    setResult(null);
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Repeatability</Label>
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={oneShot ? "default" : "outline"}
                    onClick={() => {
                      setOneShot(true);
                      setResult(null);
                    }}
                  >
                    One-shot
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={!oneShot ? "default" : "outline"}
                    onClick={() => {
                      setOneShot(false);
                      setResult(null);
                    }}
                  >
                    Repeated
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleCompute} disabled={branches.length === 0} size="lg">
                Compute expected value →
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Result</CardTitle>
            <CardDescription>Computed deterministically from your confirmed inputs above.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-border bg-muted/30 rounded-lg border p-4">
              <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Expected value
              </div>
              <div className={cn("text-2xl font-semibold tabular-nums", result.ev < 0 && "text-destructive")}>
                {result.ev >= 0 ? "+" : ""}
                {result.ev.toLocaleString("en-US", { style: "currency", currency: "USD" })}
              </div>
            </div>

            {result.ruinFlag ? (
              <Alert variant="destructive">
                <AlertTitle>Possible ruin-risk decision</AlertTitle>
                <AlertDescription>{result.ruinReason}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-3">
              <p className="text-muted-foreground text-xs">
                Discuss the result below — the AI will question and connect concepts, but it
                cannot change the number above.
              </p>
              <div className="border-border bg-muted/30 max-h-72 min-h-32 space-y-3 overflow-y-auto rounded-lg border p-3">
                {messages.length === 0 ? (
                  <p className="text-muted-foreground text-xs italic">
                    Ask why this result looks the way it does, or push back on it.
                  </p>
                ) : (
                  messages.map((m, idx) => (
                    <div key={idx} className={cn("flex", m.sender === "user" ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[85%] rounded-lg p-3 text-xs leading-relaxed",
                          m.sender === "user" ? "bg-zinc-900 text-white" : "border-border bg-card border",
                        )}
                      >
                        {m.message}
                      </div>
                    </div>
                  ))
                )}
                {challengeLoading ? (
                  <div className="flex justify-start">
                    <div className="border-border bg-card text-muted-foreground rounded-lg border p-3 text-xs">
                      <InlineSpinner /> Thinking…
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Input
                  value={challengeInput}
                  onChange={(e) => setChallengeInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChallenge()}
                  placeholder="Ask about or push back on the result..."
                  className="h-9"
                />
                <Button disabled={challengeLoading || !challengeInput.trim()} onClick={() => void handleSendChallenge()}>
                  Send
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
