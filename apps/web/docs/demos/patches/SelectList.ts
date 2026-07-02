import { type DomphyElement, toState } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { selectItem, selectList } from "@domphy/ui";

const fruits = ["Apple", "Banana", "Blueberry", "Grapes", "Pineapple"];

const value = toState("apple");

const basic: DomphyElement<"div"> = {
  div: fruits.map((fruit) => ({
    div: fruit,
    $: [selectItem({ value: fruit.toLowerCase() })],
  })),
  $: [selectList({ value, name: "fruit" })],
  // Text color is set by the selectItem() children each item renders —
  // this outer selectList container itself carries no text.
  _doctorDisable: "missing-color",
};

const multiValue = toState<string[]>([]);

const multiple: DomphyElement<"div"> = {
  div: fruits.map((fruit) => ({
    div: fruit,
    $: [selectItem({ value: fruit.toLowerCase() })],
  })),
  $: [selectList({ value: multiValue, multiple: true, name: "fruits" })],
  // Text color is set by the selectItem() children each item renders —
  // this outer selectList container itself carries no text.
  _doctorDisable: "missing-color",
};

const App: DomphyElement<"div"> = {
  div: [basic, multiple],
  style: {
    display: "flex",
    flexWrap: "wrap",
    gap: themeSpacing(9),
  },
};

export default App;
