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
    if (name) map.set(name, decodeURIComponent(part.slice(eq + 1)));
  }
  return map;
}
