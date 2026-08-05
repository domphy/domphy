import type { ElementNode } from "./classes/ElementNode.js";
import { getConfig } from "./config.js";
import { HtmlTags } from "./constants/HtmlTags.js";
import { eventNameMap } from "./types/EventProperties.js";
import type {
  DomphyElement,
  HookMap,
  PartialElement,
  TagName,
} from "./types.js";
import { merge } from "./utils.js";

export function addHook<K extends keyof HookMap>(
  partial: PartialElement,
  hookName: K,
  handler: HookMap[K],
): void {
  const hookProperty = `_on${hookName}` as keyof PartialElement;
  const current = partial[hookProperty];

  if (typeof current === "function") {
    (partial as any)[hookProperty] = (...args: any[]) => {
      (current as Function)(...args);
      (handler as Function)(...args);
    };
  } else {
    (partial as any)[hookProperty] = handler;
  }
}

export function addEvent<K extends keyof HTMLElementEventMap>(
  attributes: PartialElement,
  eventName: K,
  handler: (event: HTMLElementEventMap[K], node: ElementNode) => void,
): void {
  const eventProperty = eventNameMap[eventName];
  if (!eventProperty) {
    throw Error(`invalid event name "${eventName}"`);
  }
  const current = (attributes as any)[eventProperty];

  if (typeof current === "function") {
    (attributes as any)[eventProperty] = (
      event: HTMLElementEventMap[K],
      node: ElementNode,
    ) => {
      current(event, node);
      handler(event, node);
    };
  } else {
    (attributes as any)[eventProperty] = handler;
  }
}

export function deepClone(value: any, seen = new WeakMap()): any {
  if (value === null || typeof value !== "object") return value;
  if (typeof value === "function") return value;
  if (seen.has(value)) return seen.get(value);

  let clone: any;

  if (Array.isArray(value)) {
    clone = [];
    seen.set(value, clone);
    for (const v of value) clone.push(deepClone(v, seen));
    return clone;
  }

  // These built-in types must be checked BEFORE the class-instance bailout
  // below, otherwise their prototype (not Object.prototype) makes the
  // bailout return them by reference and these branches become dead code.
  if (value instanceof Date) return new Date(value);
  if (value instanceof RegExp) return new RegExp(value);
  if (value instanceof Map) {
    clone = new Map();
    seen.set(value, clone);
    for (const [k, v] of value)
      clone.set(deepClone(k, seen), deepClone(v, seen));
    return clone;
  }
  if (value instanceof Set) {
    clone = new Set();
    seen.set(value, clone);
    for (const v of value) clone.add(deepClone(v, seen));
    return clone;
  }
  if (ArrayBuffer.isView(value)) {
    return new (value as any).constructor(value);
  }
  if (value instanceof ArrayBuffer) {
    return value.slice(0);
  }

  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype) return value; // ignore class instance (State, ElementNode, ...)

  clone = Object.create(proto);
  seen.set(value, clone);

  for (const key of Reflect.ownKeys(value)) {
    clone[key] = deepClone(value[key], seen);
  }

  return clone;
}

export function validate(
  element: DomphyElement | PartialElement,
  asPartial = false,
): boolean {
  if (Object.prototype.toString.call(element) !== "[object Object]") {
    throw Error(`typeof ${element} is invalid DomphyElement`);
  }
  const keys = Object.keys(element);
  if (keys.length === 0 && !asPartial) {
    throw Error("element object has no tag key");
  }
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const val = element[key as keyof typeof element];
    if (i === 0 && !HtmlTagSet.has(key) && !asPartial) {
      throw Error(`key ${key} is not valid HTML tag name`);
    } else if (
      key === "style" &&
      val &&
      Object.prototype.toString.call(val) !== "[object Object]"
    ) {
      throw Error(`"style" must be a object`);
    } else if (key === "$") {
      if (!Array.isArray(val)) {
        throw Error(
          `"$" must be an array of patch objects, received ${
            val === null ? "null" : typeof val
          } on element { ${keys.join(", ")} } — wrap patches in an array, e.g. $: [patch()]`,
        );
      }
      val.forEach((v) => validate(v as PartialElement, true));
    } else if (key.startsWith("_on") && typeof val !== "function") {
      throw Error(`hook ${key} value "${val}" must be a function `);
    } else if (key.startsWith("on") && typeof val !== "function") {
      throw Error(`event ${key} value "${val}" must be a function `);
    } else if (key === "_portal" && typeof val !== "function") {
      throw Error(`"_portal" must be a function return HTMLElement`);
    } else if (
      key === "_context" &&
      Object.prototype.toString.call(val) !== "[object Object]"
    ) {
      throw Error(`"_context" must be a object`);
    } else if (
      key === "_metadata" &&
      Object.prototype.toString.call(val) !== "[object Object]"
    ) {
      throw Error(`"_metadata" must be a object`);
    } else if (
      key === "_key" &&
      typeof val !== "string" &&
      typeof val !== "number"
    ) {
      throw Error(`"_key" must be a string or number`);
    }
  }
  return true;
}

