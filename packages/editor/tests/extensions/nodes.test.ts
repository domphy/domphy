import { describe, expect, it } from "vitest";
import { Blockquote } from "../../src/extensions/blockquote";
import { BulletList } from "../../src/extensions/bulletList";
import { CodeBlock } from "../../src/extensions/codeBlock";
import { Document } from "../../src/extensions/document";
import { HardBreak } from "../../src/extensions/hardBreak";
import { Heading } from "../../src/extensions/heading";
import { HorizontalRule } from "../../src/extensions/horizontalRule";
import { ListItem } from "../../src/extensions/listItem";
import { OrderedList } from "../../src/extensions/orderedList";
import { Paragraph } from "../../src/extensions/paragraph";
import { Text } from "../../src/extensions/text";
import { createRecorder, createTransaction, open } from "./harness";

describe("document", () => {
  it("is the top node accepting blocks", () => {
    expect(Document.name).toBe("doc");
    expect(Document.config).toMatchObject({ topNode: true, content: "block+" });
  });
});

describe("text", () => {
  it("is an inline node", () => {
    expect(Text.name).toBe("text");
    expect(Text.config).toMatchObject({ group: "inline" });
  });
});

describe("paragraph", () => {
  const paragraph = open(Paragraph);

  it("declares the default block schema at tiptap's priority", () => {
    expect(Paragraph.config).toMatchObject({
      name: "paragraph",
      priority: 1000,
      group: "block",
      content: "inline*",
    });
  });

  it("parses and renders <p>", () => {
    expect(paragraph.parseRules()).toEqual([{ tag: "p" }]);
    expect(paragraph.render()).toEqual(["p", {}, 0]);
  });

  it("merges configured HTML attributes into the rendered tag", () => {
    const configured = open(Paragraph, {
      options: { HTMLAttributes: { class: "prose" } },
    });

    expect(
      configured.render({ HTMLAttributes: { class: "lead", id: "intro" } }),
    ).toEqual(["p", { class: "prose lead", id: "intro" }, 0]);
  });

  it("registers setParagraph, delegating to setNode", () => {
    expect(paragraph.commandNames()).toEqual(["setParagraph"]);

    const recorder = createRecorder();

    expect(paragraph.commands().setParagraph()(recorder.props())).toBe(true);
    expect(recorder.calls).toEqual([{ name: "setNode", args: ["paragraph"] }]);
  });
});

describe("heading", () => {
  const heading = open(Heading);

  it("declares a defining block with a level attribute", () => {
    expect(Heading.config).toMatchObject({
      content: "inline*",
      group: "block",
      defining: true,
    });
    expect(heading.attributes()).toEqual({
      level: { default: 1, rendered: false },
    });
  });

  it("parses one rule per configured level", () => {
    expect(heading.parseRules()).toEqual([
      { tag: "h1", attrs: { level: 1 } },
      { tag: "h2", attrs: { level: 2 } },
      { tag: "h3", attrs: { level: 3 } },
      { tag: "h4", attrs: { level: 4 } },
      { tag: "h5", attrs: { level: 5 } },
      { tag: "h6", attrs: { level: 6 } },
    ]);
    expect(
      open(Heading, { options: { levels: [1, 2, 3] } }).parseRules(),
    ).toHaveLength(3);
  });

  it("renders the node's level, falling back to the first allowed one", () => {
    expect(
      heading.render({ node: { type: "heading", attrs: { level: 3 } } }),
    ).toEqual(["h3", {}, 0]);

    const restricted = open(Heading, { options: { levels: [2, 3] } });

    expect(
      restricted.render({ node: { type: "heading", attrs: { level: 6 } } }),
    ).toEqual(["h2", {}, 0]);
  });

  it("registers setHeading and toggleHeading", () => {
    expect(heading.commandNames()).toEqual(["setHeading", "toggleHeading"]);

    const recorder = createRecorder();

    heading.commands().setHeading({ level: 2 } as never)(recorder.props());
    heading.commands().toggleHeading({ level: 2 } as never)(recorder.props());

    expect(recorder.calls).toEqual([
      { name: "setNode", args: ["heading", { level: 2 }] },
      { name: "toggleNode", args: ["heading", "paragraph", { level: 2 }] },
    ]);
  });

  it("refuses levels outside the configured set", () => {
    const restricted = open(Heading, { options: { levels: [1, 2] } });
    const recorder = createRecorder();

    expect(
      restricted.commands().setHeading({ level: 5 } as never)(recorder.props()),
    ).toBe(false);
    expect(recorder.calls).toEqual([]);
  });
});

