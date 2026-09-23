declare const process: { env: Record<string, string | undefined> } | undefined;

// Dev-only warning guard. A consumer bundler (Vite / webpack / esbuild)
// statically replaces `process.env.NODE_ENV`, so in a production build this
// evaluates to `false` and no warning ever fires. The `typeof process` check
// keeps the IIFE/CDN build (and embedded runtimes such as SketchUp's CEF, which
// have no `process`) from throwing at load time — there it stays `false` too.
// In a bundler's dev mode (or a test runner where NODE_ENV is "test"/unset) it
// is `true`, surfacing the warnings during development.
//
// What it does NOT do is remove the guarded code. Measured with esbuild 0.25.12
// (Vite's default minifier), `--define:process.env.NODE_ENV='"production"'
// --minify` leaves `typeof process<"u"&&process.env!=null&&!1` intact and keeps
// every `__DEV__ && console.warn(...)` call: the `&&` chain is statically falsy,
// but `process.env` is a property read esbuild will not assume is side-effect
// free, so it refuses to collapse it. A module-LOCAL copy of the same
// expression (the shape `@domphy/app`, `form`, `i18n`, `query`, `three` and
// `virtual` each declare) measured identically — nothing is gained or lost by
// sharing it, which is why this stays internal rather than becoming a public
// export. The cost is the warning STRINGS shipping in production builds, where
// they are never reached. Eliminating them needs a different mechanism
// (dual dev/prod bundles behind package.json `exports` conditions, the way
// React ships, or a build-time `define` of a bare `__DEV__` identifier the way
// Vue does) — both are repo-wide build decisions, not a core-local change.
export const __DEV__: boolean =
  typeof process !== "undefined" &&
  process.env != null &&
  process.env.NODE_ENV !== "production";
