import { describe, expect, it } from "vitest";
import { parseDomainSuggestions } from "./domain-suggestions-parse";
import { buildDomainSuggestionsPrompt } from "./prompts/domain-suggestions";

describe("parseDomainSuggestions", () => {
  it("keeps valid items, drops broken, repeated and excluded ones", () => {
    const raw = JSON.stringify([
      { domain: "Family", subdomain: "Who looks after an ageing parent", why: "Weigh duties." },
      { domain: "Family", subdomain: "who looks after an  ageing parent", why: "Repeat." },
      { domain: "Work", subdomain: "Asking for a raise", why: "Already shown." },
      { domain: "Money", subdomain: "", why: "Empty." },
      { nope: true },
    ]);
    expect(parseDomainSuggestions(raw, ["Asking for a raise"])).toEqual([
      { domain: "Family", subdomain: "Who looks after an ageing parent", why: "Weigh duties." },
    ]);
  });

  it("accepts fenced JSON and returns null for nothing usable", () => {
    expect(parseDomainSuggestions('```json\n[{"domain":"A","subdomain":"B c","why":"D"}]\n```', [])).toHaveLength(1);
    expect(parseDomainSuggestions("not json", [])).toBeNull();
    expect(parseDomainSuggestions("[]", [])).toBeNull();
  });
});

describe("buildDomainSuggestionsPrompt", () => {
  it("anchors on the catalog groups that fit the mode and lists what to avoid", () => {
    const p = buildDomainSuggestionsPrompt({ mode: "reframe", exclude: ["Old idea"], recentDomains: ["Work"] });
    expect(p).toContain("Mind & emotions");
    expect(p).not.toContain("Technology & engineering");
    expect(p).toContain("- Old idea");
    expect(p).toContain("- Work");
  });
});
