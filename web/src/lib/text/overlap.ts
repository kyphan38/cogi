const STOP = new Set(
  "about after again also because been before being both could does doing from have here into just like made make more most much must only other over really same should some still such than that their them then there these they this those very want were what when where which while will with would your yours".split(
    " ",
  ),
);

/** Content words: lowercase, 4+ letters, not a common function word. */
export function contentWords(text: string): Set<string> {
  return new Set((text.toLowerCase().match(/[a-z']{4,}/g) ?? []).filter((w) => !STOP.has(w)));
}

/**
 * True when `b` repeats most of `a`'s content words: at least 3 of them, and at least
 * half. Used to stop one line giving away another, e.g. a fair thought that already is
 * the balanced rewrite.
 */
export function mostlyRepeats(a: string, b: string): boolean {
  const wa = contentWords(a);
  if (wa.size === 0) return false;
  const wb = contentWords(b);
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared += 1;
  return shared >= 3 && shared / wa.size >= 0.5;
}
