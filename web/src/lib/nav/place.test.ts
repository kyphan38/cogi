import { describe, expect, it } from "vitest";

import { navPlace } from "./place";

const show = (path: string | null) => {
  const p = navPlace(path);
  return p.page ? `${p.section.label} / ${p.page}` : p.section.label;
};

describe("navPlace", () => {
  it("names the section and the page for each path", () => {
    expect(show("/")).toBe("Today");
    expect(show(null)).toBe("Today");
    expect(show("/reasoning")).toBe("Today / New exercise");
    expect(show("/exercise/evaluative")).toBe("Today / Evaluative");
    expect(show("/exercise/judgment")).toBe("Today / Life situations");
    expect(show("/tracks")).toBe("Explore / Tracks");
    expect(show("/geo")).toBe("Explore / Geo Lab");
    expect(show("/simulators/")).toBe("Explore / Simulators");
    expect(show("/exercise/history")).toBe("History");
    expect(show("/terms")).toBe("History / My terms");
    expect(show("/handbook")).toBe("Handbook");
    expect(show("/settings")).toBe("Settings");
  });

  it("does not treat a longer word as an Explore page", () => {
    expect(show("/geography")).toBe("Today");
  });
});
