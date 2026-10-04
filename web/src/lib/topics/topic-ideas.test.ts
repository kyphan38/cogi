import { describe, expect, it } from "vitest";
import {
  AI_TOPIC_MODES,
  calibrationIdeas,
  groupsForMode,
  keepValidIdeas,
  MAX_PER_MODE,
  requestErrors,
  titleKey,
  TOPIC_GROUPS,
  topicGroupOfDomain,
  withCalibrationSlot,
  type RawTopicIdea,
  type TopicIdeaRequest,
} from "./topic-ideas";
import { buildTopicIdeasPrompt } from "@/lib/ai/prompts/topic-ideas";

const all: TopicIdeaRequest = { mode: "all", exclude: [] };
const idea = (title: string, mode: string, group = "life-personal", domain = ""): RawTopicIdea => ({ title, mode, group, domain });

describe("topic groups", () => {
  it("covers every AI mode, and geopolitics groups get the geo modes", () => {
    for (const m of AI_TOPIC_MODES) expect(groupsForMode(m).length, m).toBeGreaterThan(0);
    const geo = TOPIC_GROUPS.find((g) => g.id.startsWith("geo"))!;
    expect(geo.modes).toEqual(["analytical", "systems", "evaluative", "strategy"]);
    expect(TOPIC_GROUPS.every((g) => !g.domains.includes("Custom domain"))).toBe(true);
    expect(TOPIC_GROUPS.every((g) => !(g.modes as string[]).includes("calibration"))).toBe(true);
  });

  it("finds the group of a catalog domain", () => {
    expect(topicGroupOfDomain("DevOps / SRE")?.id).toBe("technology");
    expect(topicGroupOfDomain("Something else")).toBeUndefined();
  });
});

describe("request checks", () => {
  it("accepts any mode with any filter that fits, and rejects the rest", () => {
    expect(requestErrors(all)).toEqual([]);
    expect(requestErrors({ mode: "judgment", groupId: "life-personal", exclude: [] })).toEqual([]);
    expect(requestErrors({ mode: "calibration" as never, exclude: [] })[0]).toContain("Unknown mode");
    expect(requestErrors({ mode: "all", groupId: "nope", exclude: [] })[0]).toContain("Unknown group");
    expect(requestErrors({ mode: "all", groupId: "technology", domain: "Family", exclude: [] })[0]).toContain("not a domain");
    expect(requestErrors({ mode: "reframe", groupId: "technology", exclude: [] })[0]).toContain("does not fit");
  });
});

