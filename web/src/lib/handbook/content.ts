import type { ThinkingType } from "@/lib/types/exercise";

/**
 * The Handbook (/handbook): what each feature trains, what you get from it, and how to
 * practise. Plain English (about IELTS 6). One entry per feature, kept short.
 *
 * KEEP THIS IN SYNC: when you add or change a user-facing feature, update its entry
 * here in the same change (see web/AGENTS.md). `content.test.ts` fails when an
 * exercise type has no entry.
 */

export interface HandbookLevels {
  guided: string;
  standard: string;
  expert: string;
}

export interface HandbookEntry {
  /** Anchor on /handbook. */
  id: string;
  title: string;
  /** Where to find it in the app. */
  href: string;
  group: "exercise" | "tool" | "basics";
  /** Set for exercise entries: which exercise type this explains. */
  exerciseType?: ThinkingType;
  /** One line: what this trains. */
  trains: string;
  /** What you get from it, in real life. */
  benefits: string[];
  /** How to practise it. */
  howToPractice: string[];
  levels?: HandbookLevels;
  /** Tips and common mistakes. */
  tips: string[];
}

/** "Start here": the first week for a beginner. */
export const HANDBOOK_START: { title: string; steps: string[]; rhythm: string } = {
  title: "Start here",
  steps: [
    "Pick one exercise type and stay at Guided for your first few exercises. Life situations or Analytical are good first choices.",
    "Do the Learning track on the Practice page: one step a day is enough.",
    "Read the feedback slowly. The most useful part is \"Next time, ask\": copy that question into your head, not the answer.",
    "Write one line in \"What will you take away?\" at the end. It makes the lesson stick.",
    "When the app suggests a higher level, try it. If it feels too hard, go back - that is normal.",
  ],
  rhythm: "A good rhythm: 3-4 short exercises a week (10-15 minutes each), mixing two or three types.",
};

