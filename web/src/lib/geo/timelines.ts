import type { ActorId } from "@/lib/geo/actors";
import type { GeoSource } from "@/lib/geo/types";

/**
 * Timelines with decision points (PLAN-geopolitics.md G4). A fixed data set: every
 * event and outcome was checked against its source on 2026-10-04. The choices at a
 * decision point are the app's teaching options; only the one marked `real` is history.
 */

export interface TimelineEvent {
  id: string;
  /** Sortable date; for a month or "early November", the first day of that period. */
  date: string;
  /** How the date is shown, e.g. "22 October 1962" or "July 1962". */
  dateLabel: string;
  text: string;
  source: GeoSource;
  /** A step that calmed the crisis (asked about at the end). */
  offRamp?: boolean;
}

export interface DecisionPoint {
  id: string;
  /** The timeline stops before this event and asks; the event is what really happened. */
  beforeEventId: string;
  /** Who the learner advises, and the situation, in one or two sentences. */
  role: string;
  question: string;
  options: { id: string; text: string }[];
  /** The option closest to what really happened. */
  realOptionId: string;
  /** What followed and why it mattered, from the source. */
  consequence: string;
  source: GeoSource;
}

export interface TimelineCase {
  id: string;
  title: string;
  when: string;
  intro: string;
  events: TimelineEvent[];
  decisions: DecisionPoint[];
  /** Country cards related to the case today. */
  actorIds: ActorId[];
}

const SRC = {
  cuba: {
    label: "U.S. Department of State, Office of the Historian, The Cuban Missile Crisis, October 1962",
    url: "https://history.state.gov/milestones/1961-1968/cuban-missile-crisis",
  },
  suez: {
    label: "U.S. Department of State, Office of the Historian, The Suez Crisis, 1956",
    url: "https://history.state.gov/milestones/1953-1960/suez",
  },
  oil: {
    label: "U.S. Department of State, Office of the Historian, Oil Embargo, 1973-1974",
    url: "https://history.state.gov/milestones/1969-1976/oil-embargo",
  },
  iea: {
    label: "International Energy Agency, The History of the IEA: The First 20 Years",
    url: "https://iea.blob.core.windows.net/assets/5191c983-8747-4202-897c-2c1d17831aa4/3ieahistory.pdf",
  },
  pcaRelease: {
    label: "Permanent Court of Arbitration, The South China Sea Arbitration: Press Release, 12 July 2016",
    url: "https://docs.pca-cpa.org/2016/07/PH-CN-20160712-Press-Release-No-11-English.pdf",
  },
  pcaAward: {
    label: "Permanent Court of Arbitration, Award in the South China Sea Arbitration (PCA Case 2013-19), 12 July 2016",
    url: "https://docs.pca-cpa.org/2016/07/PH-CN-20160712-Award.pdf",
  },
  chinaStatement: {
    label: "Ministry of Foreign Affairs of China, Statement on the Award of 12 July 2016",
    url: "https://www.fmprc.gov.cn/nanhai/eng/snhwtlcwj_1/201607/t20160712_8527294.htm",
  },
  wto2006: {
    label: "WTO, General Council approves Viet Nam's membership, Press/455, 7 November 2006",
    url: "https://www.wto.org/english/news_e/pres06_e/pr455_e.htm",
  },
  wtoVietnam: {
    label: "WTO, Viet Nam - Member information",
    url: "https://www.wto.org/english/thewto_e/countries_e/vietnam_e.htm",
  },
  bta: {
    label: "Congressional Research Service, The Vietnam-U.S. Bilateral Trade Agreement (RL30416)",
    url: "https://www.everycrsreport.com/reports/RL30416.html",
  },
} satisfies Record<string, GeoSource>;