describe("blockquote", () => {
  const blockquote = open(Blockquote);

  it("declares a defining block wrapper", () => {
    expect(Blockquote.config).toMatchObject({
      content: "block+",
      group: "block",
      defining: true,
    });
    expect(blockquote.parseRules()).toEqual([{ tag: "blockquote" }]);
    expect(blockquote.render()).toEqual(["blockquote", {}, 0]);
  });

  it("registers set/toggle/unset over the generic wrap commands", () => {
    expect(blockquote.commandNames()).toEqual([
      "setBlockquote",
      "toggleBlockquote",
      "unsetBlockquote",
    ]);

    const recorder = createRecorder();
    const commands = blockquote.commands();

    commands.setBlockquote()(recorder.props());
    commands.toggleBlockquote()(recorder.props());
    commands.unsetBlockquote()(recorder.props());

    expect(recorder.calls).toEqual([
      { name: "wrapIn", args: ["blockquote"] },
      { name: "toggleWrap", args: ["blockquote"] },
      { name: "lift", args: ["blockquote"] },
    ]);
  });
});

describe("bulletList", () => {
  const bulletList = open(BulletList);

  it("declares a list of listItem children", () => {
    expect(BulletList.config).toMatchObject({
      group: "block list",
      content: "listItem+",
    });
    expect(bulletList.parseRules()).toEqual([{ tag: "ul" }]);
    expect(bulletList.render()).toEqual(["ul", {}, 0]);
  });

  it("toggles through the generic list command", () => {
    expect(bulletList.commandNames()).toEqual(["toggleBulletList"]);

    const recorder = createRecorder();

    bulletList.commands().toggleBulletList()(recorder.props());

    expect(recorder.calls).toEqual([
      { name: "toggleList", args: ["bulletList", "listItem"] },
    ]);
  });
});

describe("orderedList", () => {
  const orderedList = open(OrderedList);

  it("declares a list with a start attribute", () => {
    expect(OrderedList.config).toMatchObject({
      group: "block list",
      content: "listItem+",
    });
    expect(orderedList.attributes().start.default).toBe(1);
    expect(orderedList.parseRules()).toEqual([{ tag: "ol" }]);
  });

  it("reads start from the parsed element", () => {
    const parse = orderedList.attributes().start.parseHTML;
    const element = document.createElement("ol");

    expect(parse?.(element)).toBe(1);
    element.setAttribute("start", "5");
    expect(parse?.(element)).toBe(5);
  });

  it("omits start when it is the default", () => {
    expect(orderedList.render({ HTMLAttributes: { start: 1 } })).toEqual([
      "ol",
      {},
      0,
    ]);
    expect(orderedList.render({ HTMLAttributes: { start: 3 } })).toEqual([
      "ol",
      { start: 3 },
      0,
    ]);
  });

  it("toggles through the generic list command", () => {
    expect(orderedList.commandNames()).toEqual(["toggleOrderedList"]);

    const recorder = createRecorder();

    orderedList.commands().toggleOrderedList()(recorder.props());

    expect(recorder.calls).toEqual([
      { name: "toggleList", args: ["orderedList", "listItem"] },
    ]);
  });
});

describe("listItem", () => {
  const listItem = open(ListItem);

  it("declares a defining item starting with a paragraph", () => {
    expect(ListItem.config).toMatchObject({
      content: "paragraph block*",
      defining: true,
    });
    expect(listItem.parseRules()).toEqual([{ tag: "li" }]);
    expect(listItem.render()).toEqual(["li", {}, 0]);
  });

  it("registers no commands of its own", () => {
    expect(listItem.commandNames()).toEqual([]);
  });
});

