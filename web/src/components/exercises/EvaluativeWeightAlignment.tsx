"use client";

import type { EvaluativeCriterion } from "@/lib/types/exercise";

export function EvaluativeWeightAlignment({
  criteria,
  userWeights,
}: {
  criteria: EvaluativeCriterion[];
  userWeights: Record<string, number>;
}) {
  return (
    <div className="space-y-2 rounded-md border bg-muted/10 p-3">
      <p className="text-sm font-medium">Strategic alignment - your weights vs the advising actor</p>
      <p className="text-muted-foreground text-xs">
        Compare how you prioritized stakeholder interests with the model the scenario was built from.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="border p-2 text-left">Criterion</th>
              <th className="border p-2 text-center">Your weight</th>
              <th className="border p-2 text-center">Actor model</th>
              <th className="border p-2 text-center">Δ</th>
            </tr>
          </thead>
          <tbody>
            {criteria.map((c) => {
              const user = userWeights[c.id] ?? 3;
              const ai = c.suggestedWeight;
              const delta = user - ai;
              return (
                <tr key={c.id}>
                  <td className="border p-2">
                    <p className="font-medium">{c.label}</p>
                    <p className="text-muted-foreground text-xs">{c.description}</p>
                  </td>
                  <td className="border p-2 text-center">{user}</td>
                  <td className="border p-2 text-center">{ai}</td>
                  <td
                    className={`border p-2 text-center font-medium ${
                      delta > 0 ? "text-emerald-600" : delta < 0 ? "text-amber-600" : ""
                    }`}
                  >
                    {delta > 0 ? `+${delta}` : delta}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
