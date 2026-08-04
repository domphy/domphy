import { type DomphyElement, toState } from "@domphy/core";
import { mermaidClient } from "@domphy/mermaid/client";
import { themeColor, themeSpacing } from "@domphy/theme";
import { buttonGhost, row, small, stack } from "@domphy/ui";

const samples: Record<string, string> = {
  Flowchart: `graph TD
  A[Markdown source] --> B{Has diagrams?}
  B -- Yes --> C[renderMermaidInTree]
  B -- No --> D[parseMarkdown only]
  C --> E[Static HTML with inline SVG]
  D --> E`,
  Sequence: `sequenceDiagram
  participant U as User
  participant P as Preview
  participant M as Mermaid
  U->>P: Pick a diagram
  P->>M: render(id, source)
  M-->>P: SVG string
  P-->>U: Inline diagram`,
  Pie: `pie title Where the bundle weight goes
  "mermaid" : 68
  "domphy runtime" : 24
  "everything else" : 8`,
};

const names = Object.keys(samples);
const selected = toState(names[0]);

const App: DomphyElement<"div"> = {
  div: [
    {
      div: names.map(
        (name): DomphyElement<"button"> => ({
          button: name,
          $: [buttonGhost()],
          onClick: () => selected.set(name),
          ariaPressed: (l) => selected.get(l) === name,
          style: {
            color: (l) => themeColor(l, "shift-9"),
            outline: (l) =>
              selected.get(l) === name
                ? `2px solid ${themeColor(l, "shift-9", "primary")}`
                : "none",
          },
        }),
      ),
      $: [row()],
    },
    {
      // A fresh _key per sample forces a fresh DOM node on switch, so the
      // patch's _onMount re-runs and renders the new source (lifecycle hooks
      // run once per real node — see "Reused-node lifecycle" in AGENTS.md).
      div: (l) => {
        const name = selected.get(l);
        return [
          {
            pre: [{ code: samples[name] }],
            _key: name,
            $: [mermaidClient({ theme: "default" })],
            style: {
              display: "flex",
              justifyContent: "center",
              padding: themeSpacing(4),
            },
          },
        ];
      },
    },
    {
      small: "Rendered in the browser by the mermaidClient() patch.",
      $: [small()],
    },
  ],
  $: [stack()],
};

export default App;
