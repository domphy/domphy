import type { DomphyElement } from "@domphy/core";
import { inputOTP, inputText } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: [
    { input: null, $: [inputText()], maxlength: 1 },
    { input: null, $: [inputText()], maxlength: 1 },
    { input: null, $: [inputText()], maxlength: 1 },
    { input: null, $: [inputText()], maxlength: 1 },
    { input: null, $: [inputText()], maxlength: 1 },
    { input: null, $: [inputText()], maxlength: 1 },
  ],
  $: [inputOTP()],
};

export default App;
