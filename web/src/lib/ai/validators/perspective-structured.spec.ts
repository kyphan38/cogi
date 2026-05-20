import assert from "node:assert/strict";
import {
  parseLegacyPerspectiveJson,
  parseStructuredPerspectiveJson,
} from "./perspective-structured";

const analyticalV2 = {
  perspectiveFormat: "clarity_v2",
  title: "Test Exercise",
  suitableFor: "Suitable for policy analysts reviewing trade memos",
  highlightCritiques: [
    {
      userTextSnippet: "tariffs will stabilize supply chains",
      critique: "You highlighted 'tariffs will stabilize supply chains'. However, this assumes...",
      remediationAlternative: "A stronger read would note...",
    },
  ],
  openQuestions: ["What data would falsify this?"],
};

const legacy = {
  embedded: [{ id: "e1", body: "Embedded point" }],
  userFound: [],
  additional: [{ id: "a1", body: "Additional" }],
  openQuestions: [{ id: "o1", body: "Open?" }],
};

const analyticalParsed = parseStructuredPerspectiveJson(
  JSON.stringify(analyticalV2),
  "analytical",
);
assert.equal(analyticalParsed.success, true);
if (analyticalParsed.success) assert.equal(analyticalParsed.format, "clarity_v2");

const legacyParsed = parseStructuredPerspectiveJson(JSON.stringify(legacy), "analytical");
assert.equal(legacyParsed.success, true);
if (legacyParsed.success) assert.equal(legacyParsed.format, "legacy");

const legacyOnly = parseLegacyPerspectiveJson(JSON.stringify(legacy));
assert.equal(legacyOnly.success, true);

const bad = { title: "x" };
assert.equal(parseStructuredPerspectiveJson(JSON.stringify(bad), "generative").success, false);

console.log("perspective-structured.spec.ts: all assertions passed");
