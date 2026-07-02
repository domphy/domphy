import { describe, expect, it } from "vitest";
import { escapeHTML, sanitizeHTMLString } from "../src/helpers.ts";

describe("sanitizeHTMLString", () => {
  it("strips a standard whitespace-preceded on* handler", () => {
    const result = sanitizeHTMLString('<img src="x" onerror="alert(1)">');
    expect(result).not.toContain("onerror");
    expect(result).toContain('src="x"');
  });

  it("strips on* handlers preceded by '/' (e.g. <svg/onload=...>)", () => {
    const result = sanitizeHTMLString("<svg/onload=alert(1)>");
    // The `/on...=value` form must be neutralised; the slash is preserved.
    expect(result).not.toContain("onload");
    expect(result).not.toContain("alert(1)");
    expect(result).toContain("/");
  });

  it("strips a quoted '/' on* handler", () => {
    const result = sanitizeHTMLString('<svg/onload="alert(1)">');
    expect(result).not.toContain("onload");
    expect(result).not.toContain("alert(1)");
  });

  it("strips uppercase/mixed-case on* handlers (case-insensitive bypass)", () => {
    const uppercase = sanitizeHTMLString('<img src=x ONERROR=alert(1)/>');
    expect(uppercase).not.toMatch(/onerror/i);
    expect(uppercase).not.toContain("alert(1)");

    const mixedCase = sanitizeHTMLString('<div OnClick="alert(1)">x</div>');
    expect(mixedCase).not.toMatch(/onclick/i);
    expect(mixedCase).not.toContain("alert(1)");

    const slashForm = sanitizeHTMLString("<svg/OnLoad=alert(1)>");
    expect(slashForm).not.toMatch(/onload/i);
    expect(slashForm).not.toContain("alert(1)");
  });

  it("neutralises javascript: URLs in href/src", () => {
    const result = sanitizeHTMLString('<a href="javascript:alert(1)">x</a>');
    expect(result).not.toContain("javascript:alert");
    expect(result).toContain('href="#');
  });

  it("leaves safe markup untouched", () => {
    const safe = '<a href="/home" class="link">Home</a>';
    expect(sanitizeHTMLString(safe)).toBe(safe);
  });
});

describe("escapeHTML", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(escapeHTML(`<div class="a">Tom & Jerry's</div>`)).toBe(
      "&lt;div class=&quot;a&quot;&gt;Tom &amp; Jerry&#39;s&lt;/div&gt;",
    );
  });

  it("escapes ampersand first so existing entities are not double-decoded", () => {
    expect(escapeHTML("&amp;")).toBe("&amp;amp;");
  });
});
