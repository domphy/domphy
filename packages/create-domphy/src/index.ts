import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { templateFiles } from "./templates.js";

const KNOWN_TEMPLATES = ["spa"] as const;
type TemplateName = (typeof KNOWN_TEMPLATES)[number];

interface ParsedArguments {
  targetDir?: string;
  template: TemplateName;
  help: boolean;
}

// Minimal, dependency-free argument parser.
// Supports: <dir>  --template <name> / --template=<name> / -t <name>  --help / -h
function parseArguments(argv: string[]): ParsedArguments {
  const result: ParsedArguments = { template: "spa", help: false };

  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];

    if (argument === "--help" || argument === "-h") {
      result.help = true;
      continue;
    }

    if (argument === "--template" || argument === "-t") {
      const value = argv[index + 1];
      if (value) {
        result.template = value as TemplateName;
        index++;
      }
      continue;
    }

    if (argument.startsWith("--template=")) {
      result.template = argument.slice("--template=".length) as TemplateName;
      continue;
    }

    // First non-flag argument is the target directory.
    if (!argument.startsWith("-") && result.targetDir === undefined) {
      result.targetDir = argument;
    }
  }

  return result;
}

// The lockstep version of this CLI matches the published @domphy/* packages,
// so it is the safe pin for the scaffolded project's dependency.
function readCliVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const packagePath = join(here, "..", "package.json");
    const parsed = JSON.parse(readFileSync(packagePath, "utf8")) as {
      version?: string;
    };
    return parsed.version ?? "latest";
  } catch {
    return "latest";
  }
}

function printHelp(): void {
  stdout.write(
    [
      "create-domphy — scaffold a runnable Domphy starter",
      "",
      "Usage:",
      "  npm create domphy@latest <dir> [-- --template <name>]",
      "  create-domphy <dir> [--template <name>]",
      "",
      "Options:",
      "  -t, --template <name>   Template to use (default: spa)",
      "  -h, --help              Show this help",
      "",
      `Templates: ${KNOWN_TEMPLATES.join(", ")}`,
      "",
    ].join("\n"),
  );
}

async function promptTargetDir(): Promise<string> {
  const readline = createInterface({ input: stdin, output: stdout });
  try {
    const answer = (
      await readline.question("Project directory (. for current): ")
    ).trim();
    return answer.length > 0 ? answer : ".";
  } finally {
    readline.close();
  }
}

// A directory is safe to scaffold into when it does not exist, is empty, or only
// contains benign entries (such as a freshly created .git folder).
function isDirectoryUsable(dir: string): boolean {
  if (!existsSync(dir)) return true;
  const allowed = new Set([".git", ".gitignore", ".DS_Store"]);
  return readdirSync(dir).every((entry) => allowed.has(entry));
}

function toProjectName(targetDir: string): string {
  const base =
    targetDir === "."
      ? "domphy-app"
      : targetDir.split(/[\\/]/).filter(Boolean).pop();
  const name = (base ?? "domphy-app")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return name.length > 0 ? name : "domphy-app";
}

async function main(): Promise<void> {
  const parsed = parseArguments(process.argv.slice(2));

  if (parsed.help) {
    printHelp();
    return;
  }

  if (!KNOWN_TEMPLATES.includes(parsed.template)) {
    stdout.write(
      `Unknown template "${parsed.template}". Available: ${KNOWN_TEMPLATES.join(", ")}\n`,
    );
    process.exitCode = 1;
    return;
  }

  const targetArgument = parsed.targetDir ?? (await promptTargetDir());
  const targetDir = resolve(process.cwd(), targetArgument);

  if (!isDirectoryUsable(targetDir)) {
    stdout.write(
      `Target directory "${targetArgument}" exists and is not empty. Aborting.\n`,
    );
    process.exitCode = 1;
    return;
  }

  const projectName = toProjectName(targetArgument);
  const domphyVersion = `^${readCliVersion()}`;
  const files = templateFiles(projectName, domphyVersion);

  mkdirSync(targetDir, { recursive: true });

  for (const file of files) {
    const fullPath = join(targetDir, file.path);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, file.contents, "utf8");
  }

  const relativeTarget = targetArgument === "." ? "." : targetArgument;
  const lines = [
    "",
    `Scaffolded Domphy "${parsed.template}" starter in ${targetDir}`,
    "",
    `  ${files.length} files written.`,
    "",
    "Next steps:",
  ];
  if (relativeTarget !== ".") {
    lines.push(`  cd ${relativeTarget}`);
  }
  lines.push("  npm install", "  npm run dev", "");
  stdout.write(lines.join("\n"));
}

main().catch((error) => {
  stdout.write(
    `create-domphy failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
