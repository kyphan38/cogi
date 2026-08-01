import type { Scenario } from "@/lib/types/math-scenario";

/**
 * 1. STRAIGHT EV (Baseline Risk-Neutral Benchmark)
 */
export const evCloudRedundancyScenario: Scenario = {
  id: "ev-cloud-redundancy",
  topic: "expected_value",
  title: "Cloud Infrastructure Redundancy Trade-Off",
  situation:
    "Your payment processing microservice runs in a single AWS region. Adding multi-region active-active redundancy costs $50,000/year in cross-region infrastructure fees. Historical data shows a 15% annual probability of a major single-region outage lasting 4 hours. Outage downtime penalties cost your business $120,000 per hour ($480,000 total per incident). Should you purchase multi-region redundancy?",
  commitSpec: {
    kind: "multiple_choice",
    promptText: "Select the optimal infrastructure decision.",
    correctOptionId: "opt_redundancy",
    options: [
      { id: "opt_redundancy", text: "Purchase active-active multi-region redundancy" },
      { id: "opt_single_region", text: "Remain single-region" },
    ],
  },
  keyTraps: [
    "Focusing on raw worst-case loss ($480k) without weighting by probability (15%).",
    "Confusing single-incident cost with annual expected cost.",
  ],
  hintLadder: [
    "What are you comparing against what here?",
    "Is the 4-hour outage something that happens every year guaranteed, or only with a certain probability?",
    "What is the average yearly cost of leaving the system in a single region?",
  ],
  canonicalAnswer: "Purchase active-active redundancy. Net expected savings: +$22,000/year.",
  explanation:
    "Expected outage cost without redundancy = 0.15 × $480,000 = $72,000/year. Cost of redundancy = $50,000/year. Net expected savings = $72,000 - $50,000 = +$22,000/year.",
  toolName: "Expected Value (EV) Decision Rule",
  transfers: [
    {
      domain: "Cybersecurity Insurance",
      mapping: "Paying a fixed annual premium ($50k) to eliminate expected breach losses ($72k/yr).",
    },
  ],
  boundaries: [
    {
      condition: "Company cash reserves under $100,000",
      whyItBreaks:
        "If a single $480k outage causes immediate bankruptcy, ruin risk overrides EV.",
    },
  ],
  fieldNote: "Never compare raw worst-case losses to fixed premiums - compare expected probability-weighted costs.",
};

/**
 * 2. RUIN RISK & NON-ERGODICITY (Positive EV but DECLINE)
 */
export const evRuinRiskScenario: Scenario = {
  id: "ev-ruin-risk",
  topic: "expected_value",
  title: "High-Stakes Contract & Corporate Ruin Risk",
  situation:
    "A strategic enterprise partner offers your startup a 1-year revenue-share contract: a 90% probability of generating +$1,000,000 in net profit, but a 10% probability of a severe compliance failure incurring a -$5,000,000 penalty. Your company currently has $2,000,000 in total liquid reserves. Should you accept this contract?",
  commitSpec: {
    kind: "multiple_choice",
    promptText: "Select the rational business decision.",
    correctOptionId: "opt_decline",
    options: [
      { id: "opt_accept", text: "Accept the contract" },
      { id: "opt_decline", text: "Decline the contract" },
    ],
  },
  keyTraps: [
    "Relying blindly on expected value (+ $400k) without checking if downside breaches an absorbing barrier.",
    "Assuming expected value applies to one-shot survival decisions.",
  ],
  hintLadder: [
    "Calculate raw EV (+ $400k). Now look at your liquid reserves ($2M). What happens if the 10% outcome occurs?",
    "If a company goes bankrupt, can it play future rounds to realize positive expected value?",
    "Is this a repeated bet over 1,000 independent trials, or a single absorbing-state decision?",
  ],
  canonicalAnswer: "Decline the contract. Despite positive EV (+ $400,000), the 10% downside triggers corporate ruin.",
  explanation:
    "Raw EV = (0.90 × $1,000,000) + (0.10 × -$5,000,000) = +$400,000. However, the -$5,000,000 loss exceeds total liquid reserves ($2,000,000), causing 100% probability of corporate bankruptcy if triggered. EV assumes repeatability and risk neutrality; under absorbing barriers (ruin risk), expected utility is negative.",
  toolName: "Ruin Risk & Non-Ergodicity",
  transfers: [
    {
      domain: "Russian Roulette / Leverage in Trading",
      mapping: "A bet with positive average payout is irrational if a single loss wipes out capital.",
    },
  ],
  boundaries: [
    {
      condition: "When is it safe to follow raw positive EV?",
      whyItBreaks:
        "Raw EV is valid ONLY when: (1) downside loss is non-fatal and easily absorbed by reserves, (2) the trial is repeated many times independently, or (3) downside risk is syndicated/insured.",
    },
  ],
  fieldNote: "Never follow positive EV into an absorbing state - ruin risk overrides expected value.",
};

/**
 * 3. ESTIMATING P & REFERENCE CLASS (Base Rates vs Inside View)
 */
