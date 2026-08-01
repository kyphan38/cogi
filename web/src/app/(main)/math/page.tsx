"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { allScenarios } from "@/lib/scenarios";
import { CalibrationCurve } from "@/components/math/CalibrationCurve";
import type { ConfidenceRecord } from "@/lib/types/exercise";
import { listConfidenceRecords } from "@/lib/db/exercises";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function MathModuleDashboard() {
  const [records, setRecords] = useState<ConfidenceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadRecords() {
      try {
        const fetched = await listConfidenceRecords();
        setRecords(fetched);
      } catch {
        setRecords([]);
      } finally {
        setLoading(false);
      }
    }
    loadRecords();
  }, []);

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl tracking-tight sm:text-[1.65rem]">Math & Scenarios</h1>
      </div>

      <section className="space-y-2">
        <p className="font-tracker text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
          Calibration Subsystem
        </p>
        {loading ? (
          <div className="h-44 rounded-lg border border-border bg-card animate-pulse" />
        ) : (
          <CalibrationCurve records={records} />
        )}
      </section>

      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <p className="font-tracker text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
            Expected Value Scenarios
          </p>
          <span className="text-xs text-muted-foreground">
            {allScenarios.length} Scenarios
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allScenarios.map((scenario) => (
            <Card
              key={scenario.id}
              className="group flex flex-col justify-between border-border bg-card shadow-xs transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-muted-foreground uppercase tracking-wider text-[11px]">
                    {scenario.topic.replace("_", " ")}
                  </span>
                  <span className="rounded bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground font-medium">
                    {scenario.commitSpec.kind.replace("_", " ")}
                  </span>
                </div>

                <CardTitle className="text-base font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
                  {scenario.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-2">
                <div className="flex items-center justify-between border-t border-border/80 pt-3 text-xs">
                  <span className="text-muted-foreground font-normal">
                    Tool: <span className="font-medium text-foreground">{scenario.toolName}</span>
                  </span>
                  <Link href={`/math/${scenario.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-medium px-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    >
                      Start →
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
