// @vitest-environment jsdom
//
// Adversarial regression coverage for sanitizeHTMLString — attack vectors
// verified against a REAL HTML parser (jsdom implements the HTML5 tokenizer),
// not just string matching. Each test sanitizes an attack payload, re-parses
// the output the way the browser would, and asserts the dangerous construct
// is gone from the resulting DOM.
import { describe, expect, it } from "vitest";
import { sanitizeHTMLString } from "../src/helpers.ts";

const parseFirst = (html: string): Element | null => {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  return tpl.content.firstElementChild;
};

describe("sanitizeHTMLString — parser-verified attack vectors", () => {
  it('strips a quote-glued on* handler (<img src="x"onerror=…>)', () => {
    // Premise (HTML5 tokenizer): a quoted value ends at its closing quote and
    // the next characters recover as a NEW attribute even with no whitespace.
    const raw = parseFirst('<img src="x"onerror="alert(1)">');
    expect(raw?.getAttribute("onerror")).toBe("alert(1)");

    const out = sanitizeHTMLString('<img src="x"onerror="alert(1)">');
    const el = parseFirst(out);
    expect(el?.hasAttribute("onerror")).toBe(false);
    expect(el?.getAttribute("src")).toBe("x");
  });

  it("strips quote-glued handlers with single quotes and unquoted values", () => {
    const single = sanitizeHTMLString("<img src='x'onerror='alert(1)'>");
    expect(parseFirst(single)?.hasAttribute("onerror")).toBe(false);

    const unquoted = sanitizeHTMLString('<img src="x"onerror=alert(1)>');
    expect(parseFirst(unquoted)?.hasAttribute("onerror")).toBe(false);

    const upper = sanitizeHTMLString('<img src="x"ONERROR="alert(1)">');
    expect(parseFirst(upper)?.hasAttribute("onerror")).toBe(false);
  });

  it("strips a quote-glued iframe srcdoc", () => {
    const raw = parseFirst('<iframe src="x"srcdoc="<b>evil</b>"></iframe>');
    expect(raw?.getAttribute("srcdoc")).toBe("<b>evil</b>");

    const out = sanitizeHTMLString(
      '<iframe src="x"srcdoc="<b>evil</b>"></iframe>',
    );
    expect(parseFirst(out)?.hasAttribute("srcdoc")).toBe(false);
  });

  it("neutralises the &colon; entity scheme bypass", () => {
    // Premise: browsers decode &colon; inside attribute values, completing
    // the scheme — the string check must canonicalize it the same way.
    const raw = parseFirst('<a href="javascript&colon;alert(1)">x</a>');
    expect(raw?.getAttribute("href")).toBe("javascript:alert(1)");

    const out = sanitizeHTMLString('<a href="javascript&colon;alert(1)">x</a>');
    expect(parseFirst(out)?.getAttribute("href")).toBe("#");

    const upper = sanitizeHTMLString(
      '<a href="javascript&COLON;alert(1)">x</a>',
    );
    expect(parseFirst(upper)?.getAttribute("href")).toBe("#");

    const data = sanitizeHTMLString(
      '<iframe src="data:text/html&colon;<b>evil</b>"></iframe>',
    );
    expect(parseFirst(data)?.getAttribute("src")).toBe("#");
  });

  it("keeps &colon; in safe URLs untouched", () => {
    const safe = '<a href="https://example.com/a&colon;b">x</a>';
    expect(sanitizeHTMLString(safe)).toBe(safe);
  });

  it("neutralises a glued dangerous href (already covered by the scheme pass)", () => {
    const out = sanitizeHTMLString(
      '<a title="x"href="javascript:alert(1)">x</a>',
    );
    expect(parseFirst(out)?.getAttribute("href")).toBe("#");
  });
});
