/** Visible regional steering for geo generative generation (not hidden userContext). */

const REGIONAL_APPENDIX_RULES: { match: (domain: string) => boolean; text: string }[] = [
  {
    match: (d) =>
      /southeast asia|asean/i.test(d) ||
      d.includes("Southeast Asia & ASEAN strategy"),
    text: `Regional context (for scenario grounding): Center dynamics on ASEAN cohesion, Vietnam's balancing act between major powers, South China Sea incidents, supply-chain realignment, and how smaller states hedge without being forced into a binary choice.`,
  },
  {
    match: (d) =>
      /indo-pacific/i.test(d) ||
      d.includes("Indo-Pacific security architecture"),
    text: `Regional context (for scenario grounding): Emphasize US alliance network posture, AUKUS/quad signaling, PRC anti-access concerns, first-island-chain maritime pressure, and partner capacity-building in the western Pacific.`,
  },
  {
    match: (d) =>
      /us-china|strategic competition/i.test(d) ||
      d.includes("US-China strategic competition"),
    text: `Regional context (for scenario grounding): Stress technology export controls, Taiwan strait risk, economic decoupling vs interdependence, and third-country alignment costs across Asia and Europe.`,
  },
  {
    match: (d) =>
      /maritime choke|straits|canals/i.test(d) ||
      d.includes("Maritime choke points"),
    text: `Regional context (for scenario grounding): Feature Malacca/Singapore Strait, Hormuz, Suez/Red Sea disruptions, insurance spikes, rerouting costs, and naval escort politics affecting Vietnam and ASEAN trade.`,
  },
  {
    match: (d) =>
      /\bbri\b|belt and road|infrastructure corridors|ports & megaprojects/i.test(d) ||
      d.includes("Infrastructure corridors"),
    text: `Regional context (for scenario grounding): Highlight port concessions, debt sustainability, dual-use infrastructure, local backlash, and competition between Chinese-backed corridors and US/Japan-led alternatives in mainland Southeast Asia.`,
  },
];

export function getGeopoliticsRegionalAppendix(domain: string): string | undefined {
  const d = domain.trim();
  if (!d) return undefined;
  for (const rule of REGIONAL_APPENDIX_RULES) {
    if (rule.match(d)) return rule.text;
  }
  return undefined;
}
