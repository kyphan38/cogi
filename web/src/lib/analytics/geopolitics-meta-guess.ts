function significantTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length >= 4),
  );
}

/** Light local score (0–100) for perspective + missing-actor guesses. */
export function computeMetaGuessScore(
  hiddenPerspective: string,
  missingActors: string[],
  userPerspectiveGuess: string,
  userMissingActorsGuess: string[],
): number {
  const hidden = significantTokens(hiddenPerspective);
  const guess = significantTokens(userPerspectiveGuess);
  let overlap = 0;
  for (const w of guess) {
    if (hidden.has(w)) overlap++;
  }
  const denom = Math.max(1, Math.min(hidden.size, guess.size));
  const perspectiveScore = Math.min(70, Math.round((overlap / denom) * 70));

  let actorScore = 0;
  for (const ug of userMissingActorsGuess) {
    const t = ug.trim();
    if (!t) continue;
    const ul = t.toLowerCase();
    const hit = missingActors.some(
      (m) =>
        m.toLowerCase().includes(ul) ||
        ul.includes(m.toLowerCase()),
    );
    if (hit) actorScore += 15;
  }

  return Math.min(100, perspectiveScore + Math.min(30, actorScore));
}
