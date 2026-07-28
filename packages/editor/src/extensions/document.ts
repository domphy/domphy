import { Node } from "../Extendable";

/** The top level node holding the whole document. */
export const Document = Node.create({
  name: "doc",
  topNode: true,
  content: "block+",
});
