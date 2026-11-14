import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PageHeader } from "./PageHeader";
import { Section } from "./Section";

describe("PageHeader", () => {
  it("renders the title as h1 with the page size", () => {
    const html = renderToStaticMarkup(createElement(PageHeader, { title: "Today" }));
    expect(html).toContain('<h1 class="text-page text-foreground">Today</h1>');
    expect(html).not.toContain("<p");
  });

  it("renders sub and action when given", () => {
    const html = renderToStaticMarkup(
      createElement(PageHeader, {
        title: "Explore",
        sub: "One step a day.",
        action: createElement("a", { href: "/x" }, "Open"),
      }),
    );
    expect(html).toContain("One step a day.");
    expect(html).toContain('<a href="/x">Open</a>');
  });
});

describe("Section", () => {
  it("renders the label as h2 and the action", () => {
    // Section has no hooks, so calling it directly gives its element tree.
    const html = renderToStaticMarkup(Section({ title: "Next up", action: "all", children: "body" }));
    expect(html).toContain('<h2 class="section-label">Next up</h2>');
    expect(html).toContain("all");
    expect(html).toContain("body");
  });
});