describe("hardBreak", () => {
  const hardBreak = open(HardBreak);

  it("declares an unselectable inline leaf", () => {
    expect(HardBreak.config).toMatchObject({
      inline: true,
      group: "inline",
      selectable: false,
    });
    expect(hardBreak.parseRules()).toEqual([{ tag: "br" }]);
    expect(hardBreak.render()).toEqual(["br", {}]);
    expect(
      hardBreak.config.renderText?.call(hardBreak.context, {
        node: { type: "hardBreak" },
      }),
    ).toBe("\n");
  });

  it("exits a code block when it can", () => {
    const recorder = createRecorder();

    hardBreak.commands().setHardBreak()(recorder.props());

    expect(recorder.names()).toEqual(["first", "exitCode"]);
  });

  it("inserts a break and keeps splittable marks otherwise", () => {
    const transaction = createTransaction({
      storedMarks: [{ type: "bold" }, { type: "link" }],
    });
    const recorder = createRecorder({
      transaction,
      results: { exitCode: false },
      marks: { bold: {}, link: { keepOnSplit: false } },
    });

    hardBreak.commands().setHardBreak()(recorder.props());

    expect(recorder.names()).toEqual([
      "first",
      "exitCode",
      "insertContent",
      "command",
      "scrollIntoView",
    ]);
    expect(transaction.storedMarks).toEqual([{ type: "bold" }]);
  });

  it("leaves marks alone when keepMarks is off", () => {
    const transaction = createTransaction({ storedMarks: [{ type: "bold" }] });
    const recorder = createRecorder({
      transaction,
      results: { exitCode: false },
    });

    open(HardBreak, { options: { keepMarks: false } })
      .commands()
      .setHardBreak()(recorder.props());

    expect(transaction.storedMarks).toEqual([{ type: "bold" }]);
  });
});

describe("horizontalRule", () => {
  const horizontalRule = open(HorizontalRule);

  it("declares a block leaf", () => {
    expect(HorizontalRule.config).toMatchObject({ group: "block" });
    expect(horizontalRule.parseRules()).toEqual([{ tag: "hr" }]);
    expect(horizontalRule.render()).toEqual(["hr", {}]);
  });

  it("inserts itself and scrolls into view", () => {
    expect(horizontalRule.commandNames()).toEqual(["setHorizontalRule"]);

    const recorder = createRecorder();

    horizontalRule.commands().setHorizontalRule()(recorder.props());

    expect(recorder.calls).toEqual([
      { name: "insertContent", args: [{ type: "horizontalRule" }] },
      { name: "scrollIntoView", args: [] },
    ]);
  });
});

describe("codeBlock", () => {
  const codeBlock = open(CodeBlock);

  it("declares a mark-free defining code block", () => {
    expect(CodeBlock.config).toMatchObject({
      content: "text*",
      marks: "",
      group: "block",
      code: true,
      defining: true,
    });
    expect(codeBlock.parseRules()).toEqual([{ tag: "pre" }]);
    expect(codeBlock.attributes().language).toMatchObject({
      default: null,
      rendered: false,
    });
  });

  it("renders the language as a class on the inner code element", () => {
    expect(codeBlock.render()).toEqual([
      "pre",
      {},
      ["code", { class: null }, 0],
    ]);
    expect(
      codeBlock.render({
        node: { type: "codeBlock", attrs: { language: "ts" } },
      }),
    ).toEqual(["pre", {}, ["code", { class: "language-ts" }, 0]]);
  });

  it("reads the language back from the code element's class", () => {
    const parse = codeBlock.attributes().language.parseHTML;
    const element = document.createElement("pre");
    const code = document.createElement("code");

    element.append(code);
    expect(parse?.(element)).toBe(null);

    code.className = "language-rust";
    expect(parse?.(element)).toBe("rust");
  });

  it("registers setCodeBlock and toggleCodeBlock", () => {
    expect(codeBlock.commandNames()).toEqual([
      "setCodeBlock",
      "toggleCodeBlock",
    ]);

    const recorder = createRecorder();
    const commands = codeBlock.commands();

    commands.setCodeBlock({ language: "ts" } as never)(recorder.props());
    commands.toggleCodeBlock()(recorder.props());

    expect(recorder.calls).toEqual([
      { name: "setNode", args: ["codeBlock", { language: "ts" }] },
      { name: "toggleNode", args: ["codeBlock", "paragraph", undefined] },
    ]);
  });
});
