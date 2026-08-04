import { type DomphyElement, toState } from "@domphy/core";
import { parseMarkdown } from "@domphy/markdown";
import { themeColor, themeSpacing } from "@domphy/theme";
import { heading, small, stack, textarea } from "@domphy/ui";

const initial = `# Hello Domphy

Edit the **Markdown** on the left — the [Domphy](https://domphy.com) element
tree on the right re-parses on every keystroke.

## Features

- Headings, lists, tables
- \`inline code\` and fenced blocks
- Frontmatter + TOC extraction

| Package | Role |
| ------- | ---- |
| core    | runtime |
| markdown | parsing |
`;

const source = toState(initial);

const App: DomphyElement<"div"> = {
  div: [
    { h2: "Markdown in, element tree out", $: [heading()] },
    {
      div: [
        {
          div: [
            { small: "Source", $: [small()] },
            {
              textarea: null,
              $: [textarea()],
              value: (l) => source.get(l),
              onInput: (e) =>
                source.set((e.target as HTMLTextAreaElement).value),
              style: { minHeight: themeSpacing(60), resize: "vertical" },
            },
          ],
          $: [stack()],
          style: { flex: "1", minWidth: themeSpacing(60) },
        },
        {
          div: [
            { small: "Rendered tree", $: [small()] },
            {
              // Single keyed wrapper: the reactive slot holds ONE child whose
              // own (static) children swap wholesale on each parse — no
              // unkeyed dynamic list for the reconciler (or the doctor).
              div: (l) => [
                {
                  div: parseMarkdown(source.get(l)).body,
                  _key: "rendered",
                },
              ],
              style: {
                padding: themeSpacing(4),
                outline: (l) => `1px solid ${themeColor(l, "border")}`,
                color: (l) => themeColor(l, "text"),
                borderRadius: themeSpacing(2),
                overflow: "auto",
              },
            },
          ],
          $: [stack()],
          style: { flex: "1", minWidth: themeSpacing(60) },
        },
      ],
      style: {
        display: "flex",
        gap: themeSpacing(4),
        flexWrap: "wrap",
        alignItems: "flex-start",
      },
    },
    {
      small: (l) => {
        const { toc } = parseMarkdown(source.get(l));
        return toc.length > 0
          ? `TOC: ${toc.map((entry) => entry.text).join(" · ")}`
          : "No headings yet.";
      },
      $: [small()],
    },
  ],
  $: [stack()],
};

export default App;
