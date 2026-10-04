import type { GeoSource } from "@/lib/geo/types";

/**
 * Country cards (PLAN-geopolitics.md G3). A fixed data set: every line has a source
 * and was checked on the web on 2026-10-04.
 *
 * How the cards stay neutral:
 * - "Says" and "Red lines" only hold what that government or group states itself,
 *   with who said it and when. The app does not judge these statements.
 * - "Strengths" and "Weak spots" are numbers and plain facts from neutral sources
 *   (World Bank, EIA, FAS, USGS, the UN).
 * - "Groups" are memberships and treaties.
 */

export type ActorId = "us" | "china" | "russia" | "eu" | "japan" | "india" | "vietnam" | "asean" | "saudi-arabia" | "iran";

export interface CardLine {
  text: string;
  source: GeoSource;
}

export interface ActorCard {
  id: ActorId;
  name: string;
  kind: "country" | "group";
  /** What it says it wants, in its own documents or leaders' words. */
  says: CardLine[];
  /** Red lines and firm commitments it has stated itself (may be empty). */
  redLines: CardLine[];
  /** Leverage: facts and numbers from neutral sources. */
  strengths: CardLine[];
  /** Dependencies and exposures, from neutral sources. */
  weakSpots: CardLine[];
  /** Groups, alliances and treaties (may be empty). */
  partners: CardLine[];
}

const WB_INDICATORS = {
  gdp: { code: "NY.GDP.MKTP.CD", label: "GDP (current US$)" },
  military: { code: "MS.MIL.XPND.CD", label: "Military expenditure (SIPRI data)" },
  population: { code: "SP.POP.TOTL", label: "Population" },
  energyImports: { code: "EG.IMP.CONS.ZS", label: "Energy imports, net (% of energy use)" },
  fuelExports: { code: "TX.VAL.FUEL.ZS.UN", label: "Fuel exports (% of merchandise exports)" },
  fuelImports: { code: "TM.VAL.FUEL.ZS.UN", label: "Fuel imports (% of merchandise imports)" },
  trade: { code: "NE.TRD.GNFS.ZS", label: "Trade (% of GDP)" },
} as const;

/** World Bank World Development Indicators, one indicator for one economy. */
function wb(indicator: keyof typeof WB_INDICATORS, location: string): GeoSource {
  const { code, label } = WB_INDICATORS[indicator];
  return {
    label: `World Bank, World Development Indicators: ${label}`,
    url: `https://data.worldbank.org/indicator/${code}?locations=${location}`,
  };
}

