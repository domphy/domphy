import type { DomphyElement } from "@domphy/core";
import { icon } from "@domphy/ui";

const bulbSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 1 5.292 11.584A5.002 5.002 0 0 1 14 17.9V19a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1.1a5.002 5.002 0 0 1-3.292-4.316A7 7 0 0 1 12 2zm1 17h-2v1h2v-1zm-1-15a5 5 0 0 0-2.955 9.05A3.003 3.003 0 0 0 11 15.83V15h2v.83a3.003 3.003 0 0 0 1.955-2.78A5 5 0 0 0 12 4z"/></svg>';

const App: DomphyElement<"span"> = {
  span: bulbSvg,
  $: [icon()],
};

export default App;
