import { Extension } from "../Extendable";
import type { AnyExtension, Attributes } from "../types";
import { Blockquote, type BlockquoteOptions } from "./blockquote";
import { Bold, type BoldOptions } from "./bold";
import { BulletList, type BulletListOptions } from "./bulletList";
import { Code, type CodeOptions } from "./code";
import { CodeBlock, type CodeBlockOptions } from "./codeBlock";
import { Document } from "./document";
import { HardBreak, type HardBreakOptions } from "./hardBreak";
import { Heading, type HeadingOptions } from "./heading";
import { HorizontalRule, type HorizontalRuleOptions } from "./horizontalRule";
import { Italic, type ItalicOptions } from "./italic";
import { Link, type LinkOptions } from "./link";
import { ListItem, type ListItemOptions } from "./listItem";
import { OrderedList, type OrderedListOptions } from "./orderedList";
import { Paragraph, type ParagraphOptions } from "./paragraph";
import { Strike, type StrikeOptions } from "./strike";
import { Text } from "./text";
import { TrailingNode, type TrailingNodeOptions } from "./trailingNode";
import { UndoRedo, type UndoRedoOptions } from "./undoRedo";

/**
 * Every entry takes the sub-extension's options, or `false` to leave it out.
 */
export interface StarterKitOptions {
  blockquote: Partial<BlockquoteOptions> | false;
  bold: Partial<BoldOptions> | false;
  bulletList: Partial<BulletListOptions> | false;
  code: Partial<CodeOptions> | false;
  codeBlock: Partial<CodeBlockOptions> | false;
  document: false;
  hardBreak: Partial<HardBreakOptions> | false;
  heading: Partial<HeadingOptions> | false;
  horizontalRule: Partial<HorizontalRuleOptions> | false;
  italic: Partial<ItalicOptions> | false;
  link: Partial<LinkOptions> | false;
  listItem: Partial<ListItemOptions> | false;
  orderedList: Partial<OrderedListOptions> | false;
  paragraph: Partial<ParagraphOptions> | false;
  strike: Partial<StrikeOptions> | false;
  text: false;
  trailingNode: Partial<TrailingNodeOptions> | false;
  undoRedo: Partial<UndoRedoOptions> | false;
}

const starterKitExtension = Extension.create<StarterKitOptions>({
  name: "starterKit",

  addExtensions() {
    const enabled: Array<[unknown, AnyExtension]> = [
      [this.options.blockquote, Blockquote],
      [this.options.bold, Bold],
      [this.options.bulletList, BulletList],
      [this.options.code, Code],
      [this.options.codeBlock, CodeBlock],
      [this.options.document, Document],
      [this.options.hardBreak, HardBreak],
      [this.options.heading, Heading],
      [this.options.horizontalRule, HorizontalRule],
      [this.options.italic, Italic],
      [this.options.link, Link],
      [this.options.listItem, ListItem],
      [this.options.orderedList, OrderedList],
      [this.options.paragraph, Paragraph],
      [this.options.strike, Strike],
      [this.options.text, Text],
      [this.options.trailingNode, TrailingNode],
      [this.options.undoRedo, UndoRedo],
    ];

    return enabled
      .filter(([options]) => options !== false)
      .map(([options, extension]) =>
        extension.configure(options as Attributes | undefined),
      );
  },
});

/**
 * The essential extension set: everything a plain rich-text editor needs.
 *
 * ```ts
 * starterKit({ heading: { levels: [1, 2, 3] }, codeBlock: false })
 * ```
 */
export function starterKit(options?: Partial<StarterKitOptions>) {
  return starterKitExtension.configure(options as Attributes | undefined);
}
