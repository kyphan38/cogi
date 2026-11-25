import { weakSpotInfo } from "@/lib/exercise/weak-spots";
import type { TrackRecap } from "@/lib/tracks/adaptive";

const of = (t: { misses: number; chances: number }) => `${t.misses} of ${t.chances}`;

/** One closed track in numbers: steps, each aimed weak spot before and during, and the last track next to it. */
export function RecapBody({ recap, previous }: { recap: TrackRecap; previous?: TrackRecap }) {
  const { good, ok, poor } = recap.ratings;
  return (
    <div className="space-y-3" data-testid="recap-body">
      <p className="text-body tabular-nums">
        Track {recap.n} {recap.closeReason === "done" ? "done" : "closed"} · {recap.done} of {recap.total}
        {recap.skipped ? ` · ${recap.skipped} skipped` : ""}
      </p>
      {recap.targets.length ? (
        <ul className="space-y-1 text-body" data-testid="recap-targets">
          {recap.targets.map((t) => (
            <li key={t.key} className="tabular-nums">
              <span>{weakSpotInfo(t.key)?.label ?? t.key}: </span>
              <span className="text-muted-foreground">
                missed {of(t.before)} before →{" "}
                {t.during.chances ? `${of(t.during)} in this track` : "not practised in this track"}
              </span>
              {t.cleared ? <span className="ml-2 font-medium">cleared</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {good + ok + poor > 0 ? (
        <p className="text-meta text-muted-foreground tabular-nums" data-testid="recap-ratings">
          Good {good} · ok {ok} · hard {poor}
          {previous ? ` (track ${previous.n}: ${previous.ratings.good} · ${previous.ratings.ok} · ${previous.ratings.poor})` : ""}
        </p>
      ) : null}
    </div>
  );
}
