import type { TrackStepType } from "@/lib/exercise/tracks";

/**
 * Starter ideas for a track's "your own" step, so the user does not face an empty
 * box. Written here, no AI call. Short and everyday on purpose.
 */
const PROMPTS: Partial<Record<TrackStepType, readonly string[]>> = {
  analytical: ["A claim from a work chat or meeting this week", "A news post or ad you saw lately", "An argument a friend made"],
  systems: ["Something at work that keeps going wrong", "A habit that feeds itself in your week", "One change at home and what it touched"],
  evaluative: ["A big purchase coming up", "A choice at work this week", "How to spend your next free weekend"],
  judgment: ["A hard talk at work you keep putting off", "Family or a friend asking for money", "A moment someone crossed a line"],
  reframe: ["A mistake that still bothers you", "Feedback that stung", "A worry that keeps coming back"],
};

export function ownPrompts(type: TrackStepType): readonly string[] {
  return PROMPTS[type] ?? PROMPTS.judgment!;
}
