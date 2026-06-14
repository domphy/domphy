import { transform } from "esbuild";
import type { Plugin } from "vite";

// Replicates upstream @tanstack/router-core's vite-minify-plugin: modules
// imported with a `?script-string` query are minified and exported as a
// string so they can be inlined into HTML <script> tags at runtime.
export default function minifyScriptPlugin(): Plugin {
  return {
    name: "domphy:minify-script-string",
    enforce: "pre",
    async transform(code, id) {
      if (!id.endsWith("?script-string")) return null;
      const result = await transform(code, {
        loader: "ts",
        minify: true,
        target: "esnext",
      });
      let body = result.code.trim();
      if (body.startsWith("export default")) {
        body = body.slice("export default".length).trim();
      }
      if (body.endsWith(";")) {
        body = body.slice(0, -1);
      }
      return { code: `export default ${JSON.stringify(body)}`, map: null };
    },
  };
}
