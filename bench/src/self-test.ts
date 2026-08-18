/**
 * Assert script for the bench evaluator / tasks / doctor feedback loop.
 * Run: tsx src/self-test.ts
 */
import assert from "node:assert/strict";
import {
  PASS_SCORE,
  buildDoctorFeedback,
  computeScore,
  detectIssuesForFeedback,
  evaluate,
  extractCode,
  extractTree,
} from "./evaluator.js";
import { TASKS } from "./tasks.js";

const KEBAB_API = /input-text\(|input-search\(|unordered-list\(|input-checkbox\(/;

const COUNTER = `
import { toState } from "@domphy/core";
import { button, heading, paragraph, card } from "@domphy/ui";
import { themeSpacing } from "@domphy/theme";

const count = toState(0);

const app = {
  div: [
    { h2: "Counter", $: [heading()] },
    { p: (l) => String(count.get(l)), $: [paragraph()] },
    {
      div: [
        { button: "−", $: [button()], onClick: () => count.set(count.get() - 1) },
        { button: "+", $: [button()], onClick: () => count.set(count.get() + 1) },
      ],
      style: { display: "flex", gap: themeSpacing(2) },
    },
  ],
  style: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: themeSpacing(6),
  },
  $: [card()],
};

export default app;
`;

const BAD_TYPOGRAPHY = `
const app = {
  p: "hello",
  style: { fontSize: "20px", color: "#111111" },
};
export default app;
`;

function task(id: string) {
  const found = TASKS.find((t) => t.id === id);
  assert.ok(found, `missing task ${id}`);
  return found;
}

// H28 — requiredKeywords and prompts use camelCase shipped API
for (const t of TASKS) {
  for (const keyword of t.requiredKeywords ?? []) {
    assert.doesNotMatch(
      keyword,
      /input-text|input-search|unordered-list|input-checkbox/,
      `${t.id} requiredKeywords kebab: ${keyword}`,
    );
  }
  assert.doesNotMatch(t.prompt, KEBAB_API, `${t.id} prompt still kebab`);
}

assert.ok(task("login-form").requiredKeywords!.includes("inputText("));
assert.ok(task("search-bar").requiredKeywords!.includes("inputSearch("));
assert.ok(task("form-validation").requiredKeywords!.includes("inputText("));
assert.ok(task("data-grid").requiredKeywords!.includes("inputSearch("));
assert.ok(!task("login-form").requiredKeywords!.includes("input-text("));

// H27 — extractTree + diagnose actually run
const tree = extractTree(BAD_TYPOGRAPHY);
assert.ok(tree && typeof tree === "object", "extractTree should yield an object");
const doctorIssues = detectIssuesForFeedback(BAD_TYPOGRAPHY, task("hello-world"), "C");
assert.ok(
  doctorIssues.some((i) => i.includes("inline-typography")),
  `doctor should flag inline-typography, got: ${doctorIssues.join(", ")}`,
);
const feedback = buildDoctorFeedback(doctorIssues, BAD_TYPOGRAPHY);
assert.match(feedback, /@domphy\/doctor report:/);
assert.match(feedback, /\[inline-typography\]/);

// M133 — C cannot pass without structure (compile+typo alone is not enough)
assert.equal(computeScore(true, true, false, "C"), 60);
assert.ok(computeScore(true, true, false, "C") < PASS_SCORE);
assert.equal(computeScore(true, true, true, "C"), 100);

const loginResult = await evaluate("```ts\n" + COUNTER + "\n```", task("login-form"), "C", 0);
assert.equal(loginResult.hasRequiredStructure, false);
assert.ok(
  loginResult.score < PASS_SCORE,
  `C login-form scored ${loginResult.score} without createForm/inputText`,
);

const counterResult = await evaluate("```ts\n" + COUNTER + "\n```", task("counter"), "C", 0);
assert.equal(counterResult.hasRequiredStructure, true);
assert.ok(counterResult.compiles);

// Dry-run shape: same Counter against every task must not all "pass"
const cScores = await Promise.all(
  TASKS.map((t) => evaluate("```ts\n" + COUNTER + "\n```", t, "C", 0)),
);
const wouldPass = cScores.filter((r) => r.score >= PASS_SCORE);
assert.ok(
  wouldPass.length < cScores.length,
  "same Counter must not pass every task identically",
);
assert.ok(
  cScores.some((r) => !r.hasRequiredStructure),
  "non-counter tasks must fail structure against the Counter snippet",
);

// M137 — empty typography regex still yields compile/structure/doctor issues
const cleanWrong = `
import { toState } from "@domphy/core";
import { button } from "@domphy/ui";
const app = { div: [{ button: "x", $: [button()] }] };
export default app;
`;
assert.equal(detectTypographyLike(cleanWrong), 0);
const cIssues = detectIssuesForFeedback(cleanWrong, task("login-form"), "C");
assert.ok(
  cIssues.some((i) => i.startsWith("missing-structure")),
  `expected missing-structure, got: ${cIssues.join(", ")}`,
);
assert.ok(cIssues.length > 0);

const broken = "const x = {";
const compileIssues = detectIssuesForFeedback(broken, task("counter"), "C");
assert.ok(compileIssues.includes("does-not-compile"));

assert.equal(extractCode("```ts\nconst x = 1;\n```"), "const x = 1;");

function detectTypographyLike(code: string): number {
  return [/fontSize\s*:\s*["'`\d]/, /\bcolor\s*:\s*["'`#]/].filter((p) =>
    p.test(code),
  ).length;
}

console.log(`self-test ok — ${TASKS.length} tasks, doctor+structure+C-gate`);