describe("keeping valid ideas", () => {
  it("drops wrong modes, modes that do not fit the group, bad lengths, Vietnamese and repeats", () => {
    const kept = keepValidIdeas(
      [
        idea("A friend keeps borrowing money and never pays it back", "judgment"),
        idea("A friend keeps borrowing money and never pays it back!", "judgment"),
        idea("Too short", "judgment"),
        idea("A server goes down during the busiest sales day", "reframe", "technology"),
        idea("Choosing between two job offers in different cities", "calibration"),
        idea("Một người bạn mượn tiền rồi không trả lại", "judgment"),
        idea("Your sister wants you to lend her your savings", "judgment", "unknown-group"),
      ],
      all,
    );
    expect(kept.map((k) => k.title)).toEqual(["A friend keeps borrowing money and never pays it back"]);
    expect(kept[0]!.domain).toBe(TOPIC_GROUPS.find((g) => g.id === "life-personal")!.domains[0]);
  });

  it("removes practised topics, ignoring case and punctuation", () => {
    const kept = keepValidIdeas([idea("Choosing between two job offers in different cities", "evaluative")], {
      ...all,
      exclude: ["choosing between two job offers, in different cities."],
    });
    expect(kept).toEqual([]);
    expect(titleKey("  Hello,   World! ")).toBe("hello world");
  });

  it("keeps at most two rows per mode with All modes, but not with one mode", () => {
    const raw = [1, 2, 3, 4].map((n) => idea(`Deciding whether to move house number ${n} this year`, "evaluative"));
    expect(keepValidIdeas(raw, all)).toHaveLength(MAX_PER_MODE);
    expect(keepValidIdeas(raw, { mode: "evaluative", exclude: [] })).toHaveLength(4);
    expect(keepValidIdeas([idea("A friend keeps borrowing money and never pays it back", "judgment")], { mode: "evaluative", exclude: [] })).toEqual([]);
  });

  it("lets each mode take 3 rows when only 4 modes fit (geopolitics), so the list can reach 10", () => {
    const geo: TopicIdeaRequest = { mode: "all", groupId: "geo-regional", exclude: [] };
    const raw = [1, 2, 3, 4].map((n) => idea(`Two neighbours argue over a shared river dam plan ${n}`, "strategy", "geo-regional"));
    expect(keepValidIdeas(raw, geo)).toHaveLength(3);
    expect(buildTopicIdeasPrompt(geo, 14)).toContain("no mode more than 3 times");
  });

  it("forces the chosen group and domain", () => {
    const kept = keepValidIdeas([idea("Picking a cloud provider for a small online shop", "evaluative", "life-personal")], {
      mode: "all",
      groupId: "technology",
      domain: "DevOps / SRE",
      exclude: [],
    });
    expect(kept[0]).toMatchObject({ groupId: "technology", domain: "DevOps / SRE" });
  });

  it("counts rows already on the list when topping up", () => {
    const first = keepValidIdeas([idea("Deciding whether to move house this year or next", "evaluative"), idea("Choosing a school for your child in a new city", "evaluative")], all);
    const more = keepValidIdeas([idea("Choosing between renting and buying a small flat", "evaluative")], all, first);
    expect(more).toEqual([]);
  });
});

describe("calibration slot", () => {
  const ten = keepValidIdeas(
    ["judgment", "evaluative", "strategy", "systems", "analytical"].flatMap((m) =>
      [1, 2].map((n) => idea(`Practice situation number ${n} for the ${m} mode today`, m, m === "judgment" ? "life-personal" : "business-economy")),
    ),
    all,
  );

  it("adds one bank row half of the time with All modes and no domain, keeping 10 rows", () => {
    expect(ten).toHaveLength(10);
    const withSlot = withCalibrationSlot(ten, all, () => 0.1);
    expect(withSlot).toHaveLength(10);
    expect(withSlot[9]!.mode).toBe("calibration");
    expect(withCalibrationSlot(ten, all, () => 0.9).some((i) => i.mode === "calibration")).toBe(false);
    expect(withCalibrationSlot(ten, { ...all, groupId: "technology" }, () => 0.1).some((i) => i.mode === "calibration")).toBe(false);
    expect(withCalibrationSlot(ten, { mode: "judgment", exclude: [] }, () => 0.1).some((i) => i.mode === "calibration")).toBe(false);
  });

  it("lists the question bank topics for Calibration", () => {
    expect(calibrationIdeas().map((c) => c.domain)).toContain("Geography");
  });
});

describe("prompt", () => {
  it("narrows the groups and modes to the filters and lists what to avoid", () => {
    const p = buildTopicIdeasPrompt({ mode: "reframe", exclude: ["A friend forgets your birthday"] }, 14);
    expect(p).toContain("- reframe:");
    expect(p).not.toContain("- strategy:");
    expect(p).not.toContain('id "technology"');
    expect(p).toContain("- A friend forgets your birthday");
    expect(p).toContain("exactly 14 ideas");
    const geo = buildTopicIdeasPrompt({ mode: "all", groupId: "geo-regional", exclude: [] }, 14);
    expect(geo).toContain("FACT SAFETY");
    expect(buildTopicIdeasPrompt(all, 14)).toContain("at least 4 different modes");
  });
});
