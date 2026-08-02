"use client";

import { useEffect, useState } from "react";
import type { Scenario } from "@/lib/types/math-scenario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { InlineSpinner } from "@/components/ui/inline-spinner";
import { cn } from "@/lib/utils";

export interface StepStruggleMessage {
  sender: "user" | "tutor";
  message: string;
}

interface StepStruggleProps {
  scenario: Scenario;
  onProceedToCommit: () => void;
  /** Resume from a persisted chat history; omit to start with the default greeting. */
  initialMessages?: StepStruggleMessage[];
  /** Called whenever the conversation changes, so a parent can persist it. */
  onMessagesChange?: (messages: StepStruggleMessage[]) => void;
}

const DEFAULT_MESSAGES: StepStruggleMessage[] = [
  {
    sender: "tutor",
    message:
      "Welcome! I am your Socratic AI Tutor. Tell me: what trade-off or intuition are you considering for this scenario?",
  },
];

export function StepStruggle({
  scenario,
  onProceedToCommit,
  initialMessages,
  onMessagesChange,
}: StepStruggleProps) {
  const [messages, setMessages] = useState<StepStruggleMessage[]>(
    () => initialMessages ?? DEFAULT_MESSAGES,
  );
  const [userInput, setUserInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    onMessagesChange?.(messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const handleSendMessage = async () => {
    if (!userInput.trim() || loading) return;

    const newMsg: StepStruggleMessage = { sender: "user", message: userInput.trim() };
    const updatedHistory = [...messages, newMsg];
    setMessages(updatedHistory);
    setUserInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/math/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "tutor",
          scenarioId: scenario.id,
          situation: scenario.situation,
          userCurrentThinking: newMsg.message,
          keyTraps: scenario.keyTraps,
          hintLadder: scenario.hintLadder,
          conversationHistory: updatedHistory,
        }),
      });

      const data = await res.json();
      if (data.ok && data.text) {
        setMessages((prev) => [...prev, { sender: "tutor", message: data.text }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: "tutor",
            message: "Think about what assumptions you might be making regarding frequency or risk.",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: "tutor", message: "What outcome are you prioritizing in your calculation?" },
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
              <span>Step 3 - Socratic tutor (struggle)</span>
            </div>
            <span className="text-muted-foreground text-[11px]">
              Canonical answer is strictly hidden
            </span>
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
                    {m.sender === "user" ? "YOU" : "SOCRATIC TUTOR"}
                  </div>
                  {m.message}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="border-border bg-card text-muted-foreground rounded-lg border p-3 text-xs">
                  <InlineSpinner /> Socratic Tutor is thinking…
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
              placeholder="Ask a question or explain your thinking..."
              className="h-9"
            />
            <Button disabled={loading || !userInput.trim()} onClick={handleSendMessage}>
              Send
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onProceedToCommit} size="lg">
          Ready to commit prediction →
        </Button>
      </div>
    </div>
  );
}
