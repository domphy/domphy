/**
 * Evaluates pre-generated code from generated.json (output of the workflow run).
 * Usage: tsx src/eval-from-json.ts [path/to/generated.json]
 */
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluate } from "./evaluator.js";
import { printReport } from "./report.js";
import { TASKS } from "./tasks.js";
import type { Condition } from "./evaluator.js";

const DIR = dirname(fileURLToPath(import.meta.url));

interface GeneratedEntry {
  taskId: string;
  condition: Condition;
  code: string;
  iterations?: number;
}

async function main() {
  const jsonPath = process.argv[2] ?? resolve(DIR, "../generated.json");
  const raw = await readFile(jsonPath, "utf8");
  const data = JSON.parse(raw) as GeneratedEntry[];

  console.log(`\nEvaluating ${data.length} generated outputs from ${jsonPath}\n`);

  const results = await Promise.all(
    data.map(async (entry) => {
      const task = TASKS.find((t) => t.id === entry.taskId);
      if (!task) throw new Error(`Unknown task id: ${entry.taskId}`);
      return evaluate(entry.code, task, entry.condition, 0, entry.iterations);
    }),
  );

  printReport(results, TASKS, { dryRun: false });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
