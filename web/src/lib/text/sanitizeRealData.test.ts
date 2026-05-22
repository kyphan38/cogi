import { describe, expect, it } from "vitest";
import { sanitizeRealDataText } from "./sanitizeRealData";

describe("sanitizeRealDataText", () => {
  it("passes through plain text unchanged", () => {
    const r = sanitizeRealDataText("Hello world");
    expect(r.text).toBe("Hello world");
    expect(r.wordCount).toBe(2);
    expect(r.hadBlockedHtml).toBe(false);
  });

  it("strips HTML tags", () => {
    const r = sanitizeRealDataText("<p>Hello</p> <b>world</b>");
    expect(r.text).toBe("Hello world");
  });

  it("strips script tags and flags hadBlockedHtml", () => {
    const r = sanitizeRealDataText('before<script>alert("xss")</script>after');
    expect(r.text).toBe("beforeafter");
    expect(r.hadBlockedHtml).toBe(true);
  });

  it("strips iframe tags and flags hadBlockedHtml", () => {
    const r = sanitizeRealDataText('text<iframe src="x"></iframe>more');
    expect(r.text).toBe("textmore");
    expect(r.hadBlockedHtml).toBe(true);
  });

  it("strips object and embed tags (including content)", () => {
    const r = sanitizeRealDataText("before<object>data</object><embed/>after");
    expect(r.text).toBe("beforeafter");
    expect(r.hadBlockedHtml).toBe(true);
  });

  it("strips style tags", () => {
    const r = sanitizeRealDataText("<style>.x{color:red}</style>visible");
    expect(r.text).toBe("visible");
  });

  it("strips HTML comments", () => {
    const r = sanitizeRealDataText("before<!-- comment -->after");
    expect(r.text).toBe("beforeafter");
  });

  it("removes inline event handlers", () => {
    const r = sanitizeRealDataText('<div onclick="alert(1)">text</div>');
    expect(r.text).not.toContain("onclick");
    expect(r.text).toContain("text");
  });

  it("removes javascript: URLs", () => {
    const r = sanitizeRealDataText('<a href="javascript:void(0)">link</a>');
    expect(r.text).not.toContain("javascript:");
  });

  it("removes zero-width characters", () => {
    const r = sanitizeRealDataText("hello​world");
    expect(r.text).toBe("helloworld");
  });

  it("removes BiDi override characters", () => {
    const r = sanitizeRealDataText("hello‪world‮");
    expect(r.text).toBe("helloworld");
  });

  it("removes control characters", () => {
    const r = sanitizeRealDataText("hello\x01\x02world");
    expect(r.text).toBe("helloworld");
  });

  it("collapses excessive newlines", () => {
    const r = sanitizeRealDataText("a\n\n\n\n\nb");
    expect(r.text).toBe("a\n\nb");
  });

  it("normalizes CRLF to LF", () => {
    const r = sanitizeRealDataText("line1\r\nline2\rline3");
    expect(r.text).toBe("line1\nline2\nline3");
  });

  it("trims leading and trailing whitespace", () => {
    const r = sanitizeRealDataText("  hello world  ");
    expect(r.text).toBe("hello world");
  });

  it("counts words correctly", () => {
    const r = sanitizeRealDataText("one two  three\nfour");
    expect(r.wordCount).toBe(4);
  });

  it("returns 0 word count for empty input", () => {
    const r = sanitizeRealDataText("   ");
    expect(r.text).toBe("");
    expect(r.wordCount).toBe(0);
  });

  it("handles combined dangerous content", () => {
    const input = `
      <!-- hidden -->
      <script>evil()</script>
      <p onclick="bad()">Hello</p>
      <iframe src="javascript:alert(1)"></iframe>
      <style>.x{}</style>
      Clean text here.
    `;
    const r = sanitizeRealDataText(input);
    expect(r.hadBlockedHtml).toBe(true);
    expect(r.text).not.toContain("script");
    expect(r.text).not.toContain("onclick");
    expect(r.text).not.toContain("javascript:");
    expect(r.text).not.toContain("iframe");
    expect(r.text).toContain("Hello");
    expect(r.text).toContain("Clean text here.");
  });
});
