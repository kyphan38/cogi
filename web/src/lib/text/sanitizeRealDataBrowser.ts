"use client";

import { sanitizeRealDataText, type SanitizeRealDataResult } from "@/lib/text/sanitizeRealData";

/**
 * Prefer plain-text clipboard path; if HTML is pasted, parse to text in the browser
 * (DOMParser) and drop script/iframe nodes before the shared sanitizer runs.
 */
export function sanitizeUserPasteOrClipboard(
  input: string,
): SanitizeRealDataResult & { htmlRejected?: boolean } {
  const trimmed = input.trim();
  if (typeof document !== "undefined" && trimmed.startsWith("<")) {
    try {
      const doc = new DOMParser().parseFromString(
        trimmed.includes("<body") ? trimmed : `<body>${trimmed}</body>`,
        "text/html",
      );
      if (doc.querySelector("script, iframe, object, embed")) {
        return { ...sanitizeRealDataText(""), wordCount: 0, htmlRejected: true };
      }
      doc.querySelectorAll("script, iframe, style, object, embed").forEach((el) => el.remove());
      const plain = doc.body?.textContent ?? "";
      return sanitizeRealDataText(plain);
    } catch {
      return sanitizeRealDataText(input);
    }
  }
  return sanitizeRealDataText(input);
}
