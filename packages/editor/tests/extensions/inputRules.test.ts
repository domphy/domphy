import { describe, expect, it } from "vitest";
import { Extension } from "../../src/Extendable";
import { Blockquote } from "../../src/extensions/blockquote";
import {
  Bold,
  starInputRegex,
  underscoreInputRegex,
} from "../../src/extensions/bold";
import { BulletList } from "../../src/extensions/bulletList";
import { Code } from "../../src/extensions/code";
import {
  backtickInputRegex,
  CodeBlock,
  tildeInputRegex,
} from "../../src/extensions/codeBlock";
import { Heading } from "../../src/extensions/heading";
import { HorizontalRule } from "../../src/extensions/horizontalRule";
import { Italic } from "../../src/extensions/italic";
import { OrderedList } from "../../src/extensions/orderedList";
import { Strike } from "../../src/extensions/strike";
import { createTestEditor, docOf, p } from "../fixtures";
import {
  applyInputRule,
  createRecorder,
  createTransaction,
  open,
} from "./harness";

describe("heading input rule", () => {
  const heading = open(Heading);

  it("matches one to six hashes followed by a space", () => {
    const [rule] = heading.inputRules();

    expect("# ").toMatch(rule.find);
    expect("###### ").toMatch(rule.find);
    expect("####### ").not.toMatch(rule.find);
    expect("#x ").not.toMatch(rule.find);
  });

  it("sets the block type with the level taken from the hash count", () => {
    const { recorder } = applyInputRule(heading.inputRules()[0], "### ");

    expect(recorder.calls).toEqual([
      { name: "deleteRange", args: [{ from: 1, to: 5 }] },
      { name: "setNode", args: ["heading", { level: 3 }] },
    ]);
  });

  it("caps the regex at the highest configured level and skips gaps", () => {
    const restricted = open(Heading, { options: { levels: [1, 3] } });
    const [rule] = restricted.inputRules();

    expect("### ").toMatch(rule.find);
    expect("#### ").not.toMatch(rule.find);

    const { recorder } = applyInputRule(rule, "## ");

    expect(recorder.calls).toEqual([]);
  });
});

describe("mark input rules", () => {
  it("matches bold delimiters", () => {
    expect("**bold**").toMatch(starInputRegex);
    expect("__bold__").toMatch(underscoreInputRegex);
    // Spaces inside the delimiters are allowed; an empty pair is not.
    expect("** bold **").toMatch(starInputRegex);
    expect("** **").not.toMatch(starInputRegex);
    expect("**bold** trailing").not.toMatch(starInputRegex);
  });

  it("matches italic delimiters", () => {
    const italic = open(Italic);
    const [starRule, underscoreRule] = italic.inputRules();

    expect("*slanted*").toMatch(starRule.find);
    expect("_slanted_").toMatch(underscoreRule.find);
  });

  it("matches strike delimiters", () => {
    const [rule] = open(Strike).inputRules();

    expect("~~gone~~").toMatch(rule.find);
    expect("~~ ~~").not.toMatch(rule.find);
  });

  it("matches inline code but not a doubled opening backtick", () => {
    const [rule] = open(Code).inputRules();

    expect("`snippet`").toMatch(rule.find);
    expect("``snippet`").not.toMatch(rule.find);
  });
});

describe("markInputRule wiring", () => {
  it("drops both delimiters, marks the capture and clears the stored mark", () => {
    const transaction = createTransaction({
      storedMarks: [{ type: "bold" }, { type: "italic" }],
    });
    const recorder = createRecorder({ transaction });

    applyInputRule(open(Bold).inputRules()[0], "hello **bold**", { recorder });

    expect(recorder.calls).toEqual([
      { name: "deleteRange", args: [{ from: 13, to: 15 }] },
      { name: "deleteRange", args: [{ from: 7, to: 9 }] },
      { name: "setTextSelection", args: [{ from: 7, to: 11 }] },
      { name: "setMark", args: ["bold", {}] },
      { name: "setTextSelection", args: [11] },
      { name: "command", args: [expect.any(Function)] },
    ]);
    expect(transaction.storedMarks).toEqual([{ type: "italic" }]);
  });

  it("handles a delimiter pair at the start of a block", () => {
    const { recorder } = applyInputRule(open(Bold).inputRules()[0], "**bold**");

    expect(recorder.calls.slice(0, 3)).toEqual([
      { name: "deleteRange", args: [{ from: 7, to: 9 }] },
      { name: "deleteRange", args: [{ from: 1, to: 3 }] },
      { name: "setTextSelection", args: [{ from: 1, to: 5 }] },
    ]);
  });

  it("keeps the character before inline code", () => {
    const { recorder } = applyInputRule(open(Code).inputRules()[0], "a `x`");

    expect(recorder.calls.slice(0, 3)).toEqual([
      { name: "deleteRange", args: [{ from: 5, to: 6 }] },
      { name: "deleteRange", args: [{ from: 3, to: 4 }] },
      { name: "setTextSelection", args: [{ from: 3, to: 4 }] },
    ]);
  });
});

