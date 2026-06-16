import type { EvalResult } from "./evaluator.js";
import type { Condition } from "./evaluator.js";
import type { Task } from "./tasks.js";

const CONDITIONS: Condition[] = ["A", "B", "C", "D"];

const CONDITION_LABELS: Record<Condition, string> = {
  A: "A: no spec",
  B: "B: spec only",
  C: "C: spec+doctor",
  D: "D: React baseline",
};

function pct(n: number, total: number): string {
  if (total === 0) return "  —%";
  return `${Math.round((n / total) * 100).toString().padStart(3)}%`;
}

function avg(numbers: number[]): string {
  if (numbers.length === 0) return "  —";
  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  return mean.toFixed(1).padStart(4);
}

function pad(s: string, n: number): string {
  return s.slice(0, n).padEnd(n);
}

interface ConditionStats {
  condition: Condition;
  results: EvalResult[];
  compileRate: number;
  noTypoRate: number;
  structureRate: number;
  passRate: number; // score >= 70
  avgScore: number;
  avgIterations: number;
  issueFreq: Map<string, number>;
}

function aggregateCondition(
  condition: Condition,
  results: EvalResult[],
): ConditionStats {
  const filtered = results.filter((r) => r.condition === condition);
  const total = filtered.length;

  const issueFreq = new Map<string, number>();
  for (const r of filtered) {
    for (const issue of r.issues) {
      const label = issue.split("(")[0]; // normalize to rule name
      issueFreq.set(label, (issueFreq.get(label) ?? 0) + 1);
    }
  }

  const iters = filtered
    .filter((r) => r.iterations !== undefined)
    .map((r) => r.iterations!);

  return {
    condition,
    results: filtered,
    compileRate: filtered.filter((r) => r.compiles).length / (total || 1),
    noTypoRate:
      condition === "D"
        ? 1
        : filtered.filter((r) => r.noTypographyViolations).length / (total || 1),
    structureRate:
      filtered.filter((r) => r.hasRequiredStructure).length / (total || 1),
    passRate: filtered.filter((r) => r.score >= 70).length / (total || 1),
    avgScore:
      filtered.reduce((a, r) => a + r.score, 0) / (total || 1),
    avgIterations: iters.length
      ? iters.reduce((a, b) => a + b, 0) / iters.length
      : 0,
    issueFreq,
  };
}

export function printReport(
  results: EvalResult[],
  tasks: Task[],
  options: { dryRun: boolean },
): void {
  const stats = CONDITIONS.map((c) => aggregateCondition(c, results));

  console.log("\n");
  console.log(
    "═══════════════════════════════════════════════════════════════════════════════",
  );
  console.log(
    "  Domphy AI Correctness Benchmark" +
      (options.dryRun ? "  [DRY RUN — mock LLM]" : ""),
  );
  console.log(
    "═══════════════════════════════════════════════════════════════════════════════",
  );
  console.log();

  // ─── Summary table ───────────────────────────────────────────────────────
  const header =
    `  ${"Condition".padEnd(20)} ${"Compile".padStart(8)} ${"No-typo".padStart(8)} ${"Structure".padStart(10)} ${"Pass≥70".padStart(8)} ${"Avg score".padStart(10)}`;
  console.log(header);
  console.log("  " + "─".repeat(68));

  for (const s of stats) {
    const n = s.results.length;
    console.log(
      `  ${pad(CONDITION_LABELS[s.condition], 20)}` +
        `  ${pct(Math.round(s.compileRate * n), n)}` +
        `    ${s.condition === "D" ? "  n/a" : pct(Math.round(s.noTypoRate * n), n)}` +
        `      ${pct(Math.round(s.structureRate * n), n)}` +
        `       ${pct(Math.round(s.passRate * n), n)}` +
        `      ${avg([s.avgScore])}`,
    );
  }

  console.log();

  // ─── Per-task breakdown ──────────────────────────────────────────────────
  console.log("  Per-task scores:");
  console.log(
    `  ${"Task".padEnd(22)} ${"Diff".padEnd(10)} ${"A".padStart(5)} ${"B".padStart(5)} ${"C".padStart(5)} ${"D".padStart(5)}`,
  );
  console.log("  " + "─".repeat(56));

  for (const task of tasks) {
    const row = CONDITIONS.map((c) => {
      const r = results.find((x) => x.taskId === task.id && x.condition === c);
      return r ? r.score.toString().padStart(5) : "    —";
    });
    console.log(
      `  ${pad(task.id, 22)} ${pad(task.difficulty, 10)} ${row.join("")}`,
    );
  }

  console.log();

  // ─── Issue taxonomy ──────────────────────────────────────────────────────
  const allIssueKeys = new Set<string>();
  for (const s of stats) {
    for (const k of s.issueFreq.keys()) allIssueKeys.add(k);
  }

  if (allIssueKeys.size > 0) {
    console.log("  Issue taxonomy (occurrences per condition):");
    console.log(
      `  ${"Rule".padEnd(30)} ${"A".padStart(5)} ${"B".padStart(5)} ${"C".padStart(5)} ${"D".padStart(5)}`,
    );
    console.log("  " + "─".repeat(48));

    for (const key of [...allIssueKeys].sort()) {
      const counts = CONDITIONS.map((c) => {
        const s = stats.find((x) => x.condition === c)!;
        const n = s.issueFreq.get(key) ?? 0;
        return n > 0 ? n.toString().padStart(5) : "    —";
      });
      console.log(`  ${pad(key, 30)} ${counts.join("")}`);
    }

    console.log();
  }

  // ─── Condition C iterations ──────────────────────────────────────────────
  const cStats = stats.find((s) => s.condition === "C")!;
  if (cStats.avgIterations > 0) {
    console.log(
      `  Condition C avg self-correction rounds: ${cStats.avgIterations.toFixed(2)}`,
    );
    console.log();
  }

  // ─── Interpretation ──────────────────────────────────────────────────────
  const aPass = stats.find((s) => s.condition === "A")!.passRate;
  const bPass = stats.find((s) => s.condition === "B")!.passRate;
  const cPass = stats.find((s) => s.condition === "C")!.passRate;
  const dPass = stats.find((s) => s.condition === "D")!.passRate;

  console.log("  Interpretation:");
  console.log(
    `  • Spec lift (B vs A):      +${Math.round((bPass - aPass) * 100)}pp (spec alone helps this much)`,
  );
  console.log(
    `  • Doctor lift (C vs B):    +${Math.round((cPass - bPass) * 100)}pp (self-correction adds this)`,
  );
  console.log(
    `  • vs React baseline (C vs D): ${cPass >= dPass ? "+" : ""}${Math.round((cPass - dPass) * 100)}pp`,
  );
  console.log(
    "═══════════════════════════════════════════════════════════════════════════════",
  );
  console.log();
}
