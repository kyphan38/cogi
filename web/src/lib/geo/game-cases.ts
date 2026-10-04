import type { ActorId } from "@/lib/geo/actors";
import type { GeoSource } from "@/lib/geo/types";

/**
 * Real cases for "Geopolitical games" in Strategic situations (PLAN-geopolitics.md G3).
 * A fixed data set: every fact was checked against its sources on 2026-10-04. The AI
 * writes a made-up story with the same shape; "What really happened" always comes from
 * here, never from the AI.
 *
 * The game type is the app's teaching model of the case, not a fact about history.
 */

export type GeoGameType = "chicken" | "prisoners_dilemma" | "free_rider" | "stag_hunt" | "alliance";

export const GEO_GAME_LABELS: Record<GeoGameType, string> = {
  chicken: "Chicken",
  prisoners_dilemma: "Prisoner's dilemma",
  free_rider: "Free rider",
  stag_hunt: "Stag hunt",
  alliance: "Alliance commitment",
};

export interface GeoGameCase {
  id: string;
  title: string;
  when: string;
  gameType: GeoGameType;
  /** The situation before the outcome, 3-4 plain sentences. */
  summary: string;
  /** The two sides and their choices in the real case (A first, as in the game). */
  players: { A: { name: string; choices: [string, string] }; B: { name: string; choices: [string, string] } };
  /** 2-3 sentences: the real outcome. */
  whatHappened: string;
  /** One or two sentences: what the game teaches about this case. */
  lesson: string;
  /** A sourced caveat about modelling this case as a game, when there is one. */
  modelNote?: { text: string; source: GeoSource };
  sources: GeoSource[];
  /** Country cards that relate to the case today. */
  actorIds: ActorId[];
  /** Real names the made-up story must not use. */
  realNames: string[];
}

const SRC = {
  cubaHistorian: {
    label: "U.S. Department of State, Office of the Historian, The Cuban Missile Crisis, October 1962",
    url: "https://history.state.gov/milestones/1961-1968/cuban-missile-crisis",
  },
  cubaModel: {
    label: "Brams, A Game-Theoretic History of the Cuban Missile Crisis, Economies (2014)",
    url: "https://www.mdpi.com/2227-7099/2/1/20",
  },
  fas: {
    label: "Federation of American Scientists, Status of World Nuclear Forces 2026",
    url: "https://fas.org/initiative/status-world-nuclear-forces/",
  },
  inf: {
    label: "Arms Control Association, The Intermediate-Range Nuclear Forces (INF) Treaty at a Glance",
    url: "https://www.armscontrol.org/factsheets/intermediate-range-nuclear-forces-inf-treaty-glance",
  },
  priceCap: {
    label: "German Federal Foreign Office, Statement of the G7 and Australia on a price cap for seaborne Russian-origin crude oil, 2 December 2022",
    url: "https://www.auswaertiges-amt.de/en/newsroom/news/g7-australia-price-cap-seaborne-russian-origin-crude-oil-2567026",
  },
  priceCapTreasury: {
    label: "U.S. Department of the Treasury, The Price Cap on Russian Oil: A Progress Report",
    url: "https://home.treasury.gov/news/featured-stories/the-price-cap-on-russian-oil-a-progress-report",
  },
  eiaChokepoints: {
    label: "U.S. Energy Information Administration (EIA), World Oil Transit Chokepoints, updated March 2026",
    url: "https://www.eia.gov/international/analysis/special-topics/World_Oil_Transit_Chokepoints",
  },
  eiaMarch2020: {
    label: "U.S. Energy Information Administration (EIA), OPEC shift to maintain market share will cause global inventory increases and lower prices, March 2020",
    url: "https://www.eia.gov/todayinenergy/detail.php?id=43175",
  },
  opecApril2020: {
    label: "OPEC, The 10th (Extraordinary) OPEC and non-OPEC Ministerial Meeting concludes, 12 April 2020",
    url: "https://www.opec.org/pr-detail/310-12-apr-2020.html",
  },
  blankCheck: {
    label: "HISTORY, Germany gives Austria-Hungary \"blank check\" assurance, July 5, 1914",
    url: "https://www.history.com/this-day-in-history/july-5/germany-gives-austria-hungary-blank-check-assurance",
  },
  ww1: {
    label: "Britannica, World War I: Outbreak",
    url: "https://www.britannica.com/event/World-War-I/Outbreak",
  },
} satisfies Record<string, GeoSource>;

