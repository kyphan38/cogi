export type GuideLink = { label: string; href: string };

export type GuideSubsection = {
  title: string;
  bullets: string[];
};

export type GuideSection = {
  id: string;
  title: string;
  summary: string;
  bullets: string[];
  links?: GuideLink[];
  subsections?: GuideSubsection[];
};

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "welcome",
    title: "Welcome to Cogi",
    summary:
      "Cogi is a thinking-practice app. You work through short exercises that train different reasoning styles, compare your judgment with AI feedback, reflect in a journal, and commit to one real-world action.",
    bullets: [
      "Sign in with Google; your completed exercises, settings, and backups are tied to that account in the cloud (Firestore).",
      "Each exercise follows a similar rhythm: do the core task, rate your confidence, read an AI perspective, answer journal prompts, then write one action you will take outside the app.",
      "The goal is calibration and habit, not a score on a test. You are practicing how you think, not memorizing answers.",
    ],
    links: [{ label: "Go to Home", href: "/" }],
  },
  {
    id: "getting-started",
    title: "Getting started",
    summary:
      "After login, use the top navigation to move around. Home is where you start new practice; History helps you see patterns over time.",
    bullets: [
      "Home - pick a Reasoning or Math mode, or resume something in progress.",
      "Dashboard - trends, calibration gap, weekly insights, delayed recall, and optional geopolitics progression.",
      "History - filter past work, heatmap activity, streak, and read-only review of any completed exercise.",
      "Guide - this page; full reference for everything in the app.",
      "Settings - personal context for AI, toggles, and JSON backup.",
      "Decisions - log real decisions and optional one-week check-in reminders.",
    ],
    subsections: [
      {
        title: "Suggested first session",
        bullets: [
          "Open Analytical from the Reasoning page, open the domain field to browse grouped suggestions (DevOps / SRE, MLOps, financial planning, life strategy, …) or type your own, then tap Generate exercise.",
          "Complete at least one highlight, move through confidence and AI perspective, finish journal and action so the run is saved.",
        ],
      },
    ],
    links: [
      { label: "Start Analytical exercise", href: "/exercise/analytical" },
      { label: "Open Dashboard", href: "/dashboard" },
    ],
  },
  {
    id: "home",
    title: "Home",
    summary:
      "Home is your resume point: Reasoning and Math tab buttons to start new practice, plus separate Reasoning/Math subsections for resuming in-progress work and reviewing past commitments.",
    bullets: [
      "Reasoning / Math tabs - jump to the Reasoning mode picker (/reasoning) or the Math & Scenarios hub (/math).",
      "Continue where you left off - one card with separate Reasoning and Math subsections for in-progress exercises and scenarios (opens the same flow with your saved step via resumeId).",
      "Learning Notes - open actions from past sessions, split into a Reasoning card and a Math card, 3 per page with prev/next arrows to page through older notes (read-only; no follow-through checkbox).",
    ],
    links: [{ label: "Home", href: "/" }],
  },
  {
    id: "reasoning",
    title: "Reasoning",
    summary:
      "The Reasoning page (/reasoning) is where you start a new reasoning exercise: a domain/source picker plus six thinking modes.",
    bullets: [
      "Domain and Source - type or pick a recent domain, choose AI-generated / your own text / custom scenario, then tap Find best mode for a ranked suggestion.",
      "Exercise cards - Analytical (marked suggested today as a soft nudge), Sequential, Systems, Evaluative, Generative, and Combo spanning two columns on wide screens.",
    ],
    links: [{ label: "Reasoning", href: "/reasoning" }],
  },
  {
    id: "exercise-flow",
    title: "How every exercise flows",
    summary:
      "Most single-type exercises share the same step bar at the top. Combo chains multiple types on one scenario with one journal and action at the end.",
    bullets: [
      "Setup - domain from the grouped catalog (technology, data/AI, business, life & personal, geopolitics by region/theme/lens, …), your recent domains, or free text.",
      "Source mode on Analytical - AI-generated, your own text (real data), or custom scenario. Tap Generate when ready.",
      "Core work - depends on type (highlights, ordering, canvas, matrix, writing, etc.).",
      "Confidence - slider from 0–100% before you see the AI perspective, so later analytics can compare confidence to measured accuracy.",
      "AI perspective / reflection - structured feedback comparing your work to the exercise design (not a letter grade).",
      "Journal - short prompts, optional emotion label, sometimes a one-line reference from a recent past session.",
      "Action - one concrete thing you will do in real life.",
      "Done - exercise is stored as completed; you can start another or review it in History.",
      "Back and Continue move between steps; some steps require minimum input (e.g. at least one highlight on Analytical).",
      "Progress auto-saves on many steps; you can also resume via links from Home when a run was left incomplete.",
    ],
  },
  {
    id: "analytical",
    title: "Analytical",
    summary:
      "Read a passage and tag reasoning issues: logical problems, hidden assumptions, weak evidence, bias, or-in geopolitics domains-framing bias, missing actors, assumed causation, and analogy misuse.",
    bullets: [
      "AI-generated - model writes a passage with embedded issues and optional sound-reasoning decoys.",
      "Real data - paste your own text (sanitized, word limit); useful for emails, notes, or articles.",
      "Custom scenario - describe a situation; AI shapes the passage around it.",
      "Highlight & tag - select text in the passage, tap the selection again to open the tag menu beside your highlight (no scrolling to the bottom); overlaps with existing highlights are blocked.",
      "Geopolitics domains add a perspective-guess step and specialized tag set with dot indicators.",
    ],
    links: [{ label: "Try Analytical", href: "/exercise/analytical" }],
  },
  {
    id: "sequential",
    title: "Sequential",
    summary:
      "Put messy process steps into a defensible order. Some steps must come before others; some orderings are flexible traps.",
    bullets: [
      "Drag steps into the order you believe is correct.",
      "Confidence, then AI feedback on your sequencing vs intended dependencies.",
      "Journal and action as in the shared flow.",
    ],
    links: [{ label: "Try Sequential", href: "/exercise/sequential" }],
  },
  {
    id: "systems",
    title: "Systems",
    summary:
      "Map a system as nodes and relationships, then react to a shock event by marking how each node is affected.",
    bullets: [
      "Decompose - optionally propose your own components before connecting.",
      "Connect - draw edges between nodes with relationship types.",
      "Shock - read the scenario shock; tap nodes to cycle impact: none, direct, indirect.",
      "Geopolitics domains may include a perspective-swap step comparing two strategic lenses.",
      "AI reflection, journal, and action follow.",
    ],
    links: [{ label: "Try Systems", href: "/exercise/systems" }],
  },
  {
    id: "evaluative",
    title: "Evaluative",
    summary:
      "Compare options using either a 2×2 matrix or a weighted scoring table. AI may hide criteria or stakeholder angles for you to discover.",
    bullets: [
      "Matrix variant - place each option in the quadrant that matches your judgment on two axes.",
      "Scoring variant - weight criteria and score options; geopolitics scoring adds stakeholder mapping before scoring.",
      "Propose criteria - optional step to suggest your own criteria before comparing to AI intent.",
      "Perspective step may surface blind spots and weight alignment on geopolitics runs.",
    ],
    links: [{ label: "Try Evaluative", href: "/exercise/evaluative" }],
  },
  {
    id: "generative",
    title: "Generative",
    summary:
      "Write answers to structured prompts, steelman an opposing view, debate with the model, and receive rubric-style reflection.",
    bullets: [
      "Write - fill prompts; scaffold depth may increase as you complete more generative exercises (adaptive path).",
      "Steelman - articulate the strongest counter-position.",
      "Debate - short back-and-forth challenging your reasoning.",
      "Geopolitics domains use scenario-planning style prompts across multiple branches.",
      "Rubric snapshot and AI reflection, then journal and action.",
    ],
    links: [{ label: "Try Generative", href: "/exercise/generative" }],
  },
  {
    id: "combo",
    title: "Combo",
    summary:
      "One shared scenario, multiple thinking modes in sequence, then a single journal and action at the end.",
    bullets: [
      "Full analysis - Analytical → Systems → Evaluative (matrix).",
      "Decision sprint - Evaluative (matrix) → Generative.",
      "Root cause - Sequential → Systems → Analytical.",
      "Choose domain and preset on setup; work through Step X of Y for each segment using that type's UI.",
    ],
    links: [{ label: "Try Combo", href: "/exercise/combo" }],
  },
  {
    id: "geopolitics",
    title: "Geopolitics practice",
    summary:
      "When your domain matches geopolitics keywords or catalog subdomains, exercises use specialized prompts, tags, and extra steps. A progression card on Dashboard tracks phased practice.",
    bullets: [
      "Domain field - typing related terms surfaces Geopolitics focus areas in the suggestion list (ASEAN, US-China competition, NATO, etc.).",
      "Analytical - semantic tags (framing bias, missing actor, assumed causation, analogy misuse) plus valid point and unclear.",
      "Systems - dual-perspective shock and compare step.",
      "Evaluative scoring - stakeholder mapping and weight alignment feedback.",
      "Generative - four-branch scenario planning.",
      "Dashboard progression - after your first completed geopolitics exercise, a card shows phase progress and a suggested next subdomain and exercise type; links open the flow with ?domain= prefilled.",
    ],
    subsections: [
      {
        title: "Real-data tip",
        bullets: [
          "On Analytical setup, real-data mode shows hints for think-tank or news sources suitable for geopolitical analysis.",
        ],
      },
    ],
    links: [
      {
        label: "Analytical with geo domain",
        href: "/exercise/analytical?domain=US-China%20strategic%20competition",
      },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    id: "dashboard",
    title: "Dashboard",
    summary:
      "See how your practice accumulates: completion counts, calibration gap, optional adaptive difficulty details, weekly AI summary, and sidebar widgets.",
    bullets: [
      "Summary tiles - completed exercises, average calibration gap (confidence minus measured accuracy), average accuracy where available.",
      "Calibration gap chart - trend over time when you have enough data points.",
      "Adaptive difficulty - if enabled in Settings, shows tier and active weakness buckets that influence generation hints.",
      "Weekly insight - generate a markdown review from recent completed work when thresholds are met.",
      "Patterns (local) - journal emotions and perspective disagreement counts from your device data.",
      "Sidebar - decision reminders (7-day check-ins), one delayed-recall card at a time (48h after an exercise, disable in Settings), geopolitics progression when applicable.",
    ],
    links: [{ label: "Open Dashboard", href: "/dashboard" }],
  },
  {
    id: "history",
    title: "Exercise history",
    summary:
      "Browse everything you have finished: filter, visualize activity, and open read-only reviews including journal and AI perspective.",
    bullets: [
      "Calibration summary and gap chart at the top (global, not filter-specific for streak).",
      "Activity heatmap - color by exercise type for the current filter set.",
      "Streak - consecutive days with at least one completion (all types).",
      "Filters - type, domain substring, date range; Apply to refresh the list.",
      "Review - click a row to inspect passage, highlights, perspective text, journal responses, and metadata.",
      "Deleting a completed exercise removes related journal, calibration, and recall records for that id.",
    ],
    links: [{ label: "Open History", href: "/exercise/history" }],
  },
  {
    id: "settings",
    title: "Settings",
    summary:
      "Control how AI personalizes exercises and how optional features behave. Back up or restore your cloud data.",
    bullets: [
      "Personal context - short bio, role, goals; sent with generation and some AI calls.",
      "Delayed recall - toggle 48-hour recall cards on Dashboard.",
      "Adaptive difficulty - toggle performance-based hints and weakness queue for generation.",
      "Download JSON backup - full snapshot for your signed-in user.",
      "Import JSON - merge or replace cloud data (replace is destructive; confirm carefully).",
      "Download journal as Markdown - export journal entries only.",
    ],
    links: [{ label: "Open Settings", href: "/settings" }],
  },
  {
    id: "decisions",
    title: "Decisions",
    summary:
      "Separate from exercises: log real decisions you made, optionally link to a practice exercise, and set a reminder to revisit outcomes about one week later.",
    bullets: [
      "Create entries with title, domain, decided date, and notes on what thinking habit helped or hurt.",
      "Optional link to an existing completed exercise for context.",
      "Dashboard sidebar surfaces due reminders.",
    ],
    links: [{ label: "Open Decisions", href: "/decisions" }],
  },
  {
    id: "ai-and-privacy",
    title: "AI and your data",
    summary:
      "Exercises are generated and critiqued by Google's Gemini API on the server. Your account data lives in Firebase; access may be restricted by an allowlist on some deployments.",
    bullets: [
      "Generation, perspectives, debates, weekly reviews, and journal reference lines all call the configured model with prompts tailored to each exercise type.",
      "AI perspective is comparative feedback, not an authoritative grade.",
      "Use Settings backup regularly if you want a copy outside the cloud.",
      "Deployers must set GEMINI_API_KEY on the server; if missing, Generate will error (not something you fix in the UI).",
    ],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    summary: "Common issues and what to try.",
    bullets: [
      "Generate fails with API error - server needs GEMINI_API_KEY; contact whoever runs your instance.",
      "Invalid exercise (422) - model returned malformed JSON; tap Retry on setup.",
      "Missing old exercises - confirm you are signed into the same Google account; try Import JSON from a backup.",
      "Adaptive section empty - enable Adaptive difficulty in Settings and complete more exercises.",
      "Delayed recall never appears - enable in Settings and wait until 48h after a completed exercise.",
      "Geopolitics progression card hidden - complete at least one exercise that counts as geopolitics (flag or domain match).",
    ],
    links: [
      { label: "Settings backup", href: "/settings" },
      { label: "This guide", href: "/guide" },
    ],
  },
];

export const GUIDE_SECTION_COUNT = GUIDE_SECTIONS.length;
