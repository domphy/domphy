import { describe, expect, it } from "vitest";

import { Editor } from "../src/Editor.js";
import { Extension, Mark, Node } from "../src/Extendable.js";
import { docOf, p, testExtensions } from "./fixtures.js";

describe("create / configure / extend", () => {
  it("resolves options from addOptions", () => {
    const extension = Extension.create({
      name: "sample",
      addOptions: () => ({ levels: [1, 2], nested: { a: 1 } }),
    });
    expect(extension.options).toEqual({ levels: [1, 2], nested: { a: 1 } });
  });

  it("configure deep-merges over addOptions", () => {
    const extension = Extension.create({
      name: "sample",
      addOptions: () => ({ nested: { a: 1, b: 2 } }),
    });
    const configured = extension.configure({ nested: { b: 3 } });
    expect(configured.options).toEqual({ nested: { a: 1, b: 3 } });
    // the original is untouched
    expect(extension.options).toEqual({ nested: { a: 1, b: 2 } });
    expect(configured.name).toBe("sample");
  });

  it("extend keeps the name unless a new one is given", () => {
    const base = Node.create({
      name: "base",
      group: "block",
      content: "inline*",
    });
    expect(base.extend({ content: "text*" }).name).toBe("base");
    expect(base.extend({ name: "renamed" }).name).toBe("renamed");
  });

  it("exposes the extended hook as parent", () => {
    const base = Extension.create({
      name: "sample",
      addOptions: () => ({ list: ["a"] }),
    });
    const extended = base.extend({
      addOptions() {
        const parent = this.parent?.() as { list: string[] } | undefined;
        return { list: [...(parent?.list ?? []), "b"] };
      },
    });
    expect(extended.options).toEqual({ list: ["a", "b"] });
  });

  it("binds name, options and editor on config hooks", () => {
    const seen: Record<string, unknown> = {};
    const extension = Extension.create({
      name: "probe",
      addOptions: () => ({ flavor: "vanilla" }),
      addCommands() {
        seen.name = this.name;
        seen.options = this.options;
        seen.hasEditor = !!this.editor;
        seen.storage = this.storage;
        return {};
      },
    });
    new Editor({ extensions: [...testExtensions, extension] });
    expect(seen).toEqual({
      name: "probe",
      options: { flavor: "vanilla" },
      hasEditor: true,
      storage: {},
    });
  });

  it("initialises storage from addStorage", () => {
    const extension = Extension.create({
      name: "stored",
      addStorage: () => ({ count: 0 }),
    });
    const editor = new Editor({ extensions: [...testExtensions, extension] });
    const resolved = editor.extensionManager.extensions.find(
      (item) => item.name === "stored",
    );
    expect(resolved?.storage).toEqual({ count: 0 });
  });
});

describe("ExtensionManager", () => {
  it("orders extensions by priority, highest first", () => {
    const low = Extension.create({ name: "low", priority: 1 });
    const high = Extension.create({ name: "high", priority: 1000 });
    const editor = new Editor({ extensions: [low, high, ...testExtensions] });
    const names = editor.extensionManager.extensions.map((item) => item.name);
    expect(names.indexOf("high")).toBeLessThan(names.indexOf("low"));
  });

  it("flattens addExtensions kits", () => {
    const kit = Extension.create({
      name: "kit",
      addExtensions: () => [Mark.create({ name: "underline" })],
    });
    const editor = new Editor({ extensions: [...testExtensions, kit] });
    expect(editor.schema.isMark("underline")).toBe(true);
  });

  it("keeps only the first extension of a duplicated name", () => {
    const first = Node.create({
      name: "dupe",
      group: "block",
      content: "inline*",
      priority: 200,
    });
    const second = Node.create({
      name: "dupe",
      group: "block",
      content: "text*",
      priority: 100,
    });
    const editor = new Editor({
      extensions: [...testExtensions, second, first],
    });
    expect(editor.schema.nodes.get("dupe")?.content).toBe("inline*");
  });

  it("merges commands from every extension", () => {
    const extension = Extension.create({
      name: "shout",
      addCommands: () => ({
        shout:
          () =>
          ({ tr, dispatch }) => {
            if (dispatch) {
              tr.insertText("!", tr.selection.from, tr.selection.from);
            }
            return true;
          },
      }),
    });
    const editor = new Editor({
      extensions: [...testExtensions, extension],
      content: docOf(p("hi")),
    });
    editor.commands.setTextSelection(3);
    expect((editor.commands as Record<string, () => boolean>).shout()).toBe(
      true,
    );
    expect(editor.getJSON()).toEqual(docOf(p("hi!")));
  });

  it("composes shortcuts bound to the same key in priority order", () => {
    const calls: string[] = [];
    const low = Extension.create({
      name: "low",
      priority: 10,
      addKeyboardShortcuts: () => ({
        Enter: () => {
          calls.push("low");
          return true;
        },
      }),
    });
    const high = Extension.create({
      name: "high",
      priority: 900,
      addKeyboardShortcuts: () => ({
        Enter: () => {
          calls.push("high");
          return false;
        },
      }),
    });
    const editor = new Editor({ extensions: [...testExtensions, low, high] });
    expect(editor.extensionManager.keyboardShortcuts.Enter({ editor })).toBe(
      true,
    );
    expect(calls).toEqual(["high", "low"]);
  });

  it("collects input rules from every extension", () => {
    const extension = Extension.create({
      name: "rules",
      addInputRules: () => [{ find: /x$/, handler: () => undefined }],
    });
    const editor = new Editor({ extensions: [...testExtensions, extension] });
    expect(editor.extensionManager.inputRules).toHaveLength(1);
  });

  it("runs lifecycle hooks on the editor's events", () => {
    const seen: string[] = [];
    const extension = Extension.create({
      name: "lifecycle",
      onCreate: () => {
        seen.push("create");
      },
      onUpdate: () => {
        seen.push("update");
      },
      onDestroy: () => {
        seen.push("destroy");
      },
    });
    const editor = new Editor({
      extensions: [...testExtensions, extension],
      content: docOf(p("a")),
    });
    editor.commands.insertContentAt(2, "b");
    editor.destroy();
    expect(seen).toEqual(["create", "update", "destroy"]);
  });
});

describe("schema building", () => {
  it("registers the top node from topNode", () => {
    const editor = new Editor({ extensions: testExtensions });
    expect(editor.schema.topNodeType).toBe("doc");
  });

  it("resolves attribute defaults", () => {
    const editor = new Editor({ extensions: testExtensions });
    expect(editor.schema.defaultAttributes("heading")).toEqual({ level: 1 });
  });

  it("answers content questions from the content expression", () => {
    const editor = new Editor({ extensions: testExtensions });
    expect(editor.schema.allowsContent("doc", "paragraph")).toBe(true);
    expect(editor.schema.allowsContent("bulletList", "paragraph")).toBe(false);
    expect(editor.schema.allowsContent("bulletList", "listItem")).toBe(true);
    expect(editor.schema.isTextblock("paragraph")).toBe(true);
    expect(editor.schema.isTextblock("blockquote")).toBe(false);
    expect(editor.schema.isLeaf("hardBreak")).toBe(true);
    expect(editor.schema.allowsMark("codeBlock", "bold")).toBe(false);
  });

  it("finds the wrapper chain a list needs", () => {
    const editor = new Editor({ extensions: testExtensions });
    expect(editor.schema.findWrapping("blockquote", ["paragraph"])).toEqual([
      "blockquote",
    ]);
    expect(editor.schema.findWrapping("bulletList", ["paragraph"])).toEqual([
      "bulletList",
      "listItem",
    ]);
  });
});
