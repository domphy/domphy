import type { DomphyElement } from "@domphy/core";
import { themeColor } from "@domphy/theme";
import { blockquote } from "@domphy/ui";

const App: DomphyElement<"blockquote"> = {
  blockquote:
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Urgent tamen et nihil remittunt. Et non ex maxima parte de tota iudicabis? Beatum, inquit. Ille incendat?",
  $: [blockquote()],
  style: { color: (l) => themeColor(l, "shift-9") },
};

export default App;
