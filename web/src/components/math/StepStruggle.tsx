"use client";

import { useState } from "react";
import type { Scenario } from "@/lib/types/math-scenario";
import { Button } from "@/components/ui/button";

interface StepStruggleProps {
  scenario: Scenario;
  onProceedToCommit: () => void;
}

interface Message {
  sender: "user" | "tutor";
  message: string;
}

export function StepStruggle({ scenario, onProceedToCommit }: StepStruggleProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "tutor",
      message:
        "Welcome! I am your Socratic AI Tutor. Tell me: what trade-off or intuition are you considering for this scenario?",
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
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-md">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-semibold tracking-wider text-sky-400 uppercase">
            <span className="flex h-2 w-2 rounded-full bg-sky-400 animate-ping" />
            <span>Step 3 — Socratic Tutor (STRUGGLE)</span>
          </div>
          <span className="text-[11px] text-slate-500">
            Canonical answer is strictly hidden
          </span>
        </div>

        {/* Chat History */}
        <div className="mb-4 max-h-72 min-h-48 overflow-y-auto space-y-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-3 text-xs leading-relaxed ${
                  m.sender === "user"
                    ? "bg-emerald-600/20 border border-emerald-500/30 text-emerald-100"
                    : "bg-sky-950/40 border border-sky-800/40 text-sky-200"
                }`}
              >
                <div className="font-semibold text-[10px] mb-1 opacity-70">
                  {m.sender === "user" ? "YOU" : "SOCRATIC TUTOR"}
                </div>
                {m.message}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-sky-950/30 p-3 text-xs text-sky-400 animate-pulse">
                Socratic Tutor is thinking...
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="flex space-x-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Ask a question or explain your thinking..."
            className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-xs text-slate-100 placeholder-slate-600 focus:border-sky-500 focus:outline-none"
          />
          <Button
            disabled={loading || !userInput.trim()}
            onClick={handleSendMessage}
            className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold px-4 text-xs"
          >
            Send
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={onProceedToCommit}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-6 py-2.5 rounded-lg shadow-lg"
        >
          Ready to Commit Prediction →
        </Button>
      </div>
    </div>
  );
}
