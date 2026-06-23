import type { DomphyElement } from "@domphy/core";
import { heading, small, timeline, timelineItem } from "@domphy/ui";

const events = [
  { date: "Jan 2024", title: "Project started", done: true },
  { date: "Mar 2024", title: "Alpha release", done: true },
  { date: "Jun 2024", title: "Beta launch", done: true },
  { date: "Dec 2024", title: "v1.0 stable", done: false },
];

const App: DomphyElement<"ol"> = {
  ol: events.map(({ date, title, done }, i) => ({
    li: [
      { small: date, $: [small()] },
      { h4: title, $: [heading()] },
    ],
    $: [timelineItem({ active: done, last: i === events.length - 1 })],
  })),
  $: [timeline()],
  style: { maxWidth: "320px" },
};

export default App;
