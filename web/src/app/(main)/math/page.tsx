"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { allScenarios } from "@/lib/scenarios";
import { CalibrationCurve } from "@/components/math/CalibrationCurve";
import type { ConfidenceRecord } from "@/lib/types/exercise";
import { listConfidenceRecords } from "@/lib/db/exercises";

export default function MathModuleDashboard() {
  const [records, setRecords] = useState<ConfidenceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadRecords() {
      try {
        const fetched = await listConfidenceRecords();
        setRecords(fetched);
      } catch {
        // Fallback to empty records if unauthenticated or offline
        setRecords([]);
      } finally {
        setLoading(false);
      }
    }
    loadRecords();
  }, []);

  return (
    <div className="space-y-8">
      {/* Intro Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">
          Math & Scenario Thinking
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
          Master applied reasoning, expected value, probability, and mental models through real-world dilemmas. Ground truth is human-authored; progress is measured by calibration accuracy.
        </p>
      </div>

      {/* Calibration Subsystem Section */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
          Calibration Subsystem
        </h2>
        {loading ? (
          <div className="h-44 rounded-xl bg-slate-900/50 border border-slate-800 animate-pulse" />
        ) : (
          <CalibrationCurve records={records} />
        )}
      </section>

      {/* Scenario Catalog Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Expected Value & Decision Scenarios
          </h2>
          <span className="text-xs text-slate-500">
            {allScenarios.length} Scenarios Available
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allScenarios.map((scenario) => (
            <Link
              key={scenario.id}
              href={`/math/${scenario.id}`}
              className="group rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg hover:border-emerald-500/50 hover:bg-slate-900 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-400 uppercase tracking-wider">
                    {scenario.topic.replace("_", " ")}
                  </span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">
                    {scenario.commitSpec.kind.replace("_", " ")}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                  {scenario.title}
                </h3>

                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                  {scenario.situation}
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
                <span className="text-slate-500 font-medium">Tool: {scenario.toolName}</span>
                <span className="font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform inline-flex items-center">
                  Start Scenario →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
