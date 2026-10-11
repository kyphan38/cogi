/** System archetypes: loop patterns that repeat across work, money, cities and families. */
export const SYSTEMS_ARCHETYPES = [
  "fixes_that_fail",
  "shifting_the_burden",
  "limits_to_growth",
  "tragedy_of_the_commons",
  "escalation",
  "success_to_the_successful",
  "eroding_goals",
  "growth_and_underinvestment",
] as const;
export type SystemsArchetypeId = (typeof SYSTEMS_ARCHETYPES)[number];

export const SYSTEMS_ARCHETYPE_INFO: Record<SystemsArchetypeId, { name: string; meaning: string; ask: string }> = {
  fixes_that_fail: {
    name: "Fixes that fail",
    meaning: "A quick fix helps now, but its side effects bring the problem back later.",
    ask: "What will this fix cause in a year?",
  },
  shifting_the_burden: {
    name: "Shifting the burden",
    meaning: "An easy fix treats the symptom, so the real fix gets weaker over time.",
    ask: "Are we fixing the cause, or only the pain?",
  },
  limits_to_growth: {
    name: "Limits to growth",
    meaning: "Growth runs into a limit, and pushing harder no longer helps.",
    ask: "What limit will stop this growth?",
  },
  tragedy_of_the_commons: {
    name: "Tragedy of the commons",
    meaning: "Each person takes a bit more of something shared, until it runs out for everyone.",
    ask: "Who looks after the shared thing?",
  },
  escalation: {
    name: "Escalation",
    meaning: "Two sides each react to the other, and both keep raising the stakes.",
    ask: "What if one side stops first?",
  },
  success_to_the_successful: {
    name: "Success to the successful",
    meaning: "The winner gets more resources, so it keeps winning and the other falls behind.",
    ask: "Is the gap about skill, or about who got resources first?",
  },
  eroding_goals: {
    name: "Eroding goals",
    meaning: "When a goal is hard to reach, people lower the goal instead of fixing the work.",
    ask: "Did we change the goal, or change the result?",
  },
  growth_and_underinvestment: {
    name: "Growth and underinvestment",
    meaning: "Growth needs more capacity, but nobody invests early, so growth stalls.",
    ask: "What do we need to build now for the growth we want?",
  },
};
