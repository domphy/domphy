import type { DomphyElement } from "@domphy/core";
import { toState } from "@domphy/core";
import { heading, paragraph, rating } from "@domphy/ui";

const ratingState = toState(3);

const App: DomphyElement<"div"> = {
  div: [
    { h3: "Pick a rating", $: [heading()] },
    {
      div: null,
      $: [rating({ value: ratingState, onChange: (v) => ratingState.set(v) })],
    },
    {
      p: (l) => `Selected: ${ratingState.get(l)} / 5`,
      $: [paragraph()],
    },
    { h3: "Read-only (4 stars)", $: [heading()] },
    { div: null, $: [rating({ value: 4, readOnly: true })] },
  ],
  style: { display: "flex", flexDirection: "column", gap: "1rem" },
};

export default App;
