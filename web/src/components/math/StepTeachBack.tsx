"use client";

import { useState } from "react";
import type { Scenario } from "@/lib/types/math-scenario";
import { Button } from "@/components/ui/button";

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
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-md">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-semibold tracking-wider text-pink-400 uppercase">
            <span className="flex h-2 w-2 rounded-full bg-pink-400 animate-pulse" />
            <span>Step 5 — Feynman Teach-Back (Roleplay with Alex)</span>
          </div>
          <span className="text-[11px] text-slate-500">Alex = Curious non-technical colleague</span>
        </div>

        <div className="mb-4 rounded-lg bg-pink-950/20 border border-pink-800/30 p-3 text-xs text-pink-200">
          <span className="font-semibold">Feynman Technique Goal:</span> Explain the concept to Alex in plain English. Alex will ask follow-up questions if your explanation uses unexplained jargon or hand-wavy assumptions.
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
                    ? "bg-purple-600/20 border border-purple-500/30 text-purple-100"
                    : "bg-pink-950/40 border border-pink-800/40 text-pink-200"
                }`}
              >
                <div className="font-semibold text-[10px] mb-1 opacity-70">
                  {m.sender === "user" ? "YOU" : "ALEX (COLLEAGUE)"}
                </div>
                {m.message}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-pink-950/30 p-3 text-xs text-pink-400 animate-pulse">
                Alex is typing a question...
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
            placeholder="Explain to Alex in your own words..."
            className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-xs text-slate-100 placeholder-slate-600 focus:border-pink-500 focus:outline-none"
          />
          <Button
            disabled={loading || !userInput.trim()}
            onClick={handleSendMessage}
            className="bg-pink-500 hover:bg-pink-400 text-slate-950 font-semibold px-4 text-xs"
          >
            Reply
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={onComplete}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-6 py-2.5 rounded-lg shadow-lg"
        >
          Finish Scenario & Log Calibration →
        </Button>
      </div>
    </div>
  );
}
