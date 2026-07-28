import { Node } from "../Extendable";

/** The inline node that carries the actual characters. */
export const Text = Node.create({
  name: "text",
  group: "inline",
});
