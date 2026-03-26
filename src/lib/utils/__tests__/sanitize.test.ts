import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "../sanitize";

describe("sanitizeHtml", () => {
  it("passes through safe formatting tags", () => {
    const html = '<p>Hello <b>bold</b> <em>italic</em> <mark>highlighted</mark></p>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it("allows links with href, target, rel", () => {
    const html = '<a href="https://example.com" target="_blank" rel="noopener">link</a>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it("strips script tags", () => {
    expect(sanitizeHtml('<p>hi</p><script>alert("xss")</script>')).toBe("<p>hi</p>");
  });

  it("strips onerror attributes", () => {
    expect(sanitizeHtml('<img onerror="alert(1)" src="x">')).toBe("");
  });

  it("strips javascript: hrefs", () => {
    const result = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(result).not.toContain("javascript:");
  });

  it("strips iframe tags", () => {
    expect(sanitizeHtml('<iframe src="https://evil.com"></iframe>')).toBe("");
  });

  it("strips style attributes", () => {
    const result = sanitizeHtml('<p style="color:red">text</p>');
    expect(result).toBe("<p>text</p>");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeHtml("")).toBe("");
  });

  it("preserves list structures", () => {
    const html = "<ul><li>one</li><li>two</li></ul>";
    expect(sanitizeHtml(html)).toBe(html);
  });
});
