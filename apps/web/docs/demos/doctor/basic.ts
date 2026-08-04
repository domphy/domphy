import { type DomphyElement, toState } from "@domphy/core";
import { diagnose, fix, format } from "@domphy/doctor";
import { themeColor, themeSpacing } from "@domphy/theme";
import { button, heading, row, small, stack } from "@domphy/ui";

// Deliberately non-idiomatic tree — the analyzer's target, not an example to
// copy: inline typography, a literal hex color, a mid-ramp dataTone anchor,
// and a void tag with children.
const suspect: Record<string, unknown> = {
  div: [
    {
      p: "Hard-coded styles",
      style: { fontSize: "20px", fontWeight: 700, color: "#e11d48" },
    },
    { div: [{ span: "mid-ramp surface" }], dataTone: "shift-7" },
    { input: ["void tags cannot have children"], type: "text" },
  ],
};

const report = toState(format(diagnose(suspect)));
const appliedFixes = toState<string[]>([]);

const App: DomphyElement<"div"> = {
  div: [
    { h2: "Static analysis for element trees", $: [heading()] },
    {
      div: [
        {
          button: "Run fix() — apply lossless autofixes",
          $: [button({ color: "primary" })],
          onClick: () => {
            const result = fix(suspect);
            appliedFixes.set(
              result.applied.map((f) => `${f.rule} @ ${f.path}`),
            );
            report.set(format(result.report.issues));
          },
        },
        {
          button: "Reset",
          $: [button({ color: "neutral" })],
          onClick: () => {
            appliedFixes.set([]);
            report.set(format(diagnose(suspect)));
          },
        },
      ],
      $: [row()],
    },
    {
      small: (l) =>
        appliedFixes.get(l).length > 0
          ? `Applied: ${appliedFixes.get(l).join(", ")}`
          : `${diagnose(suspect).length} diagnostics before fix() — the report below updates live.`,
      $: [small()],
    },
    {
      pre: [{ code: (l) => report.get(l) }],
      dataTone: "shift-1",
      style: {
        padding: themeSpacing(4),
        borderRadius: themeSpacing(2),
        backgroundColor: (l) => themeColor(l, "inherit"),
        color: (l) => themeColor(l, "shift-11"),
        outline: (l) => `1px solid ${themeColor(l, "border")}`,
        overflow: "auto",
      },
    },
  ],
  $: [stack()],
};

export default App;
