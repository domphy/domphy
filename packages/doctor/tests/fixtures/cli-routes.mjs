// Elements nested inside a plain container object (a route map) — extraction
// must descend into non-element objects to find them.
export const routes = {
  home: { input: "not-null" },
  about: { div: "ok" },
};
