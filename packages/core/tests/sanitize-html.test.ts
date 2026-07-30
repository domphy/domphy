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
    const uppercase = sanitizeHTMLString("<img src=x ONERROR=alert(1)/>");
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

  it("strips iframe srcdoc attributes (embedded document is unsanitizable)", () => {
    const result = sanitizeHTMLString(
      '<iframe srcdoc="<script>alert(1)</script>">x</iframe>',
    );
    expect(result).not.toContain("srcdoc");
    expect(result).not.toContain("alert(1)");
    expect(result).toContain("<iframe");
  });

  it("strips srcdoc with unquoted and slash-preceded forms", () => {
    expect(sanitizeHTMLString("<iframe srcdoc=evil>")).not.toContain("srcdoc");
    expect(sanitizeHTMLString("<iframe/srcdoc=evil>")).not.toContain("srcdoc");
  });

  it("neutralises entity-encoded javascript: schemes", () => {
    const decimal = sanitizeHTMLString(
      '<a href="&#106;avascript:alert(1)">x</a>',
    );
    expect(decimal).toContain('href="#"');
    expect(decimal).not.toContain("&#106;avascript");

    const hex = sanitizeHTMLString('<a href="&#x6A;avascript:alert(1)">x</a>');
    expect(hex).toContain('href="#"');
  });

  it("neutralises whitespace/control-obfuscated schemes", () => {
    const tabbed = sanitizeHTMLString('<a href="java\tscript:alert(1)">x</a>');
    expect(tabbed).toContain('href="#"');

    const newlined = sanitizeHTMLString(
      '<a href="java\nscript:alert(1)">x</a>',
    );
    expect(newlined).toContain('href="#"');

    const entityTab = sanitizeHTMLString(
      '<a href="java&Tab;script:alert(1)">x</a>',
    );
    expect(entityTab).toContain('href="#"');

    const leading = sanitizeHTMLString('<a href="  javascript:alert(1)">x</a>');
    expect(leading).toContain('href="#"');
  });

  it("neutralises vbscript: and object@data / data:text/html vectors", () => {
    const vbscript = sanitizeHTMLString('<a href="vbscript:msgbox(1)">x</a>');
    expect(vbscript).toContain('href="#"');

    const objectJs = sanitizeHTMLString(
      '<object data="javascript:alert(1)"></object>',
    );
    expect(objectJs).toContain('data="#"');
    expect(objectJs).not.toContain("javascript:");

    const objectHtml = sanitizeHTMLString(
      '<object data="data:text/html,<b>evil</b>"></object>',
    );
    expect(objectHtml).toContain('data="#"');

    const iframeData = sanitizeHTMLString(
      '<iframe src="data:text/html;base64,PHNjcmlwdD4="></iframe>',
    );
    expect(iframeData).toContain('src="#"');
  });

  it("keeps safe data: URLs (images are a legitimate src)", () => {
    const safe = '<img src="data:image/png;base64,iVBORw0KGgo=">';
    expect(sanitizeHTMLString(safe)).toBe(safe);
  });

  it("keeps attribute text containing the literal '<script>' (false-positive regression)", () => {
    // The old unclosed-script catch-all truncated the string from the
    // attribute text onward: sanitizeHTMLString returned '<div title="'.
    const benign = '<div title="<script>">keep</div>';
    expect(sanitizeHTMLString(benign)).toBe(benign);
  });

  it("still strips an unclosed <script> to the end of the string", () => {
    const result = sanitizeHTMLString("<div>ok</div><script>alert(1)");
    expect(result).toBe("<div>ok</div>");
  });

  it("strips script tags whose attributes contain '>'", () => {
    const result = sanitizeHTMLString(
      '<script type="text/x-template">alert(1)</script><p>ok</p>',
    );
    expect(result).toBe("<p>ok</p>");
  });

  it("keeps safe markup untouched", () => {
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
