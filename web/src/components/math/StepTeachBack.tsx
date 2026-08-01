"use client";

import { useState } from "react";
import type { Scenario } from "@/lib/types/math-scenario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { InlineSpinner } from "@/components/ui/inline-spinner";
import { cn } from "@/lib/utils";

interface StepTeachBackProps {
  scenario: Scenario;
  onComplete: () => void;
}

interface Message {
  sender: "user" | "student";
  message: string;
}

export function StepTeachBack({ scenario, onComplete }: StepTeachBackProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "student",
      message: `Hey! I heard you just analyzed the "${scenario.title}" problem. Can you explain in plain terms how you decided what to do? I want to make sure I get the intuition!`,
    },
  ]);
  const [userInput, setUserInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleSendMessage = async () => {
    if (!userInput.trim() || loading) return;

    const newMsg: Message = { sender: "user", message: userInput.trim() };
    const updatedHistory = [...messages, newMsg];
    setMessages(updatedHistory);
    setUserInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/math/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "student",
          scenarioId: scenario.id,
          situation: scenario.situation,
          toolName: scenario.toolName,
          fieldNote: scenario.fieldNote,
          userExplanation: newMsg.message,
          conversationHistory: updatedHistory,
        }),
      });

      const data = await res.json();
      if (data.ok && data.text) {
        setMessages((prev) => [...prev, { sender: "student", message: data.text }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: "student",
            message: "Aha! That makes sense. So basically we are balancing potential downside risk against fixed costs?",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: "student",
          message: "Wait, so why do we care about the average outcome if the bad event might not happen?",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
              <span className="bg-foreground/60 h-1.5 w-1.5 rounded-full" />
              <span>Step 5 - Feynman teach-back (roleplay with Alex)</span>
            </div>
            <span className="text-muted-foreground text-[11px]">
              Alex = curious non-technical colleague
            </span>
          </div>

          <div className="border-border bg-muted/30 rounded-lg border p-3 text-xs">
            <span className="font-semibold">Feynman technique goal:</span> Explain the concept to
            Alex in plain English. Alex will ask follow-up questions if your explanation uses
            unexplained jargon or hand-wavy assumptions.
          </div>

          {/* Chat History */}
          <div className="border-border bg-muted/30 max-h-72 min-h-48 space-y-3 overflow-y-auto rounded-lg border p-3">
            {messages.map((m, idx) => (
              <div key={idx} className={cn("flex", m.sender === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg p-3 text-xs leading-relaxed",
                    m.sender === "user"
                      ? "bg-zinc-900 text-white"
                      : "border-border bg-card border",
                  )}
                >
                  <div className="mb-1 text-[10px] font-semibold opacity-60">
                    {m.sender === "user" ? "YOU" : "ALEX (COLLEAGUE)"}
                  </div>
                  {m.message}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="border-border bg-card text-muted-foreground rounded-lg border p-3 text-xs">
                  <InlineSpinner /> Alex is typing a question…
                </div>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="flex gap-2">
            <Input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Explain to Alex in your own words..."
              className="h-9"
            />
            <Button disabled={loading || !userInput.trim()} onClick={handleSendMessage}>
              Reply
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onComplete} size="lg">
          Finish scenario &amp; log calibration →
        </Button>
      </div>
    </div>
  );
}
