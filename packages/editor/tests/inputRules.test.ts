/**
 * Engine-side rule dispatch. The rule *builders* live in src/extensions and are
 * covered by tests/extensions/inputRules.test.ts — these tests use tiny inline
 * rules so they exercise runInputRules itself.
 */

import { describe, expect, it } from "vitest";

import type { Editor } from "../src/Editor.js";
import { Extension } from "../src/Extendable.js";
import type { InputRule } from "../src/types.js";
import { block, createTestEditor, docOf, p } from "./fixtures.js";

function editorWithRules(rules: InputRule[], content = docOf(p(""))): Editor {
  const extension = Extension.create({
    name: "testRules",
    addInputRules: () => rules,
  });
  const editor = createTestEditor(content, [extension]);
  editor.commands.setTextSelection(editor.selectionBounds.end);
  return editor;
}

/** Simulate typing: the engine gives input rules first refusal on each character. */
function type(editor: Editor, text: string): void {
  for (const character of text) {
    editor.insertTextWithRules(character);
  }
}

/** Replaces the matched range with a literal string. */
function replaceRule(find: RegExp, replacement: string): InputRule {
  return {
    find,
    handler: ({ range, chain }) => {
      chain()
        .command(({ tr }) => {
          tr.insertText(replacement, range.from, range.to);
          return true;
        })
        .run();
    },
  };
}

describe("matching", () => {
  it("matches against the text before the cursor plus the typed character", () => {
    const editor = editorWithRules([replaceRule(/->$/, "→")]);
    type(editor, "a->");
    expect(editor.getJSON()).toEqual(docOf(p("a→")));
  });

  it("swallows the trigger character when a rule fires", () => {
    const seen: string[] = [];
    const editor = editorWithRules([
      {
        find: /^##\s$/,
        handler: ({ match, range, chain }) => {
          seen.push(match[0]);
          chain()
            .command(({ tr }) => {
              tr.delete(range.from, range.to);
              tr.setBlockType(range.from, range.from, "heading", { level: 2 });
              return true;
            })
            .run();
        },
      },
    ]);
    type(editor, "## ");
    // the space that triggered the rule is never inserted
    expect(seen).toEqual(["## "]);
    expect(editor.getJSON()).toEqual(docOf(block("heading", { level: 2 }, [])));
  });

  it("anchors to the current textblock, not the whole document", () => {
    const editor = editorWithRules(
      [replaceRule(/^x$/, "!")],
      docOf(p("a"), p("")),
    );
    type(editor, "x");
    // ^ can only match at the start of the second paragraph
    expect(editor.getJSON()).toEqual(docOf(p("a"), p("!")));
  });

  it("lets a match consume the whole block, which block-type rules rely on", () => {
    const editor = editorWithRules(
      [replaceRule(/aaaa$/, "!")],
      docOf(p("aaa")),
    );
    type(editor, "a");
    expect(editor.getJSON()).toEqual(docOf(p("!")));
  });

  it("resets lastIndex on global regexes", () => {
    const editor = editorWithRules([replaceRule(/x$/g, "!")]);
    type(editor, "x");
    type(editor, "x");
    expect(editor.getJSON()).toEqual(docOf(p("!!")));
  });
});

describe("guards", () => {
  it("skips rules inside a code block", () => {
    const editor = editorWithRules(
      [replaceRule(/->$/, "→")],
      docOf({ type: "codeBlock", content: [{ type: "text", text: "a-" }] }),
    );
    type(editor, ">");
    expect(editor.getText()).toBe("a->");
  });

  it("skips rules inside a code mark", () => {
    const editor = editorWithRules([replaceRule(/->$/, "→")]);
    editor.commands.setMark("code");
    type(editor, "a->");
    expect(editor.getHTML()).toBe("<p><code>a-&gt;</code></p>");
  });
});

describe("ordering", () => {
  it("stops at the first rule that changes the document", () => {
    const fired: string[] = [];
    const second: InputRule = {
      find: /x$/,
      handler: () => {
        fired.push("second");
      },
    };
    const editor = editorWithRules([replaceRule(/x$/, "1"), second]);
    type(editor, "x");
    expect(editor.getJSON()).toEqual(docOf(p("1")));
    expect(fired).toEqual([]);
  });

  it("falls through to the next rule when a handler changes nothing", () => {
    const inert: InputRule = { find: /x$/, handler: () => undefined };
    const editor = editorWithRules([inert, replaceRule(/x$/, "2")]);
    type(editor, "x");
    expect(editor.getJSON()).toEqual(docOf(p("2")));
  });

  it("falls through to a plain insert when nothing matches", () => {
    const editor = editorWithRules([replaceRule(/zzz$/, "!")]);
    type(editor, "ab");
    expect(editor.getJSON()).toEqual(docOf(p("ab")));
  });
});
