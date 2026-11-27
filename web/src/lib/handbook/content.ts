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
    "Do the step under \"Next up\" on the Today page: one step a day is enough.",
    "Read the feedback slowly. The most useful part is \"Next time, ask\": copy that question into your head, not the answer.",
    "Write one line in \"What will you take away?\" at the end. It makes the lesson stick.",
    "Then write where you will use it this week. A week later, Today asks if you did.",
    "When the app suggests a higher level, try it. If it feels too hard, go back - that is normal.",
    "The top bar has four groups: Practice (do exercises), Labs (maps, simulators, briefs), Memory (past exercises, terms, forecasts) and Guide (this Handbook, Settings). The row under it shows the pages of the group you are in.",
    "Some steps show a short hint. It shows in full 3 times, then in a few words, then it goes away. Settings > Hints can show them again.",
    "After Finish, \"Where this went\" shows when the exercise comes back: your plan on Today in 7 days, a redo after 30 days.",
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
      "Learn first: read the ideas, then press \"Check yourself\". The ideas hide while you answer, so you practise remembering them. Stuck? Tap \"Show the ideas again\".",
      "Do the work. Your answers save by themselves, so you can stop and come back from Today > In progress.",
      "Do not want to finish one? Tap the small bin icon next to it in Continue (on a computer, it shows when you point at the row).",
      "Before feedback, set how sure you are. Later, compare it with your result.",
      "Finish with one takeaway line and, if you like, where you will use it this week. Memory > Past exercises keeps everything.",
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
    trains: "Three ways to start, from Today > New exercise: type what is on your mind, pick a suggested topic, or open an exercise from the full list.",
    benefits: [
      "You never get stuck on a blank topic box.",
      "Every topic ends up in the exercise that trains it best.",
    ],
    howToPractice: [
      "Type what you want to think about: a decision, a claim, a news story, or paste a whole article. Press Start.",
      "The AI picks the mode that fits your text and opens it with your text filled in.",
      "Want a mode yourself? Press \"change\" and pick one. Then Start goes straight into it, with no AI step.",
      "A long text (120 words or more) in Analytical is analysed as it is. A shorter one becomes the base of a new passage.",
      "Strategic situations and Calibration start from a topic, not from your own text.",
      "Or pick one of the suggested topics. The first time you open the page, you get a set of 10 (5 show, press \"more\" for the rest). Press \"new set\" for others. Topics you have already practised do not come back.",
      "Under \"change\" you can also choose an area and a domain. Then press \"get topics\" for topics that fit.",
      "Tap a topic to open the exercise with it filled in. You still choose your level there.",
      "Like a topic? Tap the bookmark next to it. Saved topics show under \"Saved topics\", so you can start them later. Tap the bookmark again to remove one.",
      "At the bottom, \"All exercises\" lists every exercise in three groups: Reason well, Systems and games, People and yourself. Tap one to open it with no topic yet.",
      "On Today, \"All exercises\" under New exercise jumps straight to that list.",
      "Go back from an exercise and your text, mode and topics are still there.",
      "Left an exercise half way? Back, Forward or a reload opens it at the same step. Open the same topic again and you can choose Continue or Start over.",
      "Inside an exercise, the quick buttons (Work, Family, Negotiation...) are a shortcut for a broad area. New exercise is for a specific topic.",
      "Calibration uses a checked question bank, so it offers its own topics (Science, History, Vietnam...) without the AI.",
    ],
    tips: [
      "Not sure where to start? Leave the mode on \"Picked for you\" and the area on \"Any\".",
      "Saved topics are kept with your account, so they are on every device.",
      "Stories are made up. If your topic names a real person or company, the AI keeps to well-known facts about them and gives made-up details to made-up people.",
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
      "Analytical only: press \"Go deeper\" under a row for a longer explanation. It is saved, so it opens again in Past exercises for free.",
      "In Past exercises, tap a day on the activity grid to see what you did that day: type, level, score and the main miss. Tap a row to open its review.",
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
      "You take each issue into real life: how to spot it in what you read, and how to question it politely when someone argues that way.",
    ],
    howToPractice: [
      "Read the whole passage once before you tag anything.",
      "For each sentence, ask the four check questions. A \"yes\" tells you the tag.",
      "Weak Evidence: is there real evidence, or only a claim? Hidden Assumption: does it quietly assume something? Logical Fallacy: does the logic jump? Bias: does the writer see only one side?",
      "Some sentences are traps: they look suspicious but are fine. Mark them Valid Point.",
      "Each sentence holds at most one issue or trap, so one tag per sentence is enough.",
      "Your own text can have fewer than 4 issues, or none. The AI only lists problems that are really there.",
      "At the end, \"Take with you\" has a card for 1 or 2 issue types. An issue you missed comes first. Each card shows how to spot it, what to ask, what to say to someone else, the same issue in another part of life, and one thing to try this week. A passage with no issues gets a \"Sound reasoning\" card.",
    ],
    levels: {
      guided: "A short passage. First pick the main claim, then check suggested sentences one by one. You know there are 4 issues and 2 traps.",
      standard: "Tap the sentences you think have a problem. You know how many issues there are.",
      expert: "A longer passage, free text selection, no hints. Some passages have no issues at all.",
    },
    tips: [
      "Words like never, always and only can be a warning sign, but check the reasoning. Sound sentences use them too, and many problems use none.",
      "Finding the problem matters more than the exact tag name.",
      "Tagging every sentence does not help. A fine sentence tagged as a problem counts against you.",
      "When someone argues this way, ask about the facts. Do not call it a fallacy.",
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
      "You take systems ideas into real life: ripple effects, hidden dependencies, trade-offs, risks, feedback loops and single points of failure.",
      "You learn the common loop patterns (like \"Fixes that fail\") and spot them in your own life.",
    ],
    howToPractice: [
      "Name the main parts first. Then link them: tap a part, tap the part it affects, and choose \"goes up\" or \"goes down\".",
      "Look for loops: a chain of links that comes back to its start. The app shows each loop you close.",
      "When the shock comes, mark each part as not affected, directly affected or indirectly affected.",
      "For each indirect part, say which part the shock comes through. If you cannot name the path, check again.",
      "Look ahead: pick the loop that drives the situation, say what happens in 5 years, and suggest a better fix.",
      "Your map does not need to match the model. A link the model left out still counts if the AI finds it fair.",
      "Every extra link you draw counts in \"Sound links\". Only the fair ones count as sound, so draw the links you believe.",
      "A link with the wrong sign or the wrong direction counts half.",
      "At the end, you see the pattern behind the scenario. Write one place where you meet it in your own life.",
      "At the end, \"Take with you\" has a card for 1 or 2 systems ideas. What you missed comes first. Each card shows how to spot it, what to ask, how to help someone else, the same idea in another part of life, and one thing to try this week.",
    ],
    levels: {
      guided: "Pick parts from a list. You see how many links to find, what \"increases\" and \"decreases\" mean, and how many parts the shock hits.",
      standard: "Pick parts from a list. Fewer hints; the link types are behind a toggle.",
      expert: "Name the parts yourself, no hints. Resilience and geopolitics tasks are available.",
    },
    tips: [
      "Direct means hit by the shock itself. Indirect means hit through another part.",
      "A -> B \"increases\" means: when A goes up, B goes up. \"Decreases\" means: when A goes up, B goes down.",
      "A loop with no \"decreases\", or an even number of them, is reinforcing: a change keeps growing. An odd number makes it balancing: a change settles.",
      "A good fix breaks or weakens the loop. A weak fix only eases the symptom for a while.",
      "\"Affected nodes right\" only counts parts that you or the model mark as affected. Leaving everything as \"not affected\" does not score.",
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
      "You take decision ideas into real life: the two criteria that matter, weights, hidden criteria, dealbreakers, expected value and who else is affected.",
    ],
    howToPractice: [
      "Write or pick your own criteria before you see the app's. Then compare.",
      "Place or score each option honestly. Do not pick the winner first and fit the numbers to it.",
      "In the feedback, look at the hidden criteria and the gaps in weight.",
      "On a 2x2 board, an option with one of the two axes right counts as half right.",
      "At the end, \"Take with you\" has a card for 1 or 2 decision ideas, picked from what you did. Each card shows how to spot it, what to ask, how to help someone else, the same idea in another part of life, and one thing to try this week.",
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
      "You take each lens into real life: when you need it, what to do, and how to help a friend use it.",
    ],
    howToPractice: [
      "Learn first: read the three ideas and answer the quick check.",
      "Look at the situation through each lens before you decide anything.",
      "Rank the ways to respond, best first, and write one sentence on why.",
      "From Standard, use \"My situation\" to practise on something that really happened to you.",
      "Your order is compared pair by pair: \"2/3 pairs like the expert\" means you put 2 of the 3 pairs in the same order.",
      "At the end, \"Take with you\" has a card for 1 or 2 lenses. A lens you read differently comes first. Each card shows when you need it, what to ask, how to help someone else, the same lens in another part of life, and one thing to try this week.",
    ],
    levels: {
      guided: "A short everyday situation. One lens question at a time, with the answer shown. Rank 3 responses.",
      standard: "Work, money or family. All lens questions on one screen. Rank 4 responses. My situation is available.",
      expert: "High stakes and several people. Write each lens in your own words and your own response.",
    },
    tips: [
      "Choose the Vietnam setting for situations that fit Vietnamese work and family life.",
      "My situation is saved with your exercises. Leave out real names.",
      "A lens shows how to see the situation, not what to do. The choice is still yours.",
      "This is thinking practice, not therapy. If you are in crisis, talk to a person you trust or a professional.",
    ],
  },
  {
    id: "tricky",
    title: "Tricky questions",
    href: "/exercise/tricky",
    group: "exercise",
    exerciseType: "tricky",
    trains: "Answering a loaded question wisely, when any simple answer looks bad.",
    benefits: [
      "You stay calm when your boss asks \"A or B?\" or \"Who is better?\".",
      "You give a real view without hurting anyone.",
      "You learn four steps you can use in meetings, interviews and family talks.",
    ],
    howToPractice: [
      "Learn first: read the three ideas and answer the quick check.",
      "Pick who asks: your boss, a colleague, an interviewer, a client, family or a friend.",
      "Read the setting. Then answer the first question.",
      "The person pushes back with a harder follow-up. Answer again.",
      "Use the four steps: ask what matters, give a clear view, be fair to everyone, hand the decision back.",
      "If the question is about someone's personality or private life, say no softly and bring it back to the work.",
      "In the results, each question shows the trap, your answer and a stronger answer.",
    ],
    levels: {
      guided: "2 questions. Pick the best of 3 answers. The four steps are shown.",
      standard: "2 questions. Write your own answers. The four steps are shown. My situation is available.",
      expert: "3 questions with more pressure, often with others listening. Write your answers. No step hints.",
    },
    tips: [
      "Do not just refuse. \"I can't answer\" looks like a dodge.",
      "Do not make yourself small (\"my view does not matter\"). They asked because they want your view.",
      "Choose by the needs of the work, not by who you like.",
      "Use My situation for a question you really got. Leave out real names.",
    ],
  },
  {
    id: "humor",
    title: "Light replies",
    href: "/exercise/humor",
    group: "exercise",
    exerciseType: "humor",
    trains: "Replying with light, kind humor in everyday moments, and knowing when not to joke.",
    benefits: [
      "You can ease an awkward moment instead of freezing or hitting back.",
      "A tease or a small mistake stops feeling like a threat.",
      "People feel relaxed around you, at work and with friends.",
      "You learn to spot a serious moment, where a joke would hurt.",
    ],
    howToPractice: [
      "Learn first: read the three moves and answer the quick check.",
      "Pick where: at work, team chat, friends, family, someone new or online.",
      "Read each moment. Then pick or write what you would say.",
      "Use the four checks: kind, fits the room, short, a light twist.",
      "From Standard, one moment is serious. There, the best reply is warm and has no joke. Nobody tells you which one.",
      "In the results, each moment shows the common mistake, your reply and a better one.",
    ],
    levels: {
      guided: "3 easy moments. Pick the best of 3 replies. The four checks are shown.",
      standard: "3 moments, one of them serious. Write your own replies. The four checks are shown. My situation is available.",
      expert: "4 harder moments, one of them serious, often with people watching. Write your replies. No hints.",
    },
    tips: [
      "Laughing at yourself is the safest joke. Laughing at someone else is the riskiest.",
      "Short wins. If you need to explain the joke, drop it.",
      "Agree with a tease and make it bigger. It shows you are relaxed.",
      "You do not need to be funny every time. A warm, plain reply is never wrong.",
      "Use My situation for a moment you really had. Leave out real names.",
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
      "You take game ideas into real life: best replies, where things settle, dominant choices, outcomes better for both, and games that can settle two ways.",
    ],
    howToPractice: [
      "Learn first: best reply, Nash equilibrium, dominant strategy.",
      "For each choice of the other side, find the best reply. Then look for the outcome where nobody wants to change.",
      "In the results, each side's best reply is in bold; where both are bold is the equilibrium.",
      "Geopolitics: at setup, pick a real case (for example the Cuban Missile Crisis). You play a made-up story with the same game. At the end, \"What really happened\" shows the real case, with sources.",
      "Under the real case, open \"Use the cards\" to see the players today.",
      "When you rank outcomes, the score counts pairs: \"5 of 6 pairs\" in the same order as the model is 83%.",
      "At the end, \"Take with you\" has a card for 1 or 2 game ideas. What you missed comes first. Each card shows how to spot it, what to ask, how to help someone else, the same game in another part of life, and one thing to try this week.",
    ],
    levels: {
      guided: "2 players, 2 choices each, with numbers. Answer best-reply questions, then predict.",
      standard: "No numbers: rank what each side prefers from the story, then predict.",
      expert: "One side has 3 choices. Also find dominant choices and outcomes better for both. Real cases keep 2 choices for each side at every level.",
    },
    tips: [
      "Do not pick the fairest or the best outcome for both. Pick the one where nobody wants to change alone.",
      "Some games have two equilibria. Pick both. Finding one of the two counts as partly right.",
      "A game is a simple model of a real case. Use it to see the pressure on each side, not to explain everything.",
      "With 2 choices each, the game changes each time: prisoner's dilemma, coordination, chicken or stag hunt.",
      "The story gives facts, such as prices, costs and rules, not what happens. Work out each outcome yourself.",
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
      "You take each trap into real life: how to spot it, what to do, and what to say when a friend falls into it.",
    ],
    howToPractice: [
      "Learn first: read the traps for this exercise and answer the quick check.",
      "Name the main feeling with a specific word, and say how strong it is.",
      "For each thought, ask the check question of each trap. A \"yes\" tells you the trap.",
      "Some thoughts are fair. Mark them Realistic, even when they are unpleasant.",
      "Rewrite one thought. Keep the true bad parts; drop what the facts do not show.",
      "From Standard, use \"My situation\" to practise on something that really happened to you.",
      "At the end, \"Take with you\" has a card for 1 or 2 traps. A trap you missed comes first. Each card shows how to spot it, what to ask yourself, what to say to someone else, the same trap in another part of life, and one thing to try this week.",
    ],
    levels: {
      guided: "An everyday situation. 4 thoughts, one at a time, with the answer shown. 4 traps to pick from. You know 3 are traps and 1 is realistic. Then choose the balanced thought from 3.",
      standard: "Work, family or money. 6 thoughts on one screen, 8 traps. You know how many are traps. Write the balanced thought yourself. My situation is available.",
      expert: "One inner monologue, all 10 traps, no hints. Some thoughts are fair, sometimes most of them. Write the facts for and against, then a balanced thought.",
    },
    tips: [
      "\"Everything will be fine\" is not a reframe. It has no evidence either.",
      "Finding a trap matters more than its exact name. Traps often overlap.",
      "When a friend falls into a trap, ask about the facts. Do not tell them the name of the trap.",
      "The thought you rewrite is always a trap. So once you see it, your trap answers are locked.",
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
      "Look at Past exercises over time. One exercise has only a few questions.",
      "A question you saw in an earlier exercise is marked \"Seen before\". It still counts in the exercise, but not in your Past exercises chart: you may remember the answer.",
      "A base-rate answer counts as close enough within half of the true value, from 1 to 5 points. For a rare case, being 3 times too high is not close.",
      "At the end, \"Take with you\" has a card for 1 or 2 ideas, picked from your results: overconfidence, wide enough ranges, underconfidence, base rates, or keeping score.",
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
      "One exercise has only a few questions. So a level tip looks at your last 3 exercises together (2 for a lower level).",
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
      "For real practice, paste an article from a think tank or newspaper (Today > New exercise: paste it and press Start).",
      "To see the places and sea routes on a map, open the Geo Lab.",
    ],
  },
  {
    id: "tracks",
    title: "Learning tracks",
    href: "/tracks",
    group: "tool",
    trains: "A path of six exercises at a time, made from your own results: new topics, your weak spots, and your own life.",
    benefits: [
      "You never have to think about what to practise next.",
      "Half of each track is new. The other half fixes what you miss most and uses it in real life.",
      "You learn how money, prices, trade, small businesses, the news and US politics work, one topic at a time.",
    ],
    howToPractice: [
      "\"Next up\" on the Today page shows the next step of your track. Press Start.",
      "A track has six steps, in this order: new, fix, new, redo, new, your own.",
      "New: a topic you have not done yet. Most come from the topic packs on Practice > Tracks.",
      "Fix: a new topic that tests a skill you often miss. The small line names it, for example \"fix · Missing a connection\".",
      "Redo: an old exercise you found hard, done again on the same text. Past exercises shows both tries. With nothing to redo, this is a second fix.",
      "Your own: a situation from your own life. Pick one of the ideas shown, or skip if nothing fits this week.",
      "Your first track has no weak spots yet: five new steps of different types, then your own.",
      "A step is done when you finish the exercise you started from it. Choose your level and press Generate as usual.",
      "\"skip\" passes a step for good. When every step is done or skipped, the next track is made for you.",
      "Then Today shows \"Last track\" once: how many steps you did, and each weak spot it aimed at, before and during the track, for example \"missed 4 of 7 before → 1 of 5 in this track\".",
      "If your results suggest a new level for a type, the recap offers it. One tap switches. Press \"ok\" to hide the recap.",
      "\"cleared\" next to a weak spot means you stayed below the weak-spot line in two tracks in a row. One good track is too small a test.",
      "Practice > Tracks shows your track's six steps, and your past tracks. Tap a past track to see its recap again.",
      "If you started a step, the button says Continue. To drop that exercise, tap the small bin icon next to it.",
      "Not today? Press \"not today\" and the step waits until tomorrow. Press \"show\" to bring it back.",
      "Nothing done for 14 days? \"close and make a new one\" starts a fresh track.",
      "Topic packs (Practice > Tracks, at the bottom) are hand-made paths through one subject. Your track takes its new topics from them first. Steps you do there do not count in your track.",
    ],
    tips: [
      "Some tracks have a simulator. Try it after a few steps to see the numbers behind the ideas.",
      "Tracks about real events (Vietnam's economy, US politics) teach how the system works. The AI is told not to make up numbers or quotes, but a story can still be simplified. Check key facts in a trusted source.",
      "These tracks train how you reason about a topic, not which side you take.",
    ],
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
      "Open it from Labs > Simulators, or from a track that has one.",
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
      "Open it from Labs > Geo Lab, the Daily map quiz row on the Today page, or the geopolitics track.",
      "Daily map quiz: 5 places, about 2 minutes. Tap where each place is. The question tells you how close you need to be.",
      "Your tap puts a mark on the map. Tap again to move it. Press \"Check\" when you are sure.",
      "Not sure? Press \"I don't know\" to see the answer. That is fine.",
      "After each answer, a short note says why the place matters today, with a link to its source and the date it was checked.",
      "The map also shows linked places in grey, such as the sea behind a strait. Learn them as a group.",
      "Once you find a place by its name, later it comes back as a clue: the note, without the name. Now you learn why it matters, not only where it is.",
      "Places named in your recent exercises come first, marked \"In your exercises\".",
      "\"Your map\" on the Geo Lab page shows every place: a dark dot if you know it, a ring if you need to review it, a grey dot if it is new.",
      "Places you miss come back after 1 day, then after 3 days and 7 days.",
      "A quiz asks at most 3 of these again. The rest wait for the next quiz, so you always get at least 2 new places.",
      "Close the strait: pick a chokepoint and imagine it is closed. Guess which countries are hit hardest and how ships get around it. Then see the answer on the map.",
      "Every answer links to its source. The AI adds a short coach's note, using only those facts.",
      "Country cards: open a card to see what a country or group says it wants, its red lines, strengths, weak spots and groups.",
      "Geopolitical games: pick a real case to play it as a game in Strategic situations.",
      "Timelines: follow a real crisis or negotiation one event at a time. At two moments, choose what you would do and say how sure you are. Then see what really happened.",
      "At the end of a timeline, put events in order and find the \"off-ramp\": the step that calmed the crisis.",
    ],
    tips: [
      "The quiz only asks about places that matter in today's news: key sea routes, seas and islands in disputes, and the capitals of the main players.",
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
    trains: "Every idea from \"Learn first\" in your exercises, in one place, and a short review so you keep them.",
    benefits: [
      "A quick review list before your next exercise.",
      "You remember ideas for months, not days, because you recall them just before you forget.",
    ],
    howToPractice: [
      "Open it from Memory > My terms.",
      "When terms are due, a \"Review terms\" row shows on Today. It also shows as a button on My terms.",
      "A review has up to 5 terms, about 2 minutes. You see the meaning and an example with the term hidden. Pick the right term.",
      "With fewer than 4 terms, you see the term instead. Say its meaning in your head, press \"Show the meaning\", then say if you knew it.",
      "A new term comes back 1 day after you meet it. Each right answer waits longer: 3 days, 7 days, then 21 days. After that it is \"Known\".",
      "A wrong answer starts the term again at 1 day. That is normal: it is how memory works.",
      "Each card shows \"Due\", \"Learning\" or \"Known\".",
      "Use Anki too? Press \"Export for Anki\" to save all your terms as a file. In Claude Code, run /anki-import with that file and the deck \"cogi::terms\".",
      "Export again any time. Cards already in the deck are skipped.",
    ],
    tips: [
      "Try to remember the term before you look at the choices.",
      "Try to explain a term in your own words before you read its meaning.",
    ],
  },
  {
    id: "use-it",
    title: "Use it in real life",
    href: "/",
    group: "tool",
    trains: "Taking one idea from an exercise into your real week, and checking that you did.",
    benefits: [
      "Thinking skills only help when you use them outside the app.",
      "A small plan with a check a week later is much more likely to happen.",
    ],
    howToPractice: [
      "At the end of an exercise, fill in \"Where will you use this this week?\". Name a real moment: a meeting, a talk, a decision.",
      "It is optional. Leave it empty and nothing is asked later.",
      "Seven days later, Today shows \"Did you use it?\" with your plan.",
      "Pick yes, partly or no. You can add one line about what happened. Press save.",
      "Your plan and your answer stay with the exercise in Past exercises.",
      "A question you do not answer goes away after three weeks.",
    ],
    tips: [
      "Make the plan small and exact: \"In Friday's review, ask what else could explain the drop.\"",
      "\"No\" is a useful answer. It tells you the plan was too big or too vague.",
    ],
  },
  {
    id: "weak-spots",
    title: "Your weak spots",
    href: "/",
    group: "tool",
    trains: "Practising the mistakes you make most often, not random ones.",
    benefits: [
      "You see your own pattern, for example a kind of issue you often miss.",
      "Practice goes where it helps most.",
    ],
    howToPractice: [
      "A weak spot is a thing you missed at least twice, and in at least a third of your chances.",
      "The app counts them from your last 40 finished exercises, by itself, with no AI.",
      "Your track aims at the top one or two. Those steps say \"fix\" and name the skill.",
      "A fix exercise opens with \"Focus\" at the top. It tests that skill more than once.",
      "Calibration spots are not used for fix steps, because its questions come from a fixed bank.",
    ],
    tips: [
      "A spot leaves the list when you stop missing it. That is the goal.",
      "Work on one spot for a week before you move to the next.",
    ],
  },
  {
    id: "redo",
    title: "Do it again after 30 days",
    href: "/exercise/history",
    group: "tool",
    trains: "Seeing your progress by doing an old exercise again.",
    benefits: [
      "You compare your first try and your new try on the same text.",
      "A better second result is real proof that you improved.",
    ],
    howToPractice: [
      "Thirty days after you finish an exercise, you can do it again.",
      "Your track may include a redo step: an old exercise you found hard, of a type it is fixing.",
      "Or open any old exercise in Past exercises and tap \"redo\" at the top of its review.",
      "You get the same text and questions, with your old answers removed.",
      "When you finish, press \"Compare with first try\". Past exercises shows both results next to each other.",
      "Tap \"show the first try\" to read your old answers under the new ones.",
      "Each exercise can be redone once. A redo is marked \"Redo\" in Past exercises.",
    ],
    tips: [
      "Do not look at your old answers before the redo. The surprise is the point.",
      "A lower score can happen. Read which part changed, not only the number.",
    ],
  },
  {
    id: "quick",
    title: "5-minute question",
    href: "/quick",
    group: "tool",
    trains: "Keeping the habit on a busy day, and saying your reasoning out loud in English.",
    benefits: [
      "One short answer still counts for your streak.",
      "Speaking trains you to give a claim and a reason in a clear order.",
    ],
    howToPractice: [
      "Open it from Today > 5-minute question.",
      "Read the short situation and the question. Each day tests a different skill, such as evidence, causes or trade-offs.",
      "Type two to four sentences and press \"Get feedback\".",
      "Or tap \"Speak\" and answer out loud in English, up to 90 seconds. Tap \"Stop\" when you finish.",
      "The feedback has three parts: what was strong, what was missing, and a question to ask next time.",
      "A spoken answer also gets \"How you said it\": what was clear, and one thing to try next time.",
      "The app shows the words it heard. The recording is not kept.",
      "The answer is saved to Past exercises. Tap \"another question\" for a different one.",
    ],
    tips: [
      "Say your answer first, then your reason: \"I think X, because Y.\"",
      "The feedback is about your thinking and your order of ideas, not your accent.",
      "The first time you tap Speak, the browser asks to use the microphone. Allow it.",
    ],
  },
  {
    id: "forecasts",
    title: "Forecasts",
    href: "/forecasts",
    group: "tool",
    trains: "Calibration with real life: how often the things you call \"70% likely\" really happen.",
    benefits: [
      "You learn if you are too sure or not sure enough about real events.",
      "A written forecast cannot be changed later, so you get an honest record.",
    ],
    howToPractice: [
      "Open it from Memory > Forecasts.",
      "Write something that will be clearly true or false on a day, for example \"The release ships by 30 November\".",
      "Set how likely it is, from 1% to 99%, and the day you will know.",
      "When that day comes, Today shows \"Forecast due\". Tap \"it happened\" or \"it did not\".",
      "\"Your record\" shows your Brier score. 0 is perfect. 0.25 is what you get by always saying 50%.",
      "The chart shows the chance you gave against how often it happened. Dots near the dashed line are good.",
      "You can delete a forecast that is still waiting. A resolved one stays.",
    ],
    tips: [
      "Write forecasts that have a clear yes or no. \"The project goes well\" cannot be checked.",
      "Use numbers other than 50%. A real guess teaches more.",
      "You need about 10 resolved forecasts before the chart means much.",
    ],
  },
  {
    id: "monthly-review",
    title: "Monthly review",
    href: "/exercise/history",
    group: "tool",
    trains: "Seeing the long picture: which skills went up this month and which stayed the same.",
    benefits: [
      "One exercise says little. A month shows a trend.",
      "You get one clear thing to work on next month.",
    ],
    howToPractice: [
      "From the first day of a month, Past exercises shows \"Write review for\" the month before. You need at least 3 finished exercises in that month.",
      "Press the button. The app counts your results, and the AI puts them into words.",
      "The table shows each exercise type: how many you did, your score out of 100, the month before, and the trend.",
      "\"Went up\" and \"Stayed the same\" name the types. \"Next month\" gives one thing to practise.",
      "Reviews are saved. Tap a month name to read an older one.",
    ],
    tips: [
      "The numbers come from the app's own checks, not from the AI.",
      "A type with only one or two exercises can jump a lot. Trust trends with more exercises behind them.",
    ],
  },
  {
    id: "briefs",
    title: "Briefs",
    href: "/briefs",
    group: "tool",
    trains: "Background knowledge on one big news story, with more than one way to see it.",
    benefits: [
      "You understand a current story in about five minutes.",
      "You practise holding two or three views before you choose one.",
    ],
    howToPractice: [
      "Open it from Labs > Briefs.",
      "Pick an area: World, Economy, Technology or Vietnam. Press \"New brief\".",
      "The AI searches the web for a big story of the last 30 days and writes the brief. This takes up to a minute.",
      "Read the background, the key facts and the ways to see it. Each fact names its source.",
      "Answer the three check questions. Then use \"Practise it\" to start an exercise on the same story.",
      "You can make 4 briefs a month. Old briefs stay in the list.",
    ],
    tips: [
      "A brief is written by AI from a web search. Open the links under \"Sources\" to check anything important.",
      "The brief does not say which view is right. Decide after the exercise, not before.",
    ],
  },
];

export const HANDBOOK_GROUPS: { id: HandbookEntry["group"]; title: string }[] = [
  { id: "basics", title: "Basics" },
  { id: "exercise", title: "Exercises" },
  { id: "tool", title: "Tools" },
];
