const ZERO_WIDTH_RE = /[\u200B-\u200F\uFEFF]/g;
const BIDI_RE = /[\u202A-\u202E]/g;
const CONTROL_RE = /[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g;

/** Strip common executable / embed HTML blocks before tag removal. */
function stripBlockedHtmlBlocks(input: string): string {
  let s = input;
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "");
  s = s.replace(/<iframe\b[^>]*\/?>/gi, "");
  s = s.replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, "");
  s = s.replace(/<embed\b[^>]*\/?>/gi, "");
  return s;
}

/** Remove inline event handlers and javascript: URLs from attribute-like regions. */
function stripDangerousAttributes(input: string): string {
  let s = input.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  s = s.replace(/javascript:/gi, "");
  return s;
}

function stripHtmlTags(input: string): string {
  return input.replace(/<\/?[^>\n]+>/g, "");
}

export type SanitizeRealDataResult = {
  text: string;
  wordCount: number;
  /** True when script/iframe (or similar) blocks were removed. */
  hadBlockedHtml?: boolean;
};

export function sanitizeRealDataText(input: string): SanitizeRealDataResult {
  const hadBlocked =
    /<script\b/i.test(input) ||
    /<iframe\b/i.test(input) ||
    /<object\b/i.test(input) ||
    /<embed\b/i.test(input);
  let s = input.replace(/\r\n?/g, "\n");
  s = stripBlockedHtmlBlocks(s);
  s = stripDangerousAttributes(s);
  s = stripHtmlTags(s);
  try {
    s = s.normalize("NFC");
  } catch {
    // ignore environments without String.prototype.normalize
  }
  s = s.replace(ZERO_WIDTH_RE, "").replace(BIDI_RE, "");
  s = s.replace(CONTROL_RE, "");
  s = s.replace(/\n{3,}/g, "\n\n");
  s = s.trim();
  const words = s.split(/\s+/).filter(Boolean);
  return { text: s, wordCount: words.length, hadBlockedHtml: hadBlocked };
}
