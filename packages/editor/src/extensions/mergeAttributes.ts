import type { Attributes } from "../types";

/**
 * Split a style string into property/value pairs.
 *
 * ponytail: naive `;` split — a declaration whose value contains a semicolon
 * (`content: "a;b"`, `url(a;b)`) splits wrong. Upgrade to a quote/paren-aware
 * scanner when an extension actually renders such a style.
 */
function parseStyleEntries(value: unknown): [string, string][] {
  const entries: [string, string][] = [];

  for (const declaration of String(value ?? "").split(";")) {
    const separator = declaration.indexOf(":");

    if (separator === -1) {
      continue;
    }

    const property = declaration.slice(0, separator).trim();
    const propertyValue = declaration.slice(separator + 1).trim();

    if (property && propertyValue) {
      entries.push([property, propertyValue]);
    }
  }

  return entries;
}

/**
 * Merge attribute objects for `renderHTML`, matching tiptap's semantics:
 * `class` values concatenate (de-duplicated), `style` declarations merge per
 * property, every other key is last-wins.
 */
export function mergeAttributes(
  ...objects: (Attributes | null | undefined)[]
): Attributes {
  const merged: Attributes = {};

  for (const object of objects) {
    if (!object) {
      continue;
    }

    for (const [key, value] of Object.entries(object)) {
      const existing = merged[key];

      if (!existing) {
        merged[key] = value;
        continue;
      }

      if (key === "class") {
        const existingClasses = String(existing).split(" ").filter(Boolean);
        const added = String(value ?? "")
          .split(" ")
          .filter((name) => name && !existingClasses.includes(name));

        merged[key] = [...existingClasses, ...added].join(" ");
      } else if (key === "style") {
        const declarations = new Map([
          ...parseStyleEntries(existing),
          ...parseStyleEntries(value),
        ]);

        merged[key] = Array.from(declarations.entries())
          .map(([property, propertyValue]) => `${property}: ${propertyValue}`)
          .join("; ");
      } else {
        merged[key] = value;
      }
    }
  }

  return merged;
}
