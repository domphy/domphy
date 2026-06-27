import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import type { Condition } from "./evaluator.js";
import {
  buildDoctorFeedback,
  detectIssuesForFeedback,
  extractCode,
} from "./evaluator.js";
import type { Task } from "./tasks.js";

const DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(DIR, "../..");

const DOMPHY_SPEC_PATH = resolve(REPO_ROOT, "apps/web/public/llms.txt");

let cachedSpec: string | null = null;
async function loadSpec(): Promise<string> {
  if (cachedSpec) return cachedSpec;
  cachedSpec = await readFile(DOMPHY_SPEC_PATH, "utf8");
  return cachedSpec;
}

// ─── System prompts ──────────────────────────────────────────────────────────

function systemA(): string {
  return [
    "You are a helpful UI developer.",
    "Generate a Domphy UI element tree in TypeScript for the given task.",
    "Return ONLY a TypeScript code block wrapped in ```ts ... ```.",
    "Do not explain — code only.",
  ].join("\n");
}

async function systemB(): Promise<string> {
  const spec = await loadSpec();
  return [
    "You are an expert Domphy UI developer.",
    "Read the spec below carefully, then generate a Domphy element tree in TypeScript for the task.",
    "Return ONLY a TypeScript code block wrapped in ```ts ... ```.",
    "Do not explain — code only.",
    "",
    "CRITICAL TYPOGRAPHY RULES — violations fail the eval:",
    "• NEVER set fontSize / fontWeight / lineHeight / letterSpacing / fontFamily / textDecoration / color in a style: object.",
    "• Small / secondary / caption / helper text  →  { span: '...', $: [small()] }",
    "• Body text                                  →  { p: '...', $: [paragraph()] }",
    "• Headings                                   →  { h2: '...', $: [heading()] }",
    "• Bold / emphasis                            →  { strong: '...', $: [strong()] }",
    "• Error / colored text                       →  { span: '...', $: [small({ color: 'error' })] }",
    "• Literal hex/rgb color                      →  (l) => themeColor(l, 'base', 'colorName')",
    "• fontFamily — remove entirely, theme owns the font stack.",
    "",
    "--- SPEC START ---",
    spec,
    "--- SPEC END ---",
  ].join("\n");
}

async function systemC(): Promise<string> {
  return systemB();
}

function systemD(): string {
  return [
    "You are an expert React developer.",
    "Generate a React functional component in TypeScript for the given task.",
    "Return ONLY a TypeScript code block wrapped in ```tsx ... ```.",
    "Do not explain — code only.",
  ].join("\n");
}

// ─── Mock LLM (dry-run) ──────────────────────────────────────────────────────

// Condition A: no spec — common anti-patterns (inline styles, wrong API)
const MOCK_A = `\`\`\`ts
import { toState } from "@domphy/core";

const count = toState(0);

const app = {
  div: {
    style: { display: "flex", flexDirection: "column", alignItems: "center", padding: "24px" },
    $: [],
    _: [
      { h1: "Hello Counter", style: { fontSize: "2rem", color: "#333", marginBottom: "16px" } },
      {
        div: {
          style: { display: "flex", gap: "8px", alignItems: "center" },
          _: [
            { button: "−", onClick: () => count.set(count.get() - 1), style: { padding: "8px 16px" } },
            { span: (l) => String(count.get(l)), style: { fontSize: "1.5rem", fontWeight: "bold" } },
            { button: "+", onClick: () => count.set(count.get() + 1), style: { padding: "8px 16px" } },
          ],
        },
      },
    ],
  },
};

export default app;
\`\`\``;

// Condition B: spec provided — mostly correct, minor issues
const MOCK_B = `\`\`\`ts
import { toState } from "@domphy/core";
import { button, heading, card } from "@domphy/ui";

const count = toState(0);

const app = {
  div: {
    style: { display: "flex", flexDirection: "column", alignItems: "center", padding: "24px" },
    $: [card()],
    _: [
      { h2: "Counter", $: [heading(2)] },
      {
        div: {
          style: { display: "flex", gap: "16px", alignItems: "center", marginTop: "16px" },
          _: [
            { button: "−", $: [button()], onClick: () => count.set(count.get() - 1) },
            { span: (l) => String(count.get(l)) },
            { button: "+", $: [button()], onClick: () => count.set(count.get() + 1) },
          ],
        },
      },
    ],
  },
};

export default app;
\`\`\``;

