import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { MermaidOptions } from "./types.js";

/**
 * Minimal structural type for the part of `@mermaid-js/mermaid-cli` this module
 * uses. The library is imported dynamically so that consumers who only use the
 * client patch never need it, and so the browser/IIFE build never bundles it.
 * `run` reads a Mermaid input file and writes the rendered output to a file,
 * managing the headless browser (puppeteer) entirely on its own — so consumers
 * do not need to install or configure puppeteer themselves.
 */
interface MermaidCliRunOptions {
  quiet?: boolean;
  outputFormat?: "svg" | "png" | "pdf";
  puppeteerConfig?: Record<string, unknown>;
  parseMMDOptions?: {
    backgroundColor?: string;
    mermaidConfig?: Record<string, unknown>;
    myCSS?: string;
  };
}

type RunFn = (
  input: string,
  output: string,
  options?: MermaidCliRunOptions,
) => Promise<void>;

interface MermaidCliModule {
  run: RunFn;
}

/** Lazily imports `@mermaid-js/mermaid-cli`. */
async function loadMermaidCli(): Promise<MermaidCliModule> {
  try {
    return (await import(
      "@mermaid-js/mermaid-cli"
    )) as unknown as MermaidCliModule;
  } catch (cause) {
    throw new Error(
      "@domphy/mermaid: failed to load '@mermaid-js/mermaid-cli'. It is " +
        "required for build-time rendering.",
      { cause: cause as Error },
    );
  }
}

/**
 * Normalizes raw diagram source: strips a leading/trailing blank line and any
 * trailing whitespace on each line, which Mermaid is otherwise sensitive to.
 */
export function normalizeMermaidSource(code: string): string {
  return code
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .trim();
}

/**
 * Renders a single Mermaid diagram to an inline SVG string using a headless
 * browser, via the `@mermaid-js/mermaid-cli` `run` API. Each call writes the
 * source to a temporary file, renders to a temporary SVG, reads it back, and
 * cleans up.
 *
 * For batches the cache layer (`renderMermaidCached`) and the tree integration
 * de-dupe identical sources, so the headless browser is launched far less than
 * once per diagram.
 *
 * Mermaid syntax errors are surfaced as a thrown `Error` that includes the
 * diagram source, never silently swallowed.
 */
export async function renderMermaidToSvg(
  code: string,
  options: MermaidOptions = {},
): Promise<string> {
  const source = normalizeMermaidSource(code);
  if (!source) {
    throw new Error("@domphy/mermaid: empty diagram source.");
  }

  const theme = options.theme ?? "default";
  const background = options.background ?? "transparent";
  const mermaidConfig = { theme, ...(options.mermaidConfig ?? {}) };

  const { run } = await loadMermaidCli();

  const directory = await mkdtemp(join(tmpdir(), "domphy-mermaid-"));
  const inputFile = join(directory, "diagram.mmd");
  const outputFile = join(directory, "diagram.svg");

  try {
    await writeFile(inputFile, source, "utf8");
    await run(inputFile, outputFile, {
      quiet: true,
      outputFormat: "svg",
      ...(options.puppeteer ? { puppeteerConfig: options.puppeteer } : {}),
      parseMMDOptions: {
        backgroundColor: background,
        mermaidConfig,
        ...(options.css ? { myCSS: options.css } : {}),
      },
    });
    return await readFile(outputFile, "utf8");
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new Error(
      `@domphy/mermaid: failed to render diagram.\n${message}\n--- source ---\n${source}`,
      { cause: cause as Error },
    );
  } finally {
    await rm(directory, { recursive: true, force: true }).catch(() => {
      // Ignore cleanup failures: the render result (or error) is what matters.
    });
  }
}
