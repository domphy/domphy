/**
 * Domphy AI Correctness Benchmark
 *
 * Usage:
 *   pnpm bench              # run full benchmark (requires ANTHROPIC_API_KEY)
 *   pnpm bench:dry          # dry-run with mock LLM (no API key needed)
 *   pnpm bench -- --task counter          # single task
 *   pnpm bench -- --condition B           # single condition (A/B/C/D)
 *   pnpm bench -- --model claude-haiku-4-5-20251001
 */

import { TASKS } from "./tasks.js";
import type { Condition, EvalResult } from "./evaluator.js";
import { evaluate } from "./evaluator.js";
import { runCondition } from "./runner.js";
import { printReport } from "./report.js";

const CONDITIONS: Condition[] = ["A", "B", "C", "D"];

function parseArgs(): {
  dryRun: boolean;
  taskFilter?: string;
  conditionFilter?: Condition;
  model?: string;
} {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const taskIdx = args.indexOf("--task");
  const condIdx = args.indexOf("--condition");
  const modelIdx = args.indexOf("--model");

  return {
    dryRun,
    taskFilter: taskIdx >= 0 ? args[taskIdx + 1] : undefined,
    conditionFilter:
      condIdx >= 0 ? (args[condIdx + 1] as Condition) : undefined,
    model: modelIdx >= 0 ? args[modelIdx + 1] : undefined,
  };
}

async function main(): Promise<void> {
  const { dryRun, taskFilter, conditionFilter, model } = parseArgs();

  const tasks = taskFilter
    ? TASKS.filter((t) => t.id === taskFilter)
    : TASKS;

  const conditions = conditionFilter ? [conditionFilter] : CONDITIONS;

  if (tasks.length === 0) {
    console.error(`No task found matching "--task ${taskFilter}"`);
    process.exit(1);
  }

  if (!dryRun && !process.env.ANTHROPIC_API_KEY) {
    console.error(
      "ANTHROPIC_API_KEY is not set. Run with --dry-run to test without an API key.",
    );
    process.exit(1);
  }

  const label = dryRun ? "[DRY RUN]" : "[LIVE]";
  console.log(
    `\nDomphy Benchmark ${label} — ${tasks.length} task(s) × ${conditions.length} condition(s)`,
  );

  const results: EvalResult[] = [];
  let done = 0;
  const total = tasks.length * conditions.length;

  for (const task of tasks) {
    for (const condition of conditions) {
      process.stdout.write(
        `  [${(++done).toString().padStart(3)}/${total}] ${task.id.padEnd(22)} ${condition} ... `,
      );

      const { reply, durationMs, iterations } = await runCondition(
        task,
        condition,
        { dryRun, model },
      );

      const result = await evaluate(reply, task, condition, durationMs, iterations);
      results.push(result);

      const mark =
        result.score >= 70 ? "✓" : result.score >= 40 ? "~" : "✗";
      console.log(`${mark} ${result.score}/100 (${Math.round(durationMs)}ms)`);
    }
  }

  printReport(results, tasks, { dryRun });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
