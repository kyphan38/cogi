import {
  GEOPOLITICS_SUBDOMAINS,
  isGeopoliticsAnalyticalDomain,
} from "@/lib/exercise/geopolitics-domains";
import type { Exercise, ThinkingType } from "@/lib/types/exercise";

export const GEOPOLITICS_PROGRESSION = [
  {
    phase: "Foundations",
    description: "Core frameworks and your home region",
    subdomains: [
      "Realist lens - power, security, self-interest",
      "Liberal institutionalist lens - rules, norms, cooperation",
      "Southeast Asia & ASEAN strategy",
      "US-China strategic competition",
    ],
    exerciseTypes: ["analytical", "systems"] as const,
    targetExercises: 8,
  },
  {
    phase: "Economic & tech dimensions",
    description: "How money and technology shape power",
    subdomains: [
      "Economic statecraft (sanctions, trade wars, tariff barriers)",
      "Technology competition (semiconductors, AI, space, cyber)",
      "Energy geopolitics (oil, gas, renewables, nuclear)",
      "Political economy lens - who benefits, follow the money",
    ],
    exerciseTypes: ["analytical", "evaluative", "systems"] as const,
    targetExercises: 8,
  },
  {
    phase: "Regional deep dives",
    description: "Apply frameworks beyond your home region",
    subdomains: [
      "Indo-Pacific security architecture",
      "European security & NATO",
      "Middle East power dynamics",
      "Maritime & territorial disputes",
    ],
    exerciseTypes: ["analytical", "systems", "evaluative", "generative"] as const,
    targetExercises: 8,
  },
  {
    phase: "Advanced - multi-perspective & scenarios",
    description: "Scenario planning, information warfare, institutional decay",
    subdomains: [
      "Information warfare & narrative competition",
      "Nuclear strategy, deterrence & arms control",
      "Global institutions (UN, WTO, IMF - reform & erosion)",
      "Constructivist lens - identity, narrative, perception",
      "Climate geopolitics & resource scarcity (water, arable land)",
    ],
    exerciseTypes: ["generative", "systems", "evaluative"] as const,
    targetExercises: 10,
  },
] as const;

export type GeopoliticsProgressionPhase = (typeof GEOPOLITICS_PROGRESSION)[number];
export type ProgressionExerciseType = GeopoliticsProgressionPhase["exerciseTypes"][number];

const PROGRESSION_SUBDOMAIN_SET = new Set<string>(
  GEOPOLITICS_PROGRESSION.flatMap((p) => p.subdomains),
);

/** Dev guard: every progression subdomain must exist in the catalog. */
for (const sub of PROGRESSION_SUBDOMAIN_SET) {
  if (!(GEOPOLITICS_SUBDOMAINS as readonly string[]).includes(sub)) {
    throw new Error(`Invalid progression subdomain not in catalog: ${sub}`);
  }
}

export function isGeopoliticsProgressionSubdomain(domain: string): boolean {
  return PROGRESSION_SUBDOMAIN_SET.has(domain.trim());
}

export function normalizeExerciseDomain(domain: string): string {
  return domain.trim();
}

function exerciseHasGeopoliticsFlag(ex: Exercise): boolean {
  if (ex.type === "combo") return false;
  const row = ex as { isGeopolitics?: boolean };
  return row.isGeopolitics === true;
}

export function isGeopoliticsCompletedExercise(ex: Exercise): boolean {
  if (!ex.completedAt) return false;
  if (ex.type === "combo") return false;
  const d = normalizeExerciseDomain(ex.domain);
  if (!d) return false;
  if (exerciseHasGeopoliticsFlag(ex)) return true;
  if (isGeopoliticsProgressionSubdomain(d)) return true;
  return isGeopoliticsAnalyticalDomain(d);
}

function matchesPhaseExercise(
  ex: Exercise,
  phase: GeopoliticsProgressionPhase,
): boolean {
  if (!ex.completedAt) return false;
  const d = normalizeExerciseDomain(ex.domain);
  if (!(phase.subdomains as readonly string[]).includes(d)) return false;
  return (phase.exerciseTypes as readonly ThinkingType[]).includes(ex.type);
}

function countPhaseCompletions(
  completed: Exercise[],
  phase: GeopoliticsProgressionPhase,
): number {
  return completed.filter((ex) => matchesPhaseExercise(ex, phase)).length;
}

export type GeopoliticsProgressionState = {
  activePhaseIndex: number;
  activePhase: GeopoliticsProgressionPhase;
  phaseCompletionsCount: number;
  targetExercises: number;
  progressPercent: number;
  recommendedSubdomain: string;
  recommendedExerciseType: ProgressionExerciseType;
  totalGeopoliticsCompleted: number;
};

export function computeGeopoliticsProgressionState(
  completed: Exercise[],
  options?: { epochAfter?: string },
): GeopoliticsProgressionState | null {
  const epoch = options?.epochAfter?.trim();
  const geoCompleted = completed.filter((ex) => {
    if (!isGeopoliticsCompletedExercise(ex)) return false;
    if (epoch && ex.completedAt && ex.completedAt < epoch) return false;
    return true;
  });

  if (geoCompleted.length === 0) return null;

  let activePhaseIndex = GEOPOLITICS_PROGRESSION.length - 1;
  let phaseCompletionsCount = 0;

  for (let i = 0; i < GEOPOLITICS_PROGRESSION.length; i++) {
    const phase = GEOPOLITICS_PROGRESSION[i]!;
    const count = countPhaseCompletions(geoCompleted, phase);
    if (count < phase.targetExercises) {
      activePhaseIndex = i;
      phaseCompletionsCount = count;
      break;
    }
    if (i === GEOPOLITICS_PROGRESSION.length - 1) {
      activePhaseIndex = i;
      phaseCompletionsCount = count;
    }
  }

  const activePhase = GEOPOLITICS_PROGRESSION[activePhaseIndex]!;
  const progressPercent = Math.min(
    100,
    Math.round((phaseCompletionsCount / activePhase.targetExercises) * 100),
  );

  const completedInPhase = geoCompleted.filter((ex) =>
    matchesPhaseExercise(ex, activePhase),
  );
  const completedSubdomainsInPhase = new Set(
    completedInPhase.map((ex) => normalizeExerciseDomain(ex.domain)),
  );

  const recommendedSubdomain =
    activePhase.subdomains.find((sub) => !completedSubdomainsInPhase.has(sub)) ??
    activePhase.subdomains[0]!;

  const types = activePhase.exerciseTypes;
  const recommendedExerciseType =
    types[phaseCompletionsCount % types.length] ?? types[0]!;

  return {
    activePhaseIndex,
    activePhase,
    phaseCompletionsCount,
    targetExercises: activePhase.targetExercises,
    progressPercent,
    recommendedSubdomain,
    recommendedExerciseType,
    totalGeopoliticsCompleted: geoCompleted.length,
  };
}
