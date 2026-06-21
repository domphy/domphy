import { type DomphyElement, toState } from "@domphy/core";
import { selectItem, selectList } from "@domphy/ui";

const fruits = [
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana" },
  { label: "Cherry", value: "cherry" },
  { label: "Grapes", value: "grapes" },
];

const selected = toState<string | null>("cherry");

const App: DomphyElement<"div"> = {
  div: fruits.map((fruit) => ({
    div: fruit.label,
    _key: fruit.value,
    $: [selectItem({ value: fruit.value })],
  })),
  $: [selectList({ value: selected })],
};

export default App;
