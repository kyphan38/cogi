/**
 * Crisis check for text the user writes about their own life (Reframe and Life
 * situations "My situation", and what they write later in those exercises). The
 * model also flags `safety: "concern"`, but this check runs first and does not
 * depend on the model: clear crisis words stop the exercise before anything is
 * generated. The user base writes Vietnamese too, often without accent marks.
 */
const ENGLISH_PATTERNS: RegExp[] = [
  /\bsuicid/i,
  /\bkill(ing)? my ?self\b/i,
  /\bend(ing)? (my|my own) life\b/i,
  /\bend(ing)? it all\b/i,
  /\b(want|wish|wanted) to die\b/i,
  /\bself[- ]?harm/i,
  /\b(cut|cutting|hurt|hurting|harm|harming) myself\b/i,
  /\bno reason to live\b/i,
  /\bbetter off (dead|without me)\b/i,
];

/** Vietnamese with accent marks, matched before folding ("từ từ" folds to "tu tu" too). */
const VIETNAMESE_ACCENTED_PATTERNS: RegExp[] = [/tự tử/, /tự vẫn/, /tự sát/, /tự hại/, /tự làm hại/, /tự làm đau/];

/**
 * Vietnamese folded to plain letters (accents removed, "đ" -> "d"), so text typed
 * with or without accents matches. Only phrases that rarely mean something everyday.
 */
const VIETNAMESE_FOLDED_PATTERNS: RegExp[] = [
  // "met muon chet" (tired to death) and similar are everyday talk, not a crisis.
  /(?<!\b(met|doi|nong|lanh|so|chan|ngai|xau ho|then|dau|cuoi|vui|ghen|thich|nho|ngu|lo|tuc|buc|ret|khat|them)\s)muon chet\b/,
  /\bchet (di|quach) cho (xong|roi)\b/,
  // "khong muon song o Ha Noi" (not want to live in Hanoi) is about a place, not life.
  /\bkhong (muon|thiet|con muon) song\b(?!\s+(o|chung|cung|voi|gan|xa|tai|trong|bang|nho|thue|tro))/,
  /\bhet muon song\b/,
  /\bkhong con (ly do|li do|y nghia) (gi )?(de |nao de )?song\b/,
  /\bsong (con )?(khong|chang) (con )?(co )?y nghia\b/,
  /\btu sat\b/,
  /\btu ket lieu\b/,
  /\bket lieu (cuoc doi|ban than|doi minh)\b/,
  /\btu (lam hai|lam dau|hanh ha) (ban than|minh)\b/,
  /\b(rach|cat) (co )?tay\b(?!\s*ao)/,
  /\bnhay lau\b/,
];

/**
 * "tu tu" typed without accents means "tự tử" (suicide) or "từ từ" (slowly), so it
 * only counts in text with no accent marks at all, and only after words that point
 * to suicide. Text with accents is covered by the accented patterns.
 */
const UNACCENTED_ONLY_PATTERNS: RegExp[] = [
  /\b(nghi den|nghi toi|nghi ve|y dinh|dinh|muon|tinh) (viec )?tu tu\b(?!\s+(ma|thoi|lam|hoc|tim|noi|di|ve|cung|thu|tu|xem|doc|viet|nghi|roi|nhe|truoc|sau|da))/,
  /\btu tu (chet|cho xong)\b/,
];

/** Lowercase, accents removed, "đ" -> "d": "Không muốn sống" -> "khong muon song". */
export function foldVietnamese(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d");
}

export function hasCrisisLanguage(text: string): boolean {
  if (ENGLISH_PATTERNS.some((re) => re.test(text))) return true;
  const lower = text.normalize("NFC").toLowerCase();
  if (VIETNAMESE_ACCENTED_PATTERNS.some((re) => re.test(lower))) return true;
  const folded = foldVietnamese(text);
  if (VIETNAMESE_FOLDED_PATTERNS.some((re) => re.test(folded))) return true;
  return folded === lower && UNACCENTED_ONLY_PATTERNS.some((re) => re.test(folded));
}

/** True when any of the texts has crisis language (empty and missing ones are skipped). */
export function anyCrisisLanguage(texts: (string | null | undefined)[]): boolean {
  return texts.some((t) => typeof t === "string" && t.trim() !== "" && hasCrisisLanguage(t));
}

/** Shown instead of an exercise or feedback when what the user wrote needs real support. */
export const SUPPORT_MESSAGE = {
  title: "This needs more than an exercise",
  lines: [
    "What you wrote sounds heavy. This exercise is for everyday thinking practice, and it is not the right tool for this.",
    "If you are thinking about hurting yourself, or you are in danger, contact local emergency services now.",
    "Please talk to someone you trust today. A doctor or a mental health professional can also help.",
  ],
} as const;

/**
 * Added to the generation prompt when the exercise is built from the user's own
 * situation. `emptyFields` says what to return for everything else on "concern".
 */
export function safetyFirstRule(emptyFields: string): string {
  return `SAFETY FIRST: if the situation mentions self-harm, suicide, wanting to die or disappear for good, abuse, violence, danger, or a crisis that needs real help, set "safety": "concern" and return empty strings and empty arrays for everything else (${emptyFields}). Otherwise set "safety": "ok".`;
}