export const TIMELINE_CASES: TimelineCase[] = [
  {
    id: "cuba-1962",
    title: "The Cuban Missile Crisis",
    when: "1962",
    intro: "The closest the US and the Soviet Union came to nuclear war. Follow the days and decide at two moments.",
    events: [
      { id: "c1", date: "1962-07-01", dateLabel: "July 1962", text: "Khrushchev and Castro secretly agree to place Soviet nuclear missiles in Cuba.", source: SRC.cuba },
      { id: "c2", date: "1962-09-04", dateLabel: "4 September 1962", text: "Kennedy publicly warns against bringing offensive weapons into Cuba.", source: SRC.cuba },
      { id: "c3", date: "1962-10-14", dateLabel: "14 October 1962", text: "A US U-2 plane photographs missile sites being built in Cuba.", source: SRC.cuba },
      { id: "c4", date: "1962-10-22", dateLabel: "22 October 1962", text: "Kennedy orders a naval \"quarantine\" of Cuba and demands that the missiles be removed.", source: SRC.cuba },
      { id: "c5", date: "1962-10-27", dateLabel: "27 October 1962", text: "A second Khrushchev message also asks for US missiles to leave Turkey. A US U-2 is shot down over Cuba.", source: SRC.cuba },
      { id: "c6", date: "1962-10-27", dateLabel: "27 October 1962, night", text: "Kennedy answers the first message: the missiles leave under UN supervision, and the US will not attack Cuba. In secret, the US says it will soon remove its missiles from Turkey.", source: SRC.cuba, offRamp: true },
      { id: "c7", date: "1962-10-28", dateLabel: "28 October 1962", text: "Khrushchev announces that the missiles in Cuba will be taken apart and removed.", source: SRC.cuba },
      { id: "c8", date: "1963-04-01", dateLabel: "April 1963", text: "The US removes its Jupiter missiles from Turkey.", source: SRC.cuba },
    ],
    decisions: [
      {
        id: "cuba-d1",
        beforeEventId: "c4",
        role: "You advise the US president. Photos show nuclear missile sites being built in Cuba.",
        question: "What should the US do first?",
        options: [
          { id: "strike", text: "Bomb the missile sites, then invade Cuba" },
          { id: "quarantine", text: "Stop new weapons at sea and demand that the missiles go" },
          { id: "quiet", text: "Say nothing in public and use quiet talks only" },
        ],
        realOptionId: "quarantine",
        consequence:
          "Some advisers, including all the Joint Chiefs of Staff, wanted an air strike and an invasion. Kennedy chose a middle course. Calling it a \"quarantine\" instead of a blockade avoided implying a state of war and won the support of the Organization of American States.",
        source: SRC.cuba,
      },
      {
        id: "cuba-d2",
        beforeEventId: "c6",
        role: "You advise the US president. Khrushchev's first message offers to remove the missiles if the US promises not to invade Cuba. His second also wants US missiles out of Turkey. A US plane was just shot down.",
        question: "How should the US reply?",
        options: [
          { id: "first", text: "Answer the first message, and quietly signal on Turkey" },
          { id: "attack", text: "Reject both messages and attack Cuba" },
          { id: "public", text: "Publicly accept a trade for the missiles in Turkey" },
        ],
        realOptionId: "first",
        consequence:
          "Ignoring the second message was risky. Robert Kennedy told the Soviet ambassador in secret that the missiles in Turkey would go soon, but not as part of any public deal. The next morning Khrushchev announced that the missiles would be removed.",
        source: SRC.cuba,
      },
    ],
    actorIds: ["us", "russia"],
  },
  {
    id: "suez-1956",
    title: "The Suez Crisis",
    when: "1956",
    intro: "Egypt takes over the company that runs the Suez Canal. Two European powers and the US must decide what to do.",
    events: [
      { id: "s1", date: "1956-07-26", dateLabel: "26 July 1956", text: "Egypt's President Nasser nationalizes the Suez Canal Company, run by Britain and France, and offers full compensation.", source: SRC.suez },
      { id: "s2", date: "1956-09-09", dateLabel: "9 September 1956", text: "The US proposes a Suez Canal Users' Association of 18 maritime nations to run the canal. No side fully supports it.", source: SRC.suez },
      { id: "s3", date: "1956-10-29", dateLabel: "29 October 1956", text: "Israeli forces attack across Egypt's Sinai Peninsula, under a secret plan made with Britain and France.", source: SRC.suez },
      { id: "s4", date: "1956-11-01", dateLabel: "Early November 1956", text: "Britain and France land troops, saying they are protecting the canal.", source: SRC.suez },
      { id: "s5", date: "1956-11-06", dateLabel: "6 November 1956", text: "Under US pressure, Britain and France accept a UN ceasefire. The US also votes for a UN peacekeeping force.", source: SRC.suez, offRamp: true },
      { id: "s6", date: "1957-01-01", dateLabel: "January 1957", text: "British Prime Minister Anthony Eden resigns.", source: SRC.suez },
    ],
    decisions: [
      {
        id: "suez-d1",
        beforeEventId: "s3",
        role: "You advise the British government. Egypt has taken over the canal company and offers compensation. US mediation has not worked.",
        question: "What should Britain do?",
        options: [
          { id: "accept", text: "Accept compensation and negotiate rules for the canal" },
          { id: "users", text: "Keep working on the US plan for a users' association" },
          { id: "force", text: "Plan in secret with France and Israel to take the canal by force" },
        ],
        realOptionId: "force",
        consequence:
          "Britain and France held secret military talks with Israel and made a joint plan to invade Egypt and overthrow Nasser. Israel attacked first, and British and French troops landed a few days later.",
        source: SRC.suez,
      },
      {
        id: "suez-d2",
        beforeEventId: "s5",
        role: "You advise the US president. Two close allies have invaded Egypt. The same week, the US condemned the Soviet intervention in Hungary.",
        question: "What should the US do?",
        options: [
          { id: "support", text: "Support Britain and France" },
          { id: "neutral", text: "Stay out of it" },
          { id: "ceasefire", text: "Press the allies to accept a UN ceasefire and back a UN force" },
        ],
        realOptionId: "ceasefire",
        consequence:
          "The US did not want to look tied to European colonialism, and feared the Soviets might step in. Its public criticism strained relations with London and Paris and helped lead to Eden's resignation, but US-UK ties had recovered by March 1957.",
        source: SRC.suez,
      },
    ],
    actorIds: ["us", "russia"],
  },
  {
    id: "oil-1973",
    title: "The 1973 oil embargo",
    when: "1973-1974",
    intro: "Arab oil producers stop selling oil to the US during a war. Oil-importing countries must respond.",
    events: [
      { id: "o1", date: "1973-04-01", dateLabel: "April 1973", text: "The Nixon administration announces a plan to raise US oil production and import less.", source: SRC.oil },
      { id: "o2", date: "1973-10-01", dateLabel: "October 1973", text: "During the Arab-Israeli War, Arab OPEC members stop oil exports to the US and some others, and cut production. Oil prices double, then quadruple.", source: SRC.oil },
      { id: "o3", date: "1973-11-07", dateLabel: "7 November 1973", text: "Nixon announces \"Project Independence\" to make the US independent in energy, and pushes allies to form a group of oil-consuming countries.", source: SRC.oil },
      { id: "o4", date: "1974-01-18", dateLabel: "18 January 1974", text: "After talks led by Kissinger, Egypt and Israel sign the First Disengagement Agreement.", source: SRC.oil, offRamp: true },
      { id: "o5", date: "1974-03-01", dateLabel: "March 1974", text: "With peace talks moving, the producers lift the embargo.", source: SRC.oil },
      { id: "o6", date: "1974-11-18", dateLabel: "November 1974", text: "Oil-importing countries set up the International Energy Agency (IEA) to run a shared energy programme.", source: SRC.iea },
    ],
    decisions: [
      {
        id: "oil-d1",
        beforeEventId: "o3",
        role: "You advise the US president. Arab producers have stopped oil exports to the US. Prices are rising fast and allies are split.",
        question: "What should the US do first?",
        options: [
          { id: "force", text: "Threaten to take oil fields by force" },
          { id: "independence", text: "Cut dependence on imports at home and organise the oil-importing countries" },
          { id: "give-in", text: "Change its Middle East policy to the producers' terms" },
        ],
        realOptionId: "independence",
        consequence:
          "Project Independence and the push for a group of oil consumers were both only partly successful. Europe and Japan needed US help on energy but also wanted to keep their distance from US Middle East policy.",
        source: SRC.oil,
      },
      {
        id: "oil-d2",
        beforeEventId: "o4",
        role: "You advise the US president. The producers link the end of the embargo to US efforts for peace between Israel and its Arab neighbours.",
        question: "How should the US handle this link?",
        options: [
          { id: "refuse", text: "Refuse to link the two issues" },
          { id: "parallel", text: "Negotiate the embargo and the peace talks side by side" },
          { id: "wait", text: "Wait for prices to fall on their own" },
        ],
        realOptionId: "parallel",
        consequence:
          "The US held parallel talks with oil producers and with Egypt, Syria and Israel. A full peace deal did not come, but the prospect of an Israel-Syria agreement was enough to lift the embargo in March 1974.",
        source: SRC.oil,
      },
    ],
    actorIds: ["us", "saudi-arabia"],
  },
  {
    id: "scs-arbitration",
    title: "The South China Sea arbitration",
    when: "2013-2016",
    intro: "The Philippines takes its maritime dispute with China to a tribunal under the UN Convention on the Law of the Sea. Decide for each side.",
    events: [
      { id: "a1", date: "2013-01-22", dateLabel: "22 January 2013", text: "The Philippines starts an arbitration case against China under the UN Convention on the Law of the Sea.", source: SRC.pcaAward },
      { id: "a2", date: "2014-12-01", dateLabel: "December 2014", text: "China publishes a Position Paper saying the tribunal has no jurisdiction. China says it will neither accept nor take part in the case.", source: SRC.pcaRelease },
      { id: "a3", date: "2014-12-02", dateLabel: "December 2014", text: "Vietnam sends a statement to the tribunal saying it has \"no doubt\" that the tribunal has jurisdiction.", source: SRC.pcaRelease },
      { id: "a4", date: "2015-10-29", dateLabel: "29 October 2015", text: "The tribunal rules that it has jurisdiction over some of the claims and leaves others for later.", source: SRC.pcaRelease },
      { id: "a5", date: "2016-07-12", dateLabel: "12 July 2016", text: "The tribunal's unanimous award finds no legal basis for China to claim historic rights to resources inside the \"nine-dash line\". It does not rule on who owns any land.", source: SRC.pcaRelease },
      { id: "a6", date: "2016-07-12", dateLabel: "12 July 2016", text: "China's Foreign Ministry says the award is \"null and void\" with no binding force, and that China neither accepts nor recognizes it.", source: SRC.chinaStatement },
    ],
    decisions: [
      {
        id: "scs-d1",
        beforeEventId: "a1",
        role: "You advise the Philippine government. It has a dispute with China over maritime rights in the South China Sea.",
        question: "What should the Philippines do?",
        options: [
          { id: "talks", text: "Keep to talks with China only" },
          { id: "arbitration", text: "Start an arbitration case under the UN Convention on the Law of the Sea" },
          { id: "warships", text: "Ask an ally to send warships" },
        ],
        realOptionId: "arbitration",
        consequence:
          "Under the Convention, the case could go ahead even if the other side stayed away. The tribunal must then check for itself that the claims are well founded in fact and law.",
        source: SRC.pcaRelease,
      },
      {
        id: "scs-d2",
        beforeEventId: "a2",
        role: "You advise the Chinese government. The Philippines has started an arbitration case about the South China Sea.",
        question: "What should China do?",
        options: [
          { id: "join", text: "Take part and argue its case" },
          { id: "refuse", text: "Refuse to take part and say the tribunal has no jurisdiction" },
          { id: "settle", text: "Offer the Philippines a deal before any ruling" },
        ],
        realOptionId: "refuse",
        consequence:
          "Without China in the room, the tribunal tested the Philippines' claims itself: it asked for more written answers, questioned the Philippines at two hearings and appointed independent experts.",
        source: SRC.pcaRelease,
      },
    ],
    actorIds: ["china", "vietnam", "asean"],
  },
  {
    id: "vietnam-wto",
    title: "Vietnam joins the WTO",
    when: "1995-2007",
    intro: "From 1995 to 2007: the long road into the World Trade Organization. Decide at two key moments.",
    events: [
      { id: "w1", date: "1995-01-31", dateLabel: "31 January 1995", text: "The WTO sets up a working party to negotiate Vietnam's membership.", source: SRC.wto2006 },
      { id: "w2", date: "1998-07-01", dateLabel: "July 1998", text: "The working party starts meeting. It meets 14 times up to October 2006.", source: SRC.wto2006 },
      { id: "w3", date: "2000-07-13", dateLabel: "13 July 2000", text: "Vietnam and the US sign a broad Bilateral Trade Agreement.", source: SRC.bta },
      { id: "w4", date: "2001-12-10", dateLabel: "10 December 2001", text: "The agreement comes into force. The US gives Vietnam normal trade relations, cutting US tariffs on most Vietnamese goods.", source: SRC.bta },
      { id: "w5", date: "2006-11-07", dateLabel: "7 November 2006", text: "The WTO General Council approves Vietnam's membership.", source: SRC.wto2006 },
      { id: "w6", date: "2007-01-11", dateLabel: "11 January 2007", text: "Vietnam becomes a member of the WTO.", source: SRC.wtoVietnam },
    ],
    decisions: [
      {
        id: "wto-d1",
        beforeEventId: "w3",
        role: "You advise Vietnam's government. The US offers lower tariffs on Vietnamese goods if Vietnam opens its own market, including services.",
        question: "What should Vietnam do?",
        options: [
          { id: "sign", text: "Sign the full agreement and open up step by step" },
          { id: "goods", text: "Open trade in goods only and keep services closed" },
          { id: "wait", text: "Wait and negotiate only at the WTO" },
        ],
        realOptionId: "sign",
        consequence:
          "Vietnam agreed to cut tariffs, ease barriers to US services such as banking and telecoms, and protect some intellectual property. Many commitments were phased in over three to five years.",
        source: SRC.bta,
      },
      {
        id: "wto-d2",
        beforeEventId: "w5",
        role: "You advise Vietnam's negotiators. WTO members ask for tough terms, for example following WTO rules on intellectual property at once.",
        question: "What should Vietnam do?",
        options: [
          { id: "accept", text: "Accept the terms and join now" },
          { id: "longer", text: "Ask for long transition periods, even if it takes years more" },
          { id: "stop", text: "Stop the talks" },
        ],
        realOptionId: "accept",
        consequence:
          "Vietnam agreed to follow the WTO agreement on intellectual property at once, with no transition period. Its trade minister said the talks went hand in hand with the country's economic reforms.",
        source: SRC.wto2006,
      },
    ],
    actorIds: ["vietnam", "us"],
  },
];

