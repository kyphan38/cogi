import { describe, expect, it } from "vitest";

import { NAV_GROUPS, navPlace } from "./place";

const show = (path: string | null) => {
  const p = navPlace(path);
  return `${p.group.label} / ${p.exercise ?? p.page?.label ?? "-"}`;
};

describe("navPlace", () => {
  it("names the group and the page for each path", () => {
    expect(show("/")).toBe("Practice / Today");
    expect(show(null)).toBe("Practice / Today");
    expect(show("/quick")).toBe("Practice / 5-minute question");
    expect(show("/tracks")).toBe("Practice / Tracks");
    expect(show("/reasoning")).toBe("Practice / New exercise");
    expect(show("/exercise/evaluative")).toBe("Practice / Evaluative");
    expect(show("/exercise/judgment")).toBe("Practice / Life situations");
    expect(show("/geo")).toBe("Labs / Geo Lab");
    expect(show("/simulators/")).toBe("Labs / Simulators");
    expect(show("/briefs")).toBe("Labs / Briefs");
    expect(show("/exercise/history")).toBe("Memory / Past exercises");
    expect(show("/terms")).toBe("Memory / My terms");
    expect(show("/terms/review")).toBe("Memory / Review terms");
    expect(show("/forecasts")).toBe("Memory / Forecasts");
    expect(show("/handbook")).toBe("Guide / Handbook");
    expect(show("/settings")).toBe("Guide / Settings");
  });

  it("keeps a sub path in its page, but not a longer word", () => {
    expect(show("/tracks/abc")).toBe("Practice / Tracks");
    expect(show("/geography")).toBe("Practice / Today");
  });

  it("opens each group on its first page", () => {
    for (const g of NAV_GROUPS) expect(g.href).toBe(g.pages[0].href);
  });
});