const S = {
  usNss: {
    label: "The White House, National Security Strategy of the United States, December 2025",
    url: "https://www.whitehouse.gov/wp-content/uploads/2025/12/2025-National-Security-Strategy.pdf",
  },
  natoTreaty: {
    label: "NATO, The North Atlantic Treaty (1949)",
    url: "https://www.nato.int/en/about-us/official-texts-and-resources/official-texts/1949/04/04/the-north-atlantic-treaty",
  },
  usJapanTreaty: {
    label: "Ministry of Foreign Affairs of Japan, Japan-U.S. Security Treaty (1960)",
    url: "https://www.mofa.go.jp/region/n-america/us/q&a/ref/1.html",
  },
  fas: {
    label: "Federation of American Scientists, Status of World Nuclear Forces 2026",
    url: "https://fas.org/initiative/status-world-nuclear-forces/",
  },
  usgs: {
    label: "U.S. Geological Survey, Mineral Commodity Summaries 2026",
    url: "https://pubs.usgs.gov/periodicals/mcs2026/mcs2026.pdf",
  },
  unsc: {
    label: "United Nations Security Council, Current Members",
    url: "https://main.un.org/securitycouncil/en/content/current-members",
  },
  chinaDefence2019: {
    label: "State Council Information Office of China, defence white paper report, July 2019",
    url: "http://english.scio.gov.cn/whitepapers/2019-07/25/content_75030078.htm",
  },
  chinaLima2024: {
    label: "Ministry of Foreign Affairs of China, President Xi Jinping Meets with U.S. President Joe Biden in Lima, November 2024",
    url: "https://www.fmprc.gov.cn/eng/xw/zyxw/202411/t20241117_11527672.html",
  },
  malacca: {
    label: "The Conversation, Could the Strait of Malacca be the next global flashpoint?, April 2026",
    url: "https://theconversation.com/could-the-strait-of-malacca-be-the-next-global-flashpoint-281190",
  },
  sco: {
    label: "Shanghai Cooperation Organisation, About the SCO",
    url: "https://eng.sectsco.org/20170109/192193.html",
  },
  brics: {
    label: "BRICS India 2026, About BRICS (members and partner countries)",
    url: "https://www.brics2026.gov.in/about-us/",
  },
  russiaConcept2023: {
    label: "Ministry of Foreign Affairs of Russia, The Concept of the Foreign Policy of the Russian Federation, March 2023",
    url: "https://mid.ru/en/foreign_policy/fundamental_documents/1860586/",
  },
  russiaDraft2021: {
    label: "Ministry of Foreign Affairs of Russia, draft treaty with the United States on security guarantees, 17 December 2021",
    url: "https://mid.ru/ru/foreign_policy/rso/nato/1790818/?lang=en",
  },
  eiaChokepoints: {
    label: "U.S. Energy Information Administration (EIA), World Oil Transit Chokepoints, updated March 2026",
    url: "https://www.eia.gov/international/analysis/special-topics/World_Oil_Transit_Chokepoints",
  },
  euCompass: {
    label: "Council of the EU, A Strategic Compass for a stronger EU security and defence, March 2022",
    url: "https://www.consilium.europa.eu/en/press/press-releases/2022/03/21/a-strategic-compass-for-a-stronger-eu-security-and-defence-in-the-next-decade/",
  },
  euCrimea: {
    label: "Council of the EU, EU renews restrictive measures over Crimea and Sevastopol until 23 June 2026, June 2025",
    url: "https://www.consilium.europa.eu/en/press/press-releases/2025/06/16/russia-s-illegal-annexation-of-crimea-and-the-city-of-sevastopol-eu-renews-restrictive-measures-until-23-june-2026/",
  },
  japanNss: {
    label: "Cabinet Secretariat of Japan, National Security Strategy, December 2022",
    url: "https://www.cas.go.jp/jp/siryou/221216anzenhoshou/nss-e.pdf",
  },
  quad: {
    label: "Australian Department of Foreign Affairs and Trade, The Quad",
    url: "https://www.dfat.gov.au/international-relations/regional-architecture/quad",
  },
  indiaAutonomy: {
    label: "The Tribune (ANI), Jaishankar at the Munich Security Conference, February 2026",
    url: "https://www.tribuneindia.com/news/global-energy-markets/we-are-very-much-wedded-to-strategic-autonomy-mea-jaishankar-on-indias-energy-choices-at-munich-security-conference",
  },
  vietnamFourNos: {
    label: "Vietnam Government Portal, \"Four No's\" principle of national defence policy",
    url: "https://en.baochinhphu.vn/four-nos-principle-of-national-defense-policy-11137244.htm",
  },
  vietnamForeignPolicy: {
    label: "Vietnam Government Portal, Prime Minister Pham Minh Chinh hosts banquet for diplomatic corps, February 2026",
    url: "https://en.baochinhphu.vn/prime-minister-pham-minh-chinh-hosts-banquet-for-diplomatic-corps-111260210012654534.htm",
  },
  aseanCharter: {
    label: "ASEAN, The ASEAN Charter (2007)",
    url: "https://asean.org/wp-content/uploads/images/archive/publications/ASEAN-Charter.pdf",
  },
  timorLeste: {
    label: "The Jakarta Post (AP), Timor Leste, Asia's youngest nation, becomes ASEAN's 11th member, October 2025",
    url: "https://www.thejakartapost.com/world/2025/10/26/timor-leste-asias-youngest-nation-becomes-aseans-11th-member.html",
  },
  saudiVision: {
    label: "Saudi Vision 2030, Overview",
    url: "https://www.vision2030.gov.sa/en/overview",
  },
  eiaSaudi: {
    label: "U.S. Energy Information Administration (EIA), Country Analysis: Saudi Arabia, October 2024",
    url: "https://www.eia.gov/international/content/analysis/countries_long/saudi_arabia/",
  },
  opec: {
    label: "OPEC, Brief History",
    url: "https://www.opec.org/brief-history.html",
  },
  iranUn2025: {
    label: "UN News, 'Iran has never sought and will never seek to build a nuclear bomb,' President tells General Assembly, September 2025",
    url: "https://news.un.org/en/story/2025/09/1165935",
  },
  eiaIran: {
    label: "U.S. Energy Information Administration (EIA), Country Analysis: Iran, October 2024",
    url: "https://www.eia.gov/international/content/analysis/countries_long/iran",
  },
} satisfies Record<string, GeoSource>;

