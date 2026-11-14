import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("keeps a type size next to a text color", () => {
    expect(cn("text-meta", "text-foreground")).toBe("text-meta text-foreground");
    expect(cn("text-label text-muted-foreground")).toBe("text-label text-muted-foreground");
  });

  it("lets a later type size win over an earlier one", () => {
    expect(cn("text-sm", "text-body")).toBe("text-body");
    expect(cn("text-page", "text-lead")).toBe("text-lead");
  });
});