export const HANDBOOK_ENTRIES: HandbookEntry[] = [
  {
    id: "practice-loop",
    title: "How an exercise works",
    href: "/reasoning",
    group: "basics",
    trains: "Every exercise has the same three steps: Setup, the work, then AI feedback.",
    benefits: [
      "You always know where you are and what comes next.",
      "Feedback compares your work with a reasoned answer, so you can see your own thinking.",
    ],
    howToPractice: [
      "Setup: choose a level and a topic, then press Generate.",
      "Do the work. Your answers save by themselves, so you can stop and come back from Practice > Continue.",
      "Do not want to finish one? Tap the small bin icon next to it in Continue (on a computer, it shows when you point at the row).",
      "Before feedback, set how sure you are. Later, compare it with your result.",
      "Finish with one takeaway line. History keeps everything.",
    ],
    tips: [
      "Do not rush to the feedback. The thinking you do first is the practice.",
      "If a passage or story is unclear, press Regenerate for a new one.",
    ],
  },
  {
    id: "choosing",
    title: "Choosing what to practise",
    href: "/reasoning",
    group: "basics",
    trains: "Two ways to start on the Practice page: from a topic, or from a mode.",
    benefits: [
      "You never get stuck on a blank topic box.",
      "Every topic ends up in the exercise that trains it best.",
    ],
    howToPractice: [
      "Start from a topic: choose an area, a domain and a mode if you like (or leave them on \"Any\"), then press Generate. You get 10 concrete topics, each with the mode that fits it.",
      "Press Generate again for 10 new topics. Topics you have already practised do not come back.",
      "Have your own situation or text? Choose \"Specific scenario\", paste it, and press \"Suggest modes\". Pick one of the modes to start with your text.",
      "A long text (120 words or more) in Analytical is analysed as it is. A shorter one becomes the base of a new passage.",
      "Start from a mode: pick a mode, choose an area and domain if you like, then press Generate for 10 topics for that mode. Or choose \"Specific scenario\" to start that mode with your own text.",
      "Tap a topic to open the exercise with it filled in. You still choose your level there.",
      "Like a topic? Tap the bookmark next to it. Saved topics show under \"Saved topics\", so you can start them later without generating again. Tap the bookmark again to remove one.",
      "Go back from an exercise and your list of topics is still there. Press \"Clear list and filters\" to start fresh.",
      "Left an exercise half way? Back, Forward or a reload opens it at the same step. Open the same topic again and you can choose Continue or Start over.",
      "Inside an exercise, the quick buttons (Work, Family, Negotiation...) are a shortcut for a broad area. The Practice page is for a specific topic.",
      "Calibration uses a checked question bank, so it offers its own topics (Science, History, Vietnam...) without Generate.",
      "Nothing is generated until you press Generate.",
    ],
    tips: [
      "Not sure where to start? Leave every filter on \"Any\" for a mix of topics and modes.",
      "Your choice of topic or mode is remembered on this device.",
      "Saved topics are kept with your account, so they are on every device.",
    ],
  },
  {
    id: "levels",
    title: "Levels: Guided, Standard, Expert",
    href: "/reasoning",
    group: "basics",
    trains: "Each exercise type has three levels. Help is removed step by step as you improve.",
    benefits: [
      "You start with enough help to succeed, so you do not get lost or bored.",
      "You can see your progress when you move up.",
    ],
    howToPractice: [
      "Pick the level on the Setup screen. Each type remembers its own level.",
      "After 3 good results in a row, the app suggests the next level. After 2 hard ones, it suggests the level below.",
      "You always decide. \"Not now\" waits until you have a new run of results.",
    ],
    tips: [
      "Moving up is not a test. Use the level where you can think, not the level that looks impressive.",
      "Geopolitics topics have their own levels. See \"Geopolitics topics\" below.",
    ],
  },
  {
    id: "feedback",
    title: "Reading the feedback",
    href: "/exercise/history",
    group: "basics",
    trains: "The answer key shows what matched and what did not. The AI explains each row.",
    benefits: [
      "Right and wrong are decided by the app's own checks, so they are reliable.",
      "Each row gives a reason, a clue and a question for next time.",
    ],
    howToPractice: [
      "Why: the reason in a few short sentences, ending with a real-life example.",
      "Clue: the words in the text that point to it, and what kind of signal they are. Learn to notice these.",
      "Next time, ask: the question to ask yourself in a new situation. This is the part to remember.",
      "Take with you: one or two lessons for the next exercise.",
      "Analytical only: press \"Go deeper\" under a row for a longer explanation. It is saved, so it opens again in History for free.",
    ],
    tips: [
      "For judgment calls (weights, life situations), the app says \"close\" or \"different\", never \"wrong\". The model is a reference, not the only answer.",
      "Look first at what you missed. That is where you learn the most.",
    ],
  },
  {
    id: "analytical",
    title: "Analytical",
    href: "/exercise/analytical",
    group: "exercise",
    exerciseType: "analytical",
    trains: "Spotting weak reasoning in a text: what is a real problem, and what only looks like one.",
    benefits: [
      "You can read news, ads and plans without being fooled by a confident claim.",
      "You learn to say clearly why an argument is weak.",
      "\"Go deeper\" on any issue or trap: the core problem, more real-life cases, and a fairer way to say it.",
    ],
    howToPractice: [
      "Read the whole passage once before you tag anything.",
      "For each sentence, ask the four check questions. A \"yes\" tells you the tag.",
      "Weak Evidence: is there real evidence, or only a claim? Hidden Assumption: does it quietly assume something? Logical Fallacy: does the logic jump? Bias: does the writer see only one side?",
      "Some sentences are traps: they look suspicious but are fine. Mark them Valid Point.",
    ],
    levels: {
      guided: "A short passage. First pick the main claim, then check suggested sentences one by one. You know there are 4 issues and 2 traps.",
      standard: "Tap the sentences you think have a problem. You know how many issues there are.",
      expert: "A longer passage, free text selection, no hints. Some passages have no issues at all.",
    },
    tips: [
      "Words like never, always, only and proves are often warning signs.",
      "Finding the problem matters more than the exact tag name.",
    ],
  },
  {
    id: "systems",
    title: "Systems",
    href: "/exercise/systems",
    group: "exercise",
    exerciseType: "systems",
    trains: "Seeing how parts of a system affect each other, and tracing how a shock spreads.",
    benefits: [
      "You can predict side effects of a decision before they happen.",
      "You understand chains in the economy, at work and in your own money.",
    ],
    howToPractice: [
      "Name the main parts first, then draw the links between them with the right link type.",
      "When the shock comes, mark each part as not affected, directly affected or indirectly affected.",
      "For each indirect part, say which part the shock comes through. If you cannot name the path, check again.",
    ],
    levels: {
      guided: "Pick parts from a list. You see how many links to find, what each link type means, and how many parts the shock hits.",
      standard: "Pick parts from a list. Fewer hints; the link types are behind a toggle.",
      expert: "Name the parts yourself, no hints. Resilience and geopolitics tasks are available.",
    },
    tips: [
      "Direct means hit by the shock itself. Indirect means hit through another part.",
      "An arrow A -> B with \"depends on\" means A needs B.",
    ],
  },
  {
    id: "evaluative",
    title: "Evaluative",
    href: "/exercise/evaluative",
    group: "exercise",
    exerciseType: "evaluative",
    trains: "Comparing options fairly: choosing what matters and weighing it.",
    benefits: [
      "Better decisions on jobs, money and plans, with reasons you can explain.",
      "You notice criteria that people often forget.",
    ],
    howToPractice: [
      "Write or pick your own criteria before you see the app's. Then compare.",
      "Place or score each option honestly. Do not pick the winner first and fit the numbers to it.",
      "In the feedback, look at the hidden criteria and the gaps in weight.",
    ],
    levels: {
      guided: "A 2x2 board with two criteria. Pick criteria from a list.",
      standard: "A 2x2 board or a weighted table with more criteria.",
      expert: "Write criteria yourself. Dealbreaker and uncertainty tasks are available.",
    },
    tips: [
      "A dealbreaker rules an option out, however good it is on everything else.",
      "In uncertainty tasks, chances for one option must add up to 100%.",
    ],
  },
  {
    id: "judgment",
    title: "Life situations",
    href: "/exercise/judgment",
    group: "exercise",
    exerciseType: "judgment",
    trains: "Handling real-life situations well, read through three lenses: Think clearly, Understand people, Stay steady.",
    benefits: [
      "Calmer, wiser reactions at work, with family and with money.",
      "Practice for the IQ / EQ / AQ side of life: clear thinking, reading people, and staying steady under pressure.",
    ],
    howToPractice: [
      "Learn first: read the three ideas and answer the quick check.",
      "Look at the situation through each lens before you decide anything.",
      "Rank the ways to respond, best first, and write one sentence on why.",
      "From Standard, use \"My situation\" to practise on something that really happened to you.",
    ],
    levels: {
      guided: "A short everyday situation. One lens question at a time, with the answer shown. Rank 3 responses.",
      standard: "Work, money or family. All lens questions on one screen. Rank 4 responses. My situation is available.",
      expert: "High stakes and several people. Write each lens in your own words and your own response.",
    },
    tips: [
      "Choose the Vietnam setting for situations that fit Vietnamese work and family life.",
      "My situation is saved with your exercises. Leave out real names.",
    ],
  },
  {
    id: "strategy",
    title: "Strategic situations",
    href: "/exercise/strategy",
    group: "exercise",
    exerciseType: "strategy",
    trains: "Game theory in real stories: what each side wants, the best reply, and where they end up.",
    benefits: [
      "You understand price wars, negotiations and teamwork problems.",
      "You can predict an outcome by asking what each side's best reply is.",
      "With real cases, you see how the same games shape crises, arms races, sanctions and alliances.",
    ],
    howToPractice: [
      "Learn first: best reply, Nash equilibrium, dominant strategy.",
      "For each choice of the other side, find the best reply. Then look for the outcome where nobody wants to change.",
      "In the results, the underline method shows it: each side's best reply is underlined; where both are underlined is the equilibrium.",
      "Geopolitics: at setup, pick a real case (for example the Cuban Missile Crisis). You play a made-up story with the same game. At the end, \"What really happened\" shows the real case, with sources.",
      "Under the real case, open \"Use the cards\" to see the players today.",
    ],
    levels: {
      guided: "2 players, 2 choices each, with numbers. Answer best-reply questions, then predict.",
      standard: "No numbers: rank what each side prefers from the story, then predict.",
      expert: "One side has 3 choices. Also find dominant choices and outcomes better for both. Real cases keep 2 choices for each side at every level.",
    },
    tips: [
      "Do not pick the fairest or the best outcome for both. Pick the one where nobody wants to change alone.",
      "Some games have two equilibria. Pick both.",
      "A game is a simple model of a real case. Use it to see the pressure on each side, not to explain everything.",
    ],
  },
  {
    id: "reframe",
    title: "Reframe",
    href: "/exercise/reframe",
    group: "exercise",
    exerciseType: "reframe",
    trains: "Spotting thinking traps in a hard moment, and rewriting a thought in a fair, balanced way.",
    benefits: [
      "You notice when a thought is bigger or darker than the facts.",
      "You can calm a strong feeling by checking the thought behind it.",
      "You learn that balanced is not the same as positive.",
    ],
    howToPractice: [
      "Learn first: read the traps for this exercise and answer the quick check.",
      "Name the main feeling with a specific word, and say how strong it is.",
      "For each thought, ask the check question of each trap. A \"yes\" tells you the trap.",
      "Some thoughts are fair. Mark them Realistic, even when they are unpleasant.",
      "Rewrite one thought. Keep the true bad parts; drop what the facts do not show.",
      "From Standard, use \"My situation\" to practise on something that really happened to you.",
    ],
    levels: {
      guided: "An everyday situation. 4 thoughts, one at a time, with the answer shown. 4 traps to pick from. You know 3 are traps and 1 is realistic. Then choose the balanced thought from 3.",
      standard: "Work, family or money. 6 thoughts on one screen, 8 traps. You know how many are traps. Write the balanced thought yourself. My situation is available.",
      expert: "One inner monologue, all 10 traps, no hints. Some thoughts are fair, sometimes most of them. Write the facts for and against, then a balanced thought.",
    },
    tips: [
      "\"Everything will be fine\" is not a reframe. It has no evidence either.",
      "Finding a trap matters more than its exact name. Traps often overlap.",
      "This is thinking practice, not therapy. If you are in crisis, talk to a person you trust or a professional.",
    ],
  },
  {
    id: "calibration",
    title: "Calibration",
    href: "/exercise/calibration",
    group: "exercise",
    exerciseType: "calibration",
    trains: "Knowing how sure to be: your confidence should match how often you are right.",
    benefits: [
      "You notice when you are more sure than the facts allow.",
      "Better plans and bets, because you know how much to trust your own guess.",
      "You learn base rates: how rare something is matters as much as a test result.",
    ],
    howToPractice: [
      "Learn first: what \"80% sure\" means, overconfidence, and base rates.",
      "Do not look anything up. The point is to see what you really know.",
      "For two-answer questions, pick one and say how sure you are. 50% means a pure guess.",
      "For ranges, give a low and a high number. Make the range wide enough that you are really 80% (or 90%) sure.",
      "For base-rate problems, think \"out of 10,000 people\": how many have it, and how many test positive by mistake?",
      "Look at History over time. One exercise has only a few questions.",
    ],
    levels: {
      guided: "8 questions with two answers, plus 1 base-rate problem with an \"out of 10,000\" table.",
      standard: "4 two-answer questions, 4 ranges you are 80% sure of, and 2 base-rate problems. The tips and tables are behind a button.",
      expert: "7 ranges you are 90% sure of and 3 base-rate problems, one with two tests in a row. No tips.",
    },
    tips: [
      "Most people's ranges are too narrow. Start from a number that is surely too low, then one that is surely too high.",
      "A positive test for something rare is often still a false alarm.",
      "The answers come from checked sources and exact math, not from the AI.",
    ],
  },
  {
    id: "geopolitics",
    title: "Geopolitics topics",
    href: "/reasoning",
    group: "exercise",
    trains: "Reading world events like an analyst: whose view a text takes, who is left out, and how one event looks through different lenses.",
    benefits: [
      "You can tell when a news story or policy brief speaks for one side.",
      "You notice the countries and people a story leaves out.",
      "You learn four lenses that experts use: Realist, Liberal, Constructivist and Political economy.",
    ],
    howToPractice: [
      "Pick a geopolitics topic (for example \"US-China strategic competition\") in Analytical, Systems or Evaluative.",
      "Analytical: Learn first, then tag the brief. Then say whose view it is, who is missing, and read it through the four lenses.",
      "Systems: map the system from one side. From Standard, predict how the other side sees the shock before you see it.",
      "Evaluative: weigh options by the interests of each side, not by abstract qualities.",
      "AI-written briefs may contain made-up details. Learn to read them; do not learn facts from them.",
    ],
    levels: {
      guided: "Analytical: a short brief with 2 issues and 1 trap; pick the viewpoint and the missing actors from lists. Systems: one side's view only. Evaluative: a 2x2 board of two sides' interests.",
      standard: "Analytical: all 4 issue types and 2 traps; you know how many issues there are; pick from lists. Systems: predict the other side, then compare. Evaluative: a scoring table with criteria to pick from.",
      expert: "Analytical: the full brief, free selection, no hints; write the viewpoint before you pick it, and write each lens yourself. Systems and Evaluative: no hints.",
    },
    tips: [
      "Ask \"who would write it this way?\" before you tag anything.",
      "A trap can sound one-sided and still be a well-supported fact.",
      "For real practice, paste an article from a think tank or newspaper (Practice > New exercise > Specific scenario).",
      "To see the places and sea routes on a map, open the Geo Lab.",
    ],
  },
  {
    id: "tracks",
    title: "Learning tracks",
    href: "/tracks",
    group: "tool",
    trains: "Short paths through economics, finance and geopolitics, using the exercises above.",
    benefits: [
      "You learn how money, prices and trade work, one topic at a time.",
      "You never have to think about what to practise next.",
    ],
    howToPractice: [
      "Start from the Learning track card on the Practice page. Press Start for the next step.",
      "The topic is filled in. Choose your level and press Generate.",
      "A step is done when you finish an exercise on that topic. One step a day is plenty.",
      "If you started a step, the button says Continue. To drop that exercise and start fresh, tap the small bin icon next to it.",
    ],
    tips: ["Each track has a simulator. Try it after a few steps to see the numbers behind the ideas."],
  },
  {
    id: "simulators",
    title: "Simulators",
    href: "/simulators",
    group: "tool",
    trains: "Playing with real numbers: loan payments, savings against inflation, and import prices.",
    benefits: [
      "A feel for how interest rates, inflation, exchange rates and taxes change your money.",
      "These are exact formulas, not forecasts, so you can trust the numbers.",
    ],
    howToPractice: [
      "Answer the \"Guess first\" question before you touch the sliders.",
      "After you answer, the sliders jump to that case. Check the numbers.",
      "Then move one slider at a time and watch what changes.",
    ],
    tips: ["Open \"Show the numbers\" under a chart to see every value."],
  },
  {
    id: "geo-lab",
    title: "Geo Lab",
    href: "/geo",
    group: "tool",
    trains: "Knowing where key places are on the map, why some sea routes matter so much, what the main players want, and how real crises unfolded.",
    benefits: [
      "World news makes more sense when you can picture the place.",
      "You learn which countries depend on which sea routes, from checked sources.",
      "A short daily quiz builds your mental map, a little each day.",
    ],
    howToPractice: [
      "Open it from the Geo Lab card on the Practice page, or from the geopolitics track.",
      "Daily map quiz: 5 places, about 2 minutes. Tap where each place is. The question tells you how close you need to be.",
      "Your tap puts a mark on the map. Tap again to move it. Press \"Check\" when you are sure.",
      "Not sure? Press \"I don't know\" to see the answer. That is fine.",
      "Places you miss come back after 1 day, then after 3 days and 7 days.",
      "Close the strait: pick a chokepoint and imagine it is closed. Guess which countries are hit hardest and how ships get around it. Then see the answer on the map.",
      "Every answer links to its source. The AI adds a short coach's note, using only those facts.",
      "Country cards: open a card to see what a country or group says it wants, its red lines, strengths, weak spots and groups.",
      "Geopolitical games: pick a real case to play it as a game in Strategic situations.",
      "Timelines: follow a real crisis or negotiation one event at a time. At two moments, choose what you would do and say how sure you are. Then see what really happened.",
      "At the end of a timeline, put events in order and find the \"off-ramp\": the step that calmed the crisis.",
    ],
    tips: [
      "Guess before you look. A wrong guess that you then fix is easier to remember.",
      "A sea only counts if you tap on water.",
      "On a phone, pinch to zoom in to check your mark. Drag to move the map. You can also use the + and - buttons.",
      "On a timeline, \"close\" or \"different\" is not right or wrong: history has no single right answer. Compare your confidence with how often you were close.",
      "Open \"Show the data\" to see every number and its source.",
      "The map shows country shapes only. It does not name disputed areas.",
      "On the cards, \"Says it wants\" and \"Red lines\" are each side's own words. Read them as claims, not as facts about what will happen.",
    ],
  },
  {
    id: "terms",
    title: "My terms",
    href: "/terms",
    group: "tool",
    trains: "Every idea from \"Learn first\" in your exercises, in one place.",
    benefits: ["A quick review list before your next exercise."],
    howToPractice: [
      "Open it from History > My terms.",
      "Read a few terms before you start an exercise of the same type.",
    ],
    tips: ["Try to explain a term in your own words before you read its meaning."],
  },
];

export const HANDBOOK_GROUPS: { id: HandbookEntry["group"]; title: string }[] = [
  { id: "basics", title: "Basics" },
  { id: "exercise", title: "Exercises" },
  { id: "tool", title: "Tools" },
];