export function timelineById(id: string): TimelineCase | undefined {
  return TIMELINE_CASES.find((c) => c.id === id);
}

/** How a choice compares with history. History has no single right answer. */
export type DecisionVerdict = "close" | "different";

export interface TimelineAnswer {
  decisionId: string;
  optionId: string;
  /** How sure the learner was, 0-100. */
  confidence: number;
  verdict: DecisionVerdict;
}

export function judgeDecision(d: DecisionPoint, optionId: string, confidence: number): TimelineAnswer {
  return { decisionId: d.id, optionId, confidence, verdict: optionId === d.realOptionId ? "close" : "different" };
}

/** One finished timeline, saved on the Geo Lab row. */
export interface TimelineResult {
  caseId: string;
  answers: TimelineAnswer[];
  orderCorrect: number;
  orderTotal: number;
  offRampPicked: string | null;
  offRampCorrect: boolean | null;
}

/** Average confidence and how often the choice was close to history, both as 0-100. */
export function confidenceSummary(answers: TimelineAnswer[]): { avgConfidence: number; closeRate: number } | null {
  if (answers.length === 0) return null;
  const avg = answers.reduce((s, a) => s + a.confidence, 0) / answers.length;
  const close = answers.filter((a) => a.verdict === "close").length / answers.length;
  return { avgConfidence: Math.round(avg), closeRate: Math.round(close * 100) };
}

/** Events to put in order at the end: up to 4, spread over the timeline, distinct dates. */
export function orderQuizEvents(c: TimelineCase): TimelineEvent[] {
  const byDate = c.events.filter((e, i, all) => all.findIndex((x) => x.date === e.date) === i);
  if (byDate.length <= 4) return byDate;
  const step = (byDate.length - 1) / 3;
  return [0, 1, 2, 3].map((k) => byDate[Math.round(k * step)]!);
}