export const GEO_GAME_CASES: GeoGameCase[] = [
  {
    id: "cuba-1962",
    title: "The Cuban Missile Crisis",
    when: "October 1962",
    gameType: "chicken",
    summary:
      "In 1962 the Soviet Union secretly began building nuclear missile sites in Cuba. On October 14 a US spy plane photographed them. On October 22 President Kennedy ordered a naval \"quarantine\" of Cuba and demanded that the missiles be removed. For days both sides prepared for war while they sent each other messages.",
    players: {
      A: { name: "United States", choices: ["Keep up the pressure", "Ease off"] },
      B: { name: "Soviet Union", choices: ["Keep the missiles", "Remove the missiles"] },
    },
    whatHappened:
      "On October 28 Khrushchev announced that the missiles would be taken apart and removed. The US promised not to invade Cuba, and in secret said it would remove its Jupiter missiles from Turkey, which it did in April 1963. Afterwards the two sides set up a direct \"Hotline\" and took first steps toward a nuclear Test Ban Treaty.",
    lesson:
      "In chicken, the worst outcome is when neither side backs down. A deal that lets each side step back without looking weak helps both.",
    modelNote: {
      text: "Chicken is the usual model for this crisis, but some scholars argue that a different game fits the leaders' real preferences better. Every model leaves things out.",
      source: SRC.cubaModel,
    },
    sources: [SRC.cubaHistorian],
    actorIds: ["us", "russia"],
    realNames: ["United States", "America", "Soviet", "USSR", "Cuba", "Kennedy", "Khrushchev", "Castro", "Turkey", "Moscow", "Washington"],
  },
  {
    id: "arms-race",
    title: "The Cold War nuclear arms race",
    when: "1950s to 1980s",
    gameType: "prisoners_dilemma",
    summary:
      "During the Cold War the United States and the Soviet Union built up very large nuclear arsenals. The number of nuclear weapons in the world peaked at about 70,300 in 1986.",
    players: {
      A: { name: "United States", choices: ["Build more", "Limit weapons"] },
      B: { name: "Soviet Union", choices: ["Build more", "Limit weapons"] },
    },
    whatHappened:
      "In 1987 the two sides signed the INF Treaty, the first agreement to remove a whole type of nuclear weapon, checked by on-site inspections. By June 1991 they had destroyed 2,692 missiles. The treaty ended in 2019, when the US withdrew.",
    lesson:
      "In a prisoner's dilemma, each side's best move on its own leads to an outcome that is worse for both. Agreements that can be checked make the better outcome safer to choose.",
    sources: [SRC.fas, SRC.inf],
    actorIds: ["us", "russia"],
    realNames: ["United States", "America", "Soviet", "USSR", "Russia", "Reagan", "Gorbachev", "Moscow", "Washington", "INF"],
  },
  {
    id: "oil-price-cap-2022",
    title: "The price cap on Russian oil",
    when: "2022 onwards",
    gameType: "free_rider",
    summary:
      "In December 2022 the G7 countries and Australia agreed a price cap of $60 a barrel on Russian crude oil carried by sea, from December 5. Their companies could still help ship Russian oil to other countries if it was sold at or below the cap. The aim was to keep oil supplies stable while cutting Russia's revenue. Countries outside the group could still buy Russian oil.",
    players: {
      A: { name: "The price-cap group", choices: ["Enforce the cap strictly", "Enforce it loosely"] },
      B: { name: "A big buyer outside the group", choices: ["Buy the cheap oil", "Buy elsewhere"] },
    },
    whatHappened:
      "Group members banned almost all seaborne oil imports from Russia for themselves. After the war in Ukraine began in 2022, most of Russia's oil exports from its western ports moved from Europe to Asia, mainly India. The US Treasury says the main direct winners of the capped prices are emerging and lower-income countries that import Russian oil.",
    lesson:
      "A free rider gains by staying outside a group effort. Sanctions work less well when big buyers stay out, so a group has to make free riding less attractive.",
    sources: [SRC.priceCap, SRC.priceCapTreasury, SRC.eiaChokepoints],
    actorIds: ["eu", "us", "russia", "india"],
    realNames: ["Russia", "Russian", "India", "Indian", "China", "Chinese", "G7", "Ukraine", "Moscow", "European Union", "Australia"],
  },
  {
    id: "opec-2020",
    title: "OPEC+ oil cuts in 2020",
    when: "March to April 2020",
    gameType: "stag_hunt",
    summary:
      "In early 2020 the spread of COVID-19 hit oil demand. At a meeting on March 6, OPEC and partner countries such as Russia did not agree to keep cutting production after March 31. Oil prices fell sharply.",
    players: {
      A: { name: "Saudi Arabia", choices: ["Cut production", "Pump more"] },
      B: { name: "Russia", choices: ["Cut production", "Pump more"] },
    },
    whatHappened:
      "On April 12, 2020, OPEC and its partners, chaired by the Saudi and Russian energy ministers, agreed to cut production by 9.7 million barrels a day from May 1. Smaller cuts were agreed to run until April 2022.",
    lesson:
      "In a stag hunt, both sides do best if both cooperate, but each must trust the other to do it. Without trust, each plays safe and both get less.",
    sources: [SRC.eiaMarch2020, SRC.opecApril2020],
    actorIds: ["saudi-arabia", "russia"],
    realNames: ["Saudi", "Russia", "Russian", "OPEC", "Riyadh", "Moscow", "COVID"],
  },
  {
    id: "blank-cheque-1914",
    title: "Germany's \"blank cheque\" to Austria-Hungary",
    when: "July 1914",
    gameType: "alliance",
    summary:
      "In June 1914 a Serbian nationalist killed Archduke Franz Ferdinand of Austria-Hungary. On July 5, Germany's Kaiser promised unconditional support for whatever Austria-Hungary chose to do against Serbia. Historians call this the \"blank cheque\". The promise held even at the risk of war with Russia, whose allies included France and Britain.",
    players: {
      A: { name: "Germany", choices: ["Give firm backing", "Hold its ally back"] },
      B: { name: "Austria-Hungary", choices: ["Take a hard line", "Seek a compromise"] },
    },
    whatHappened:
      "Austria-Hungary sent Serbia a harsh ultimatum on July 23 and declared war on July 28. By August 4, Germany, Russia, France and Britain were also at war. A local crisis had become the First World War.",
    lesson:
      "A firm promise to an ally can warn off enemies, but it can also encourage the ally to take bigger risks. The danger of being pulled into an ally's war is called entrapment.",
    sources: [SRC.blankCheck, SRC.ww1],
    actorIds: [],
    realNames: ["Germany", "German", "Austria", "Hungary", "Serbia", "Russia", "France", "Britain", "Kaiser", "Franz Ferdinand", "Sarajevo"],
  },
];

export function geoGameCaseById(id: string | undefined | null): GeoGameCase | undefined {
  return id ? GEO_GAME_CASES.find((c) => c.id === id) : undefined;
}
