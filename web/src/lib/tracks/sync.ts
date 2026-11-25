import { getAdaptiveTracks, setAdaptiveTracks } from "@/lib/db/adaptive-tracks";
import { getSavedTopics } from "@/lib/db/saved-topics";
import { practisedTopicTitles, requestTopicIdeas } from "@/lib/topics/client";
import { localDay } from "@/lib/review/schedule";
import type { Exercise } from "@/lib/types/exercise";
import {
  buildNextTrack,
  closeTrack,
  genTrackProgress,
  missingTopics,
  skipStep,
  withRecap,
  type AdaptiveTracksDoc,
  type BuildInput,
  type TrackRecap,
} from "@/lib/tracks/adaptive";

const topicKey = (t: string) => t.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Bring the adaptive track up to date and return it: close the current track when
 * every step is done or skipped (or `closeStale`), then build the next one. One write
 * at most. AI topic ideas are asked only when the hand-picked and saved topics run out.
 */
export function syncAdaptiveTrack(
  completed: Exercise[],
  incomplete: Exercise[],
  opts: { closeStale?: boolean } = {},
): Promise<AdaptiveTracksDoc> {
  // One sync at a time in this tab (React runs effects twice in dev): callers share it.
  inflight ??= syncOnce(completed, incomplete, opts).finally(() => {
    inflight = null;
  });
  return inflight;
}

let inflight: Promise<AdaptiveTracksDoc> | null = null;

async function syncOnce(
  completed: Exercise[],
  incomplete: Exercise[],
  opts: { closeStale?: boolean },
): Promise<AdaptiveTracksDoc> {
  const doc = await getAdaptiveTracks();
  let past = doc.past;
  let closedId: string | null = null;

  if (doc.current) {
    const finished = genTrackProgress(doc.current, completed).finished;
    if (!finished && !opts.closeStale) return doc;
    const now = new Date().toISOString();
    const recap: TrackRecap = closeTrack(doc.current, completed, past, finished ? "done" : "stale", now);
    past = withRecap(past, recap);
    closedId = doc.current.id;
  }

  const [practised, saved] = await Promise.all([
    practisedTopicTitles().catch(() => [] as string[]),
    getSavedTopics().catch(() => []),
  ]);
  const n = Math.max(0, ...past.map((r) => r.n)) + 1;
  const id = `t${n}-${crypto.randomUUID().slice(0, 6)}`;
  const input: BuildInput = {
    id,
    n,
    now: new Date().toISOString(),
    today: localDay(new Date()),
    completed,
    all: [...completed, ...incomplete],
    practiced: new Set(practised.map(topicKey)),
    saved,
    past,
  };
  let track = buildNextTrack(input);
  if (missingTopics(track) > 0) {
    // One AI call for the whole track; on failure the user picks the topic on the setup page.
    const aiIdeas = await requestTopicIdeas({ mode: "all" }).catch(() => []);
    if (aiIdeas.length) track = buildNextTrack({ ...input, aiIdeas });
  }

  // Another tab may have made the next track meanwhile: keep that one.
  const fresh = await getAdaptiveTracks();
  if (fresh.current && fresh.current.id !== closedId) return fresh;

  const next: AdaptiveTracksDoc = { id: "adaptiveTracks", current: track, past };
  await setAdaptiveTracks(next);
  return next;
}

/** Mark a step skipped; when that was the last open step, the track closes and the next one is built. */
export async function skipAdaptiveStep(
  stepId: string,
  completed: Exercise[],
  incomplete: Exercise[],
): Promise<AdaptiveTracksDoc> {
  const doc = await getAdaptiveTracks();
  if (!doc.current) return syncAdaptiveTrack(completed, incomplete);
  await setAdaptiveTracks({ current: skipStep(doc.current, stepId), past: doc.past });
  return syncAdaptiveTrack(completed, incomplete);
}
