"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SYSTEMS_ARCHETYPE_INFO, type SystemsArchetypeId } from "@/lib/exercise/systems-archetypes";

/** The archetype behind the scenario, and where the user meets it in their own life. */
export function SystemsPatternCard({
  archetype,
  lifeExample,
  onLifeExampleChange,
  finished,
}: {
  archetype: { id: SystemsArchetypeId; howItShows: string };
  lifeExample: string;
  onLifeExampleChange: (value: string) => void;
  finished: boolean;
}) {
  const info = SYSTEMS_ARCHETYPE_INFO[archetype.id];
  return (
    <Card data-testid="pattern-card">
      <CardHeader>
        <CardTitle className="text-base">The pattern: {info.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-relaxed">
        <p>{info.meaning}</p>
        <p className="text-zinc-600">Here: {archetype.howItShows}</p>
        <p className="text-zinc-600">Ask next time: {info.ask}</p>
        {finished ? (
          lifeExample.trim() ? (
            <p>
              <span className="text-muted-foreground">In your life: </span>
              {lifeExample.trim()}
            </p>
          ) : null
        ) : (
          <div className="space-y-1">
            <Label htmlFor="life-example">Where do you see this pattern in your own life?</Label>
            <Textarea
              id="life-example"
              rows={2}
              value={lifeExample}
              onChange={(e) => onLifeExampleChange(e.target.value)}
              placeholder="Work, money, health, family..."
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
