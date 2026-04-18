"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { subscribePerspectiveDisagreementCount } from "@/lib/db/disagreements";
import { subscribeJournalEntries } from "@/lib/db/journal";
import { logFirestoreQueryError } from "@/lib/db/firestore";

export function WeeklyInsights() {
  const [emotions, setEmotions] = useState<Record<string, number>>({});
  const [disagreeTotal, setDisagreeTotal] = useState(0);

  useEffect(() => {
    const unsubscribeJournals = subscribeJournalEntries(
      (journals) => {
        const em: Record<string, number> = {};
        for (const journal of journals) {
          const label = journal.emotionLabel;
          if (!label) continue;
          em[label] = (em[label] ?? 0) + 1;
        }
        setEmotions(em);
      },
      (error) => {
        logFirestoreQueryError("WeeklyInsights", "subscribeJournalEntries", error);
      },
    );
    const unsubscribeDisagreements = subscribePerspectiveDisagreementCount(
      (count) => setDisagreeTotal(count),
      (error) => {
        logFirestoreQueryError("WeeklyInsights", "subscribePerspectiveDisagreementCount", error);
      },
    );
    return () => {
      unsubscribeJournals();
      unsubscribeDisagreements();
    };
  }, []);

  const emoEntries = Object.entries(emotions).sort((a, b) => b[1] - a[1]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Patterns (local)</CardTitle>
        <CardDescription>
          Journal emotions and AI perspective disagreements from your saved exercises.
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