describe("blockquote input rule", () => {
  it("wraps on a leading angle bracket", () => {
    const [rule] = open(Blockquote).inputRules();

    expect("> ").toMatch(rule.find);
    expect("  > ").toMatch(rule.find);
    expect(">x ").not.toMatch(rule.find);

    const { recorder } = applyInputRule(rule, "> ");

    expect(recorder.calls).toEqual([
      { name: "deleteRange", args: [{ from: 1, to: 3 }] },
      { name: "wrapIn", args: ["blockquote", {}] },
    ]);
  });
});

describe("list input rules", () => {
  it("wraps a bullet list on -, + or *", () => {
    const [rule] = open(BulletList).inputRules();

    expect("- ").toMatch(rule.find);
    expect("+ ").toMatch(rule.find);
    expect("* ").toMatch(rule.find);
    expect("-x ").not.toMatch(rule.find);

    const { recorder } = applyInputRule(rule, "- ");

    expect(recorder.calls).toEqual([
      { name: "deleteRange", args: [{ from: 1, to: 3 }] },
      { name: "wrapIn", args: ["bulletList", {}] },
    ]);
  });

  it("wraps an ordered list and carries the typed number into start", () => {
    const [rule] = open(OrderedList).inputRules();

    expect("1. ").toMatch(rule.find);
    expect("12. ").toMatch(rule.find);
    expect("a. ").not.toMatch(rule.find);

    const { recorder } = applyInputRule(rule, "3. ");

    expect(recorder.calls).toEqual([
      { name: "deleteRange", args: [{ from: 1, to: 4 }] },
      { name: "wrapIn", args: ["orderedList", { start: 3 }] },
    ]);
  });
});

describe("horizontalRule input rule", () => {
  it("inserts the node on the markdown separators", () => {
    const [rule] = open(HorizontalRule).inputRules();

    expect("---").toMatch(rule.find);
    expect("___ ").toMatch(rule.find);
    expect("*** ").toMatch(rule.find);
    expect("--").not.toMatch(rule.find);
  });

  // The rule reads the document to find the block it matched in, so it is
  // driven through a real editor rather than the command recorder. The rule is
  // registered on its own: the test schema already carries a `horizontalRule`
  // node, and the extension list keeps the first extension of a given name.
  it("keeps the emptied textblock so the caret survives the rule", () => {
    const [rule] = open(HorizontalRule).inputRules();
    const editor = createTestEditor(docOf(p("above"), p("")), [
      Extension.create({
        name: "horizontalRuleRule",
        addInputRules: () => [rule],
      }),
    ]);
    editor.commands.setTextSelection(editor.selectionBounds.end);

    for (const character of "---") {
      editor.insertTextWithRules(character);
    }

    expect(editor.getJSON()).toEqual(
      docOf(p("above"), { type: "horizontalRule" }, p()),
    );
    // Inside the paragraph after the rule, not in the gap beside it.
    expect(editor.state.selection.from).toBe(9);
  });
});

describe("codeBlock input rules", () => {
  const codeBlock = open(CodeBlock);

  it("matches fenced blocks with an optional language", () => {
    expect("```").not.toMatch(backtickInputRegex);
    expect("``` ").toMatch(backtickInputRegex);
    expect("```ts ").toMatch(backtickInputRegex);
    expect("~~~rust ").toMatch(tildeInputRegex);
  });

  it("sets the block type with the fenced language", () => {
    const { recorder } = applyInputRule(codeBlock.inputRules()[0], "```ts ");

    expect(recorder.calls).toEqual([
      { name: "deleteRange", args: [{ from: 1, to: 7 }] },
      { name: "setNode", args: ["codeBlock", { language: "ts" }] },
    ]);
  });

  it("falls back to the default language when the fence has none", () => {
    const { recorder } = applyInputRule(codeBlock.inputRules()[1], "~~~ ");

    expect(recorder.calls).toEqual([
      { name: "deleteRange", args: [{ from: 1, to: 5 }] },
      { name: "setNode", args: ["codeBlock", { language: null }] },
    ]);
  });
});