// Condition C: self-corrected — correct, idiomatic
const MOCK_C = `\`\`\`ts
import { toState } from "@domphy/core";
import { button, heading, paragraph, card } from "@domphy/ui";
import { themeSpacing } from "@domphy/theme";

const count = toState(0);

const app = {
  div: {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: themeSpacing(6),
      gap: themeSpacing(4),
    },
    _: [
      { h2: "Counter", $: [heading(2)] },
      { p: (l) => String(count.get(l)), $: [paragraph()] },
      {
        div: {
          style: { display: "flex", gap: themeSpacing(2) },
          _: [
            {
              button: "−",
              $: [button()],
              onClick: () => count.set(count.get() - 1),
            },
            {
              button: "+",
              $: [button()],
              onClick: () => count.set(count.get() + 1),
            },
          ],
        },
      },
    ],
    $: [card()],
  },
};

export default app;
\`\`\``;

// Condition D: React — idiomatic React
const MOCK_D = `\`\`\`tsx
import React, { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px" }}>
      <h2 style={{ fontSize: "1.5rem", marginBottom: "16px" }}>Counter</h2>
      <p style={{ fontSize: "2rem", margin: "8px 0" }}>{count}</p>
      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={() => setCount(c => c - 1)}>−</button>
        <button onClick={() => setCount(c => c + 1)}>+</button>
      </div>
    </div>
  );
}

export default Counter;
\`\`\``;

const MOCK_REPLIES: Record<Condition, string> = {
  A: MOCK_A,
  B: MOCK_B,
  C: MOCK_C,
  D: MOCK_D,
};

// ─── LLM call ────────────────────────────────────────────────────────────────

export interface RunResult {
  reply: string;
  durationMs: number;
  /** Condition C only: number of LLM rounds. */
  iterations?: number;
}

export interface RunnerOptions {
  dryRun: boolean;
  model?: string;
  maxTokens?: number;
}

async function callLLM(
  client: OpenAI,
  systemPrompt: string,
  userMessage: string,
  model: string,
  maxTokens: number,
): Promise<string> {
  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });
  return response.choices[0]?.message?.content ?? "";
}

export async function runCondition(
  task: Task,
  condition: Condition,
  options: RunnerOptions,
): Promise<RunResult> {
  const {
    dryRun,
    model = "gpt-4o-mini",
    maxTokens = 2048,
  } = options;

  if (dryRun) {
    // Simulate ~300ms latency
    await new Promise((r) => setTimeout(r, 50));
    return {
      reply: MOCK_REPLIES[condition],
      durationMs: 300,
      iterations: condition === "C" ? 2 : undefined,
    };
  }

  const client = new OpenAI();
  const started = Date.now();

  if (condition === "A") {
    const reply = await callLLM(
      client,
      systemA(),
      task.prompt,
      model,
      maxTokens,
    );
    return { reply, durationMs: Date.now() - started };
  }

  if (condition === "B") {
    const sys = await systemB();
    const reply = await callLLM(client, sys, task.prompt, model, maxTokens);
    return { reply, durationMs: Date.now() - started };
  }

  if (condition === "C") {
    // Spec + doctor self-correction loop (up to 3 rounds)
    const sys = await systemC();
    let reply = await callLLM(client, sys, task.prompt, model, maxTokens);
    let iterations = 1;

    for (let round = 1; round < 3; round++) {
      const code = extractCode(reply);
      // Run static analysis to produce doctor-like feedback
      const issues = detectIssuesForFeedback(code);
      if (issues.length === 0) break; // clean — stop early

      const feedback = buildDoctorFeedback(issues, code);
      const fixPrompt = [
        "Your previous output had issues found by @domphy/doctor:",
        "",
        feedback,
        "",
        "Please fix all issues and return the corrected TypeScript code only (```ts ... ```).",
      ].join("\n");

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: sys },
        { role: "user", content: task.prompt },
        { role: "assistant", content: reply },
        { role: "user", content: fixPrompt },
      ];

      const response = await client.chat.completions.create({
        model,
        max_tokens: maxTokens,
        messages,
      });
      reply = response.choices[0]?.message?.content ?? reply;
      iterations++;
    }

    return { reply, durationMs: Date.now() - started, iterations };
  }

  // Condition D: React baseline
  const reactPrompt = task.reactPrompt;
  const reply = await callLLM(client, systemD(), reactPrompt, model, maxTokens);
  return { reply, durationMs: Date.now() - started };
}