export const ACTORS: ActorCard[] = [
  {
    id: "us",
    name: "United States",
    kind: "country",
    says: [
      {
        text: "Its 2025 National Security Strategy asks allies to take the main responsibility for their own regions, and backs NATO's pledge to spend 5% of GDP on defence.",
        source: S.usNss,
      },
      {
        text: "Its 2025 strategy also says the US will enforce a \"Trump Corollary\" to the Monroe Doctrine in the Western Hemisphere, and keep the Indo-Pacific free and open.",
        source: S.usNss,
      },
    ],
    redLines: [
      {
        text: "As a NATO member, it treats an armed attack on any ally in Europe or North America as an attack on all (North Atlantic Treaty of 1949, Article 5).",
        source: S.natoTreaty,
      },
    ],
    strengths: [
      { text: "GDP of about $30.8 trillion (2025).", source: wb("gdp", "US") },
      { text: "Military spending of about $997 billion (2024).", source: wb("military", "US") },
      { text: "About 5,042 nuclear warheads (start of 2026). With Russia, it holds about 86% of the world's nuclear weapons.", source: S.fas },
      { text: "One of the five permanent members of the UN Security Council.", source: S.unsc },
    ],
    weakSpots: [
      { text: "In 2025 it relied fully on imports for 13 of the 60 minerals on its critical minerals list.", source: S.usgs },
    ],
    partners: [
      { text: "A founding member of NATO (1949).", source: S.natoTreaty },
      { text: "Security treaty with Japan since 1960.", source: S.usJapanTreaty },
      { text: "Member of the Quad with Australia, India and Japan.", source: S.quad },
    ],
  },
  {
    id: "china",
    name: "China",
    kind: "country",
    says: [
      {
        text: "Its 2019 defence white paper says China will never seek hegemony, expansion or spheres of influence.",
        source: S.chinaDefence2019,
      },
    ],
    redLines: [
      {
        text: "In November 2024, President Xi Jinping told the US president that the Taiwan question, democracy and human rights, China's path and system, and China's development right are four red lines for China.",
        source: S.chinaLima2024,
      },
    ],
    strengths: [
      { text: "GDP of about $19.5 trillion (2025).", source: wb("gdp", "CN") },
      { text: "Military spending of about $314 billion (2024).", source: wb("military", "CN") },
      { text: "One of the five permanent members of the UN Security Council.", source: S.unsc },
    ],
    weakSpots: [
      {
        text: "It imports about 11 million barrels of oil a day, and 75% to 80% of that oil passes the Strait of Malacca.",
        source: S.malacca,
      },
    ],
    partners: [
      { text: "A founding member of the Shanghai Cooperation Organisation (SCO), set up in 2001.", source: S.sco },
      { text: "Member of BRICS.", source: S.brics },
    ],
  },
  {
    id: "russia",
    name: "Russia",
    kind: "country",
    says: [
      {
        text: "Its 2023 Foreign Policy Concept says Russia's mission is to keep a global balance of power and build a multipolar international system.",
        source: S.russiaConcept2023,
      },
    ],
    redLines: [
      {
        text: "In a December 2021 draft treaty, its Foreign Ministry asked the US to stop NATO from expanding further east and to refuse membership to former Soviet states.",
        source: S.russiaDraft2021,
      },
    ],
    strengths: [
      { text: "About 5,420 nuclear warheads, the largest number of any country (start of 2026).", source: S.fas },
      { text: "One of the five permanent members of the UN Security Council.", source: S.unsc },
      { text: "Military spending of about $149 billion, 7.1% of GDP (2024).", source: wb("military", "RU") },
    ],
    weakSpots: [
      { text: "Fuel made up about 43% of its goods exports (2021).", source: wb("fuelExports", "RU") },
      {
        text: "Much of its oil leaves through narrow sea routes: it is the largest oil exporter through the Danish Straits, and Black Sea ports are a main export route.",
        source: S.eiaChokepoints,
      },
    ],
    partners: [
      { text: "A founding member of the Shanghai Cooperation Organisation (SCO).", source: S.sco },
      { text: "Member of BRICS.", source: S.brics },
    ],
  },
  {
    id: "eu",
    name: "European Union",
    kind: "group",
    says: [
      {
        text: "Its 2022 Strategic Compass aims to make the EU a stronger and more capable security provider by 2030.",
        source: S.euCompass,
      },
    ],
    redLines: [
      {
        text: "The Council of the EU says it does not recognise Russia's annexation of Crimea and Sevastopol, which it calls illegal, and keeps sanctions in place (renewed until June 2026).",
        source: S.euCrimea,
      },
    ],
    strengths: [
      { text: "GDP of about $21.2 trillion (2025).", source: wb("gdp", "EU") },
      { text: "About 451 million people (2025).", source: wb("population", "EU") },
    ],
    weakSpots: [{ text: "It imports about 62% of the energy it uses (2023).", source: wb("energyImports", "EU") }],
    partners: [
      { text: "Its Strategic Compass calls NATO the foundation of collective defence for its members.", source: S.euCompass },
    ],
  },
  {
    id: "japan",
    name: "Japan",
    kind: "country",
    says: [
      {
        text: "Its 2022 National Security Strategy says spending on defence and related measures will reach 2% of GDP in fiscal year 2027.",
        source: S.japanNss,
      },
    ],
    redLines: [],
    strengths: [
      { text: "GDP of about $4.4 trillion (2025).", source: wb("gdp", "JP") },
      { text: "Military spending of about $55 billion (2024).", source: wb("military", "JP") },
    ],
    weakSpots: [{ text: "It imports about 87% of the energy it uses (2023).", source: wb("energyImports", "JP") }],
    partners: [
      {
        text: "Security treaty with the US since 1960: each side says it would act if Japan's territory is attacked (Article V).",
        source: S.usJapanTreaty,
      },
      { text: "Member of the Quad with Australia, India and the US.", source: S.quad },
    ],
  },
  {
    id: "india",
    name: "India",
    kind: "country",
    says: [
      {
        text: "In February 2026 its foreign minister said India is \"very much wedded to strategic autonomy\" (deciding for itself instead of joining one side).",
        source: S.indiaAutonomy,
      },
    ],
    redLines: [],
    strengths: [
      { text: "About 1.46 billion people (2025).", source: wb("population", "IN") },
      { text: "GDP of about $3.96 trillion (2025).", source: wb("gdp", "IN") },
    ],
    weakSpots: [{ text: "Fuel made up about 32% of its goods imports (2024).", source: wb("fuelImports", "IN") }],
    partners: [
      { text: "Member of the Quad with Australia, Japan and the US.", source: S.quad },
      { text: "Member of BRICS.", source: S.brics },
      { text: "Member of the Shanghai Cooperation Organisation (SCO) since 2017.", source: S.sco },
    ],
  },
  {
    id: "vietnam",
    name: "Vietnam",
    kind: "country",
    says: [
      {
        text: "Its 2019 defence white paper sets out \"four no's\": no military alliances, no siding with one country against another, no foreign military bases, and no use or threat of force.",
        source: S.vietnamFourNos,
      },
      {
        text: "In February 2026 the government described its foreign policy as independence, self-reliance, diversification and multilateralisation.",
        source: S.vietnamForeignPolicy,
      },
    ],
    redLines: [],
    strengths: [
      { text: "About 101.6 million people (2025).", source: wb("population", "VN") },
      { text: "GDP of about $515 billion (2025).", source: wb("gdp", "VN") },
    ],
    weakSpots: [
      { text: "Trade is about 190% of its GDP (2025), so world demand matters a lot to its economy.", source: wb("trade", "VN") },
    ],
    partners: [
      { text: "Member of ASEAN.", source: S.aseanCharter },
      { text: "A BRICS partner country since 2025.", source: S.brics },
    ],
  },
  {
    id: "asean",
    name: "ASEAN",
    kind: "group",
    says: [
      {
        text: "Its Charter commits members to settle disputes peacefully and not to interfere in each other's internal affairs.",
        source: S.aseanCharter,
      },
    ],
    redLines: [],
    strengths: [
      { text: "11 member states since Timor-Leste joined in October 2025.", source: S.timorLeste },
      { text: "Combined GDP of about $3.8 trillion.", source: S.timorLeste },
    ],
    weakSpots: [{ text: "Decisions are made by consultation and consensus (Charter, Article 20).", source: S.aseanCharter }],
    partners: [],
  },
  {
    id: "saudi-arabia",
    name: "Saudi Arabia",
    kind: "country",
    says: [
      {
        text: "Vision 2030, launched in 2016, aims to diversify the economy and grow non-oil sectors such as mining, tourism and the digital economy.",
        source: S.saudiVision,
      },
    ],
    redLines: [],
    strengths: [
      { text: "The world's top crude oil exporter in 2023.", source: S.eiaSaudi },
      { text: "About 17% of the world's proved oil reserves (2023).", source: S.eiaSaudi },
    ],
    weakSpots: [{ text: "Fuel made up about 79% of its goods exports (2024).", source: wb("fuelExports", "SA") }],
    partners: [
      { text: "A founding member of OPEC (1960).", source: S.opec },
      { text: "Part of OPEC+: since December 2016, OPEC has cooperated with 10 other oil producers.", source: S.opec },
    ],
  },
  {
    id: "iran",
    name: "Iran",
    kind: "country",
    says: [
      {
        text: "In September 2025 its president told the UN General Assembly that Iran has never sought and will never seek a nuclear bomb.",
        source: S.iranUn2025,
      },
    ],
    redLines: [],
    strengths: [
      { text: "The world's third-largest oil reserves and second-largest natural gas reserves (2023).", source: S.eiaIran },
      { text: "It lies on the Strait of Hormuz, opposite Oman.", source: S.eiaChokepoints },
    ],
    weakSpots: [
      { text: "Fuel made up about 56% of its goods exports (2022).", source: wb("fuelExports", "IR") },
      { text: "Most of its crude oil exports go to China.", source: S.eiaChokepoints },
    ],
    partners: [
      { text: "A founding member of OPEC (1960).", source: S.opec },
      { text: "Member of the Shanghai Cooperation Organisation (SCO).", source: S.sco },
      { text: "Member of BRICS.", source: S.brics },
    ],
  },
];

export function actorById(id: string): ActorCard | undefined {
  return ACTORS.find((a) => a.id === id);
}
