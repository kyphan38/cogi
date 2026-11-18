import Link from "next/link";

import { Section } from "@/components/shared/Section";
import { ALL_EXERCISE_CARDS, EXERCISE_GROUPS } from "@/lib/exercise/exercise-mode-cards";

const ROW =
  "group/row flex min-w-0 items-center justify-between gap-4 border-t border-border py-3 transition-colors";
const GO =
  "shrink-0 text-body text-muted-foreground transition-colors after:ml-1 after:content-['›'] group-hover/row:text-foreground";

/** Every exercise type in three small groups: name and one line each. */
export function AllExercises() {
  return (
    <Section title="All exercises" id="all-exercises" className="scroll-mt-20" data-testid="all-exercises">
      <div className="flex flex-col gap-6">
        {EXERCISE_GROUPS.map((g) => (
          <div key={g.title}>
            <h3 className="mb-1 text-meta text-muted-foreground">{g.title}</h3>
            <div className="border-b border-border">
              {g.types.map((t) => {
                const card = ALL_EXERCISE_CARDS.find((c) => c.type === t)!;
                return (
                  <Link key={t} href={card.href} className={ROW} data-testid="all-exercises-row">
                    <div className="min-w-0">
                      <p className="text-body">{card.label}</p>
                      <p className="text-meta text-muted-foreground">{card.desc}</p>
                    </div>
                    <span className={GO}>Open</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