export function isHTML(str: string): boolean {
  // `s` (dotAll) flag: `.` must also match newlines, otherwise a paired-tag
  // string with content spanning multiple lines (e.g. "<div>\nfoo\n</div>")
  // fails to match and falls through to the plain-text/escaped path.
  return /<([a-z][\w-]*)(\s[^>]*)?>.*<\/\1>|<([a-z][\w-]*)(\s[^>]*)?\/>/is.test(
    str.trim(),
  );
}

// Decode the entity forms an attacker uses to smuggle a scheme past a string
// check: numeric character references (&#106; / &#x6A;), the named &colon;
// (browsers decode it to ":" inside attribute values, completing a
// "javascript&colon;…" scheme), and the whitespace entities (&Tab; / &NewLine;)
// that are legal inside a URL. NOT a full entity table — just enough to
// canonicalize an attribute value before the scheme test below.
function decodeSchemeObfuscation(value: string): string {
  return value
    .replace(/&#(x?[0-9a-fA-F]+);/gi, (_match, code: string) => {
      const codePoint =
        code[0] === "x" || code[0] === "X"
          ? Number.parseInt(code.slice(1), 16)
          : Number.parseInt(code, 10);
      // Out-of-range code points would make fromCodePoint throw — drop them.
      return codePoint >= 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : "";
    })
    .replace(/&colon;/gi, ":")
    .replace(/&Tab;/gi, "\t")
    .replace(/&NewLine;/gi, "\n");
}

// True when a URL attribute value resolves to a script-capable scheme. The
// test runs on a canonicalized copy (entities decoded, ASCII whitespace and
// control characters stripped — browsers ignore those inside a scheme), so
// "&#106;avascript:", "java\tscript:" and " javascript:" all canonicalize to
// "javascript:". A data: URL is only dangerous with an HTML/XHTML media type
// (data:image/... is a legitimate <img>/<svg> source).
function isDangerousURL(value: string): boolean {
  const canonical = decodeSchemeObfuscation(value)
    // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping ASCII control characters out of the scheme is exactly the point of this canonicalization.
    .replace(/[\x00-\x20]+/g, "")
    .toLowerCase();
  return (
    canonical.startsWith("javascript:") ||
    canonical.startsWith("vbscript:") ||
    canonical.startsWith("data:text/html") ||
    canonical.startsWith("data:application/xhtml+xml")
  );
}

// Remove <script> elements with a quote-aware scan instead of a flat regex.
// A regex cannot tell a real tag from the text "<script>" inside a quoted
// attribute value — `<div title="<script>">` used to truncate the whole string
// from the attribute text onward. Here every "<" is first resolved to its
// real tag extent (quoted attribute values may contain ">" and "<"), and only
// a genuine <script> opening tag triggers stripping.
function stripScriptElements(html: string): string {
  const lower = html.toLowerCase();
  let result = "";
  let index = 0;
  while (index < html.length) {
    const open = lower.indexOf("<", index);
    if (open === -1) {
      result += html.slice(index);
      break;
    }
    result += html.slice(index, open);
    // Resolve the tag end, honoring quoted attribute values.
    let quote: string | null = null;
    let tagEnd = -1;
    for (let j = open + 1; j < html.length; j++) {
      const ch = html[j];
      if (quote) {
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === ">") {
        tagEnd = j;
        break;
      }
    }
    // No real tag end: the "<" is literal text (or an unterminated tag) —
    // keep the rest verbatim, exactly as a parser's text recovery would.
    if (tagEnd === -1) {
      result += html.slice(open);
      break;
    }
    const tagText = html.slice(open, tagEnd + 1);
    if (/^<script[\s/>]/i.test(tagText)) {
      if (/\/\s*>$/.test(tagText)) {
        // Self-closing form (not valid HTML5, stripped defensively): drop the
        // tag only, keep whatever follows.
        index = tagEnd + 1;
        continue;
      }
      const close = lower.indexOf("</script", tagEnd + 1);
      if (close === -1) {
        // Unclosed form — strip from the tag to the end of the string since
        // the real extent is unknowable.
        index = html.length;
        break;
      }
      const closeEnd = html.indexOf(">", close);
      index = closeEnd === -1 ? html.length : closeEnd + 1;
      continue;
    }
    result += tagText;
    index = tagEnd + 1;
  }
  return result;
}