export const evBaseRateEstimationScenario: Scenario = {
  id: "ev-base-rate-estimation",
  topic: "expected_value",
  title: "Custom Platform Build vs. Commercial PaaS",
  situation:
    "Your engineering team proposes building a custom internal developer platform rather than paying $40,000/year ($80,000 total over 2 years) for a commercial PaaS subscription. Baseline custom development costs $50,000. Your lead architect estimates an optimistic 20% probability of project delay/failure ($100,000 additional cost if failed). Should you build custom or buy commercial PaaS?",
  commitSpec: {
    kind: "multiple_choice",
    promptText: "Select the optimal strategic path.",
    correctOptionId: "opt_buy",
    options: [
      { id: "opt_build", text: "Build custom developer platform" },
      { id: "opt_buy", text: "Buy commercial PaaS subscription" },
    ],
  },
  keyTraps: [
    "Falling into the 'Inside View' trap - trusting internal team optimism over historical reference class data.",
    "Plugging arbitrary subjective probabilities into EV formulas without checking empirical base rates.",
  ],
  hintLadder: [
    "Whose estimate are you relying on for the 20% failure probability?",
    "How do internal engineering project estimates usually compare to historical industry outcomes across peer companies?",
    "What happens to the total expected cost if the true failure probability matches historical base rates (70% industry failure rate)?",
  ],
  canonicalAnswer: "Buy commercial PaaS subscription. Accounting for the 70% reference class base rate, PaaS saves $40,000 in expected cost.",
  explanation:
    "Under inside-view optimism (20% failure), expected custom cost = $50,000 + (0.20 × $100,000) = $70,000 vs $80,000 PaaS (making build look $10,000 cheaper). However, empirical benchmark data across 200 peer engineering orgs reveals a 70% failure/delay rate for custom platforms. Under the 70% reference class base rate, total expected custom build cost = $50,000 + (0.70 × $100,000) = $120,000. Comparing $120,000 total custom EV to $80,000 PaaS shows buying PaaS saves $40,000.",
  toolName: "Reference Class Forecasting (Base Rate EV)",
  transfers: [
    {
      domain: "M&A Acquisition Integration",
      mapping: "Ignoring deal synergy optimism and pricing deals against historical 70% M&A failure rates.",
    },
  ],
  boundaries: [
    {
      condition: "Team has successfully built the exact platform twice before",
      whyItBreaks:
        "Specific prior execution experience moves your team out of the generic reference class, lowering failure probability.",
    },
  ],
  fieldNote: "The hard part of EV is estimating P - always anchor probabilities in reference class base rates.",
};

/**
 * 4. VALUE OF INFORMATION (Expected Value of Sample Information)
 */
export const evValueOfInformationScenario: Scenario = {
  id: "ev-value-of-information",
  topic: "expected_value",
  title: "Enterprise AI Feature Launch & Prototype Study",
  situation:
    "You are evaluating launching a major new enterprise AI feature costing $500,000 to build and market. Success yields +$1,200,000 net profit (50% prior probability), while failure yields -$500,000 net loss (50% prior probability). Raw blind launch EV is +$350,000. A research firm offers a $60,000 prototype user study. Historical study performance shows: if a project is doomed, the study flags 'HIGH RISK' 80% of the time (20% false pass); if a project is viable, the study flags 'HIGH RISK' 20% of the time (20% false alarm). If the study flags 'HIGH RISK', you cancel the launch ($0 build cost). Should you pay $60,000 for the study before deciding?",
  commitSpec: {
    kind: "multiple_choice",
    promptText: "Select the optimal strategy.",
    correctOptionId: "opt_run_study",
    options: [
      { id: "opt_launch_immediately", text: "Launch feature immediately" },
      { id: "opt_run_study", text: "Pay $60,000 for user prototype study before deciding" },
      { id: "opt_abandon", text: "Abandon feature altogether" },
    ],
  },
  keyTraps: [
    "Assuming information has no monetary value because raw launch EV is already positive (+ $350k).",
    "Failing to account for false positive alarms (wrongly killing winning projects).",
  ],
  hintLadder: [
    "What action do you take if the prototype study returns a 'HIGH RISK' signal?",
    "How much money do you save when the study correctly flags a doomed project, and how much profit do you lose when it falsely flags a winner?",
    "Does the expected savings from avoiding doomed launches exceed both the study fee ($60k) and lost profit from false alarms?",
  ],
  canonicalAnswer: "Pay $60,000 for prototype study. Net EVSI increases total expected profit by +$20,000.",
  explanation:
    "1. Blind launch EV = 0.50(+$1,200,000) + 0.50(-$500,000) = +$350,000.\n2. Study Probability of 'PASS' = P(Pass|Succ)P(Succ) + P(Pass|Fail)P(Fail) = (0.80 × 0.50) + (0.20 × 0.50) = 0.40 + 0.10 = 0.50.\n3. Posterior success given PASS = 0.40 / 0.50 = 80%. Expected profit when launching on PASS = 0.80(+$1,200,000) + 0.20(-$500,000) = +$860,000.\n4. Expected value of study strategy = 0.50(+$860,000) + 0.50($0) - $60,000 = $430,000 - $60,000 = +$370,000.\n5. Net benefit of running study = $370,000 - $350,000 = +$20,000.",
  toolName: "Expected Value of Sample Information (EVSI)",
  transfers: [
    {
      domain: "Oil Exploration / Geological Drilling",
      mapping: "Paying for seismic surveys before committing millions to deepwater oil well drilling.",
    },
  ],
  boundaries: [
    {
      condition: "Study cost exceeds total downside risk savings",
      whyItBreaks:
        "If research costs $200,000 but only saves $100,000 in expected downside, buying information is negative EV.",
    },
  ],
  verification: {
    scriptPath: "src/lib/scenarios/expected-value.test.ts",
    expected: 370000,
    tolerance: 2000,
  },
  fieldNote: "Information has EV when it can change your decision and save more than it costs.",
};

export const expectedValueScenarios: Scenario[] = [
  evCloudRedundancyScenario,
  evRuinRiskScenario,
  evBaseRateEstimationScenario,
  evValueOfInformationScenario,
];
