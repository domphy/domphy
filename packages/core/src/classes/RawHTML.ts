// Explicit opt-in for rendering a string as HTML instead of text.
//
// A plain string child is ALWAYS rendered as text (escaped on the server,
// createTextNode on the client). Markup only becomes live DOM when it is
// wrapped in `rawHtml(...)`, which makes every injection site greppable and
// keeps user-supplied strings inert by default.
//
// The wrapped string still passes through `sanitizeHTMLString` (script tags,
// on* handlers and javascript: URLs are stripped) — defense in depth, not a
// full sanitizer. Never wrap untrusted input.
export class RawHTML {
  // Branded so a duplicated module copy (two @domphy/core instances in one
  // dependency tree) still recognizes the wrapper — instanceof would not.
  readonly __domphyRawHTML = true as const;
  readonly html: string;

  constructor(html: string) {
    this.html = html;
  }
}

export function rawHtml(html: string): RawHTML {
  return new RawHTML(html);
}

export function isRawHTML(value: unknown): value is RawHTML {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as RawHTML).__domphyRawHTML === true
  );
}