// Strip <script> elements, event-handler attributes, iframe srcdoc documents,
// and script-capable URL schemes from an HTML string. Works in both SSR (no
// DOM) and client contexts. Not a full sanitizer — defense in depth that
// removes the most common XSS vectors; never wrap untrusted input in
// rawHtml() relying on this alone.
export function sanitizeHTMLString(html: string): string {
  let result = stripScriptElements(html);
  // Remove on* event handler attributes (onclick, onerror, onload, …).
  // Case-insensitive: HTML attribute names are case-insensitive, so
  // ONERROR=/OnClick= must be stripped too, not just lowercase.
  result = result.replace(
    /\s+on[a-zA-Z][\w-]*\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi,
    "",
  );
  // Also strip on* when preceded by "/" (e.g. <svg/onload=…>)
  result = result.replace(
    /\/on[a-zA-Z][\w-]*\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi,
    "/",
  );
  // Quote-glued form: `<img src="x"onerror=…>`. The HTML5 tokenizer ends a
  // quoted attribute value at its closing quote and recovers the very next
  // characters as a NEW attribute even without intervening whitespace — so
  // an on* handler glued to a quote is a live handler in the browser and
  // must be stripped too. The preceding quote is preserved ($1) so the
  // previous attribute stays closed. (Lossy in the pathological case of a
  // matching quote char inside a quoted value — same accepted trade-off as
  // the whitespace forms above.)
  result = result.replace(
    /(["'])on[a-zA-Z][\w-]*\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi,
    "$1",
  );
  // <iframe srcdoc="..."> embeds a whole second HTML document that this string
  // pass cannot sanitize — remove the attribute entirely.
  result = result.replace(/\s+srcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "");
  result = result.replace(/\/srcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "/");
  // Quote-glued srcdoc (see the on* note above).
  result = result.replace(
    /(["'])srcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi,
    "$1",
  );
  // Neutralise script-capable schemes (javascript:/vbscript:/data:text/html)
  // in URL attributes — href/src/action/formaction plus object@data. The value
  // is canonicalized before the test, so entity-encoded and
  // whitespace-obfuscated schemes are caught too.
  result = result.replace(
    /((?:href|src|action|formaction|data)\s*=\s*)("([^"]*)"|'([^']*)'|([^\s>]*))/gi,
    (
      match,
      prefix: string,
      _raw: string,
      dq?: string,
      sq?: string,
      bare?: string,
    ) => {
      const value = dq ?? sq ?? bare ?? "";
      if (!isDangerousURL(value)) return match;
      const quoteChar = dq !== undefined ? '"' : sq !== undefined ? "'" : "";
      return `${prefix}${quoteChar}#${quoteChar}`;
    },
  );
  return result;
}

export function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function addClass(element: PartialElement, className: string): void {
  if (typeof element.class === "function") {
    const reactive = element.class;
    element.class = (listener) => `${String(reactive(listener))} ${className}`;
  } else {
    const current = element.class || "";
    const split = String(current).split(" ");
    split.push(className);
    element.class = split.filter((e) => e).join(" ");
  }
}

export function removeClass(element: PartialElement, className: string): void {
  if (typeof element.class === "function") {
    const reactive = element.class;
    element.class = (listener) => {
      const split = String(reactive(listener)).split(" ");
      return split.filter((e) => e !== className).join(" ");
    };
  } else {
    // Normalize BEFORE stringifying, otherwise a missing `class` stringifies
    // to the literal "undefined" and pollutes the resulting class list.
    element.class ||= "";
    const split = String(element.class).split(" ");
    element.class = split.filter((e) => e !== className).join(" ");
  }
}

export function toggleClass(element: PartialElement, className: string): void {
  if (typeof element.class === "function") {
    const reactive = element.class;
    element.class = (listener) => {
      const split = String(reactive(listener)).split(" ");
      return split.includes(className)
        ? split.filter((e) => e !== className).join(" ")
        : split.concat([className]).join(" ");
    };
  } else {
    // Normalize BEFORE stringifying, otherwise a missing `class` stringifies
    // to the literal "undefined" and pollutes the resulting class list.
    element.class ||= "";
    const split = String(element.class).split(" ");
    element.class = split.includes(className)
      ? split.filter((e) => e !== className).join(" ")
      : split.concat([className]).join(" ");
  }
}

// Set view of HtmlTags for O(1) membership checks — getTagName/validate run
// per node per reconciliation pass, and HtmlTags.includes() was a linear scan
// of the 138-entry array per key.
const HtmlTagSet: Set<string> = new Set(HtmlTags);

export function getTagName(element: DomphyElement): TagName | undefined {
  return Object.keys(element).find((e) => HtmlTagSet.has(e)) as
    | TagName
    | undefined;
}

// Clone an element descriptor for ElementNode construction/patch WITHOUT
// deep-cloning the children content under the tag key. Children descriptors
// are consumed by ElementList.update(), which hands each child element to a
// child ElementNode constructor/patch that clones it again — deep-cloning the
// whole subtree here would clone every descendant once per ancestor (O(depth)
// clones per node). Everything the node itself RETAINS (attribute values,
// style values, _context/_metadata, $ partials) is still deep-cloned, so
// snapshot semantics against later caller mutation are unchanged for anything
// the node actually keeps. Non-plain-object descriptors (class instances)
// keep the old full deepClone behavior — deepClone passes those through by
// reference, and the per-key loop below must not "upgrade" them to plain
// objects.
export function cloneDescriptor(
  element: DomphyElement,
  contentKey: string,
): DomphyElement {
  if (Object.getPrototypeOf(element) !== Object.prototype) {
    return deepClone(element);
  }
  const seen = new WeakMap();
  const clone: Record<string | symbol, any> = {};
  for (const key of Reflect.ownKeys(element)) {
    clone[key] =
      key === contentKey
        ? (element as any)[key]
        : deepClone((element as any)[key], seen);
  }
  return clone as DomphyElement;
}

export function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

export function selectorSplitter(selectors: string) {
  if (selectors.indexOf("@") === 0) {
    return [selectors];
  }
  var splitted = [];
  var parens = 0;
  var angulars = 0;
  var soFar = "";
  for (var i = 0, len = selectors.length; i < len; i++) {
    var char = selectors[i];
    if (char === "(") {
      parens += 1;
    } else if (char === ")") {
      parens -= 1;
    } else if (char === "[") {
      angulars += 1;
    } else if (char === "]") {
      angulars -= 1;
    } else if (char === ",") {
      if (!parens && !angulars) {
        splitted.push(soFar.trim());
        soFar = "";
        continue;
      }
    }
    soFar += char;
  }
  splitted.push(soFar.trim());
  return splitted;
}

export function normalizeSelectorKey(selectorText: string): string {
  const text = selectorText.trim();
  // At-rule headers (@media, @keyframes, @supports...) are matched
  // whitespace-insensitive because CSSOM reformats them unpredictably.
  if (text.startsWith("@")) return text.replace(/\s+/g, "");
  return text
    .replace(/\s*([>+~,])\s*/g, "$1") // tighten combinators and selector lists
    .replace(/\s+/g, " ") // collapse descendant-combinator whitespace
    .replace(/\(\s*odd\s*\)/g, "(2n+1)") // CSSOM serializes :nth-child(odd) as (2n+1)
    .replace(/\(\s*even\s*\)/g, "(2n)")
    .trim();
}

export function collectCSSRules(
  rules: CSSRuleList,
  map: Map<string, CSSRule>,
): Map<string, CSSRule> {
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i] as any;
    let key: string | null = null;
    if (typeof rule.selectorText === "string") {
      key = normalizeSelectorKey(rule.selectorText);
    } else if (
      typeof rule.cssText === "string" &&
      rule.cssText.startsWith("@")
    ) {
      key = normalizeSelectorKey(rule.cssText.split("{")[0]);
    }
    if (key && !map.has(key)) map.set(key, rule as CSSRule);
  }
  return map;
}

export function ensureDomStyle(
  styleParent: HTMLHeadElement | ShadowRoot,
  nonce?: string,
): HTMLStyleElement {
  let domStyle = styleParent.querySelector(
    "#domphy-style",
  ) as HTMLStyleElement | null;

  if (!domStyle) {
    domStyle = document.createElement("style");
    domStyle.id = "domphy-style";
    const resolvedNonce = nonce ?? getConfig().cspNonce;
    if (resolvedNonce) domStyle.nonce = resolvedNonce;
    styleParent.appendChild(domStyle);
  }

  if (domStyle.dataset.domphyBase !== "true") {
    domStyle.sheet?.insertRule("[hidden] { display: none !important; }", 0);
    domStyle.dataset.domphyBase = "true";
  }

  return domStyle;
}

export const mergePartial = (
  partial: PartialElement | DomphyElement,
): typeof partial => {
  if (Array.isArray(partial.$)) {
    const part: typeof partial = {};
    partial.$.forEach((p) => merge(part, mergePartial(p)));
    delete partial.$;
    merge(part, partial); // native win

    return part;
  } else {
    return partial;
  }
};
