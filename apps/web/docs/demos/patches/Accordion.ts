import type { DomphyElement } from "@domphy/core";
import { accordion, details } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: [
    {
      details: [
        { summary: "What is Domphy?" },
        {
          p: "Domphy is a patch-based UI framework for native HTML elements. Patches compose styles and behavior without wrapping elements in custom components.",
        },
      ],
      $: [details()],
    },
    {
      details: [
        { summary: "How do patches work?" },
        {
          p: "A patch is a plain object with style and lifecycle hooks that merges into an element via the $ array. Multiple patches can be combined on a single element.",
        },
      ],
      $: [details()],
    },
    {
      details: [
        { summary: "Is server-side rendering supported?" },
        {
          p: "Yes. Domphy supports SSR via @domphy/app renderToString, with client-side hydration that reuses the server-rendered DOM.",
        },
      ],
      $: [details()],
    },
  ],
  $: [accordion()],
  // Text color is set by the summary/p children the accordion() patch
  // renders — the outer group container itself carries no text.
  _doctorDisable: "missing-color",
};

export default App;
