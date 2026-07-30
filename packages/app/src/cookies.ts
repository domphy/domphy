/**
 * Parses cookies into a Map, the equivalent of Next.js `cookies()`.
 *
 * Pass `context.headers` from a loader or middleware to read server-side
 * cookies. When called without arguments (client-only context), falls back to
 * `document.cookie`.
 */
export function cookies(headers?: Headers): ReadonlyMap<string, string> {
  let raw = "";
  if (headers) {
    raw = headers.get("cookie") ?? "";
  } else if (typeof document !== "undefined") {
    raw = document.cookie;
  }
  const map = new Map<string, string>();
  for (const part of raw.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (!name) continue;
    const value = part.slice(eq + 1).trim();
    try {
      map.set(name, decodeURIComponent(value));
    } catch {
      // Malformed percent-encoding (e.g. `session=100%`): keep the raw value
      // instead of letting a URIError crash every loader that reads cookies.
      map.set(name, value);
    }
  }
  return map;
}
