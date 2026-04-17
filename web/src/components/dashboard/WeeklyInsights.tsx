"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDb } from "@/lib/db/schema";

export function WeeklyInsights() {
  const [emotions, setEmotions] = useState<Record<string, number>>({});
  const [disagreeTotal, setDisagreeTotal] = useState(0);

  useEffect(() => {
    void (async () => {
      const db = getDb();
      const journals = await db.journalEntries.toArray();
      const em: Record<string, number> = {};
      for (const j of journals) {
        const lab = j.emotionLabel;
        if (!lab) continue;
        em[lab] = (em[lab] ?? 0) + 1;
      }
      setEmotions(em);
      const d = await db.perspectiveDisagreements.count();
      setDisagreeTotal(d);
    })();
  }, []);

  const emoEntries = Object.entries(emotions).sort((a, b) => b[1] - a[1]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Patterns (local)</CardTitle>
        <CardDescription>
          Journal emotions and AI perspective disagreements stored in this browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="mb-1 font-medium">Emotions (journal)</p>
          {emoEntries.length === 0 ? (
            <p className="text-muted-foreground text-xs">No emotion labels saved yet.</p>
          ) : (
            <ul className="text-muted-foreground space-y-1 text-xs">
              {emoEntries.map(([k, v]) => (
                <li key={k}>
                  {k}: {v}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="mb-1 font-medium">Perspective disagreements</p>
          <p className="text-muted-foreground text-xs">Total logged: {disagreeTotal}</p>
        </div>
      </CardContent>
    </Card>
  );
}
