declare const process: { env: Record<string, string | undefined> } | undefined;

// Dev-only warning guard. A consumer bundler (Vite / webpack / esbuild)
// statically replaces `process.env.NODE_ENV`, so production builds fold this to
// `false` and tree-shake the guarded warnings out entirely. The `typeof process`
// check keeps the IIFE/CDN build (and embedded runtimes such as SketchUp's CEF,
// which have no `process`) from throwing at load time — there it stays `false`,
// so warnings simply never fire. In a bundler's dev mode (or a test runner where
// NODE_ENV is "test"/unset) it is `true`, surfacing the warnings during
// development without any runtime cost in production.
export const __DEV__: boolean =
  typeof process !== "undefined" &&
  process.env != null &&
  process.env.NODE_ENV !== "production";
