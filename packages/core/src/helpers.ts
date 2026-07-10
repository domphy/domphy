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
    if (i === 0 && !HtmlTags.includes(key) && !asPartial) {
      throw Error(`key ${key} is not valid HTML tag name`);
    } else if (
      key === "style" &&
      val &&
      Object.prototype.toString.call(val) !== "[object Object]"
    ) {
      throw Error(`"style" must be a object`);
    } else if (key === "$") {
      element.$!.forEach((v) => validate(v as PartialElement, true));
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

// Strip <script> elements, event-handler attributes, and javascript: URLs
// from an HTML string. Works in both SSR (no DOM) and client contexts. Not a
// full sanitizer — it removes the most common XSS vectors so user-generated
// strings passed as inline HTML content can't execute arbitrary code.
export function sanitizeHTMLString(html: string): string {
  // Remove <script>...</script> elements entirely (paired form), including
  // multi-line bodies. Case-insensitive: the tag name is case-insensitive.
  let result = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "");
  // Self-closing form (e.g. <script src="evil.js"/>) — not valid HTML5 but
  // strip it defensively before the unclosed catch-all below, otherwise the
  // catch-all would swallow everything after it too.
  result = result.replace(/<script\b[^>]*\/>/gi, "");
  // Unclosed form (opening tag with no matching </script>) — strip from the
  // tag to the end of the string since the real extent is unknowable.
  result = result.replace(/<script\b[^>]*>[\s\S]*$/gi, "");
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
  // Neutralise javascript: scheme in URL attributes
  result = result.replace(
    /((?:href|src|action|formaction)\s*=\s*)(["']?)[\s]*javascript:[^"'\s>]*/gi,
    "$1$2#",
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

export function getTagName(element: DomphyElement): TagName | undefined {
  return Object.keys(element).find((e) => HtmlTags.includes(e)) as
    | TagName
    | undefined;
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
