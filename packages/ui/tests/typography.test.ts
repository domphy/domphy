// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, toState } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  abbreviation,
  avatar,
  blockquote,
  code,
  divider,
  emphasis,
  figure,
  heading,
  horizontalRule,
  icon,
  image,
  keyboard,
  label,
  link,
  mark,
  paragraph,
  small,
  strong,
} from "../src/index.ts";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

function listenerCount(state: any): number {
  const listeners = state?._notifier?._listeners;
  if (!listeners) return 0;
  let total = 0;
  for (const key in listeners) total += listeners[key].size;
  return total;
}

afterEach(() => {
  document.body.innerHTML = "";
});

// ---------------------------------------------------------------------------
// heading
// ---------------------------------------------------------------------------

describe("heading", () => {
  it("warns when applied to a non-heading tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ span: "title", $: [heading()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("heading"));
    warn.mockRestore();
  });

  it("does not warn when applied to h1–h6", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const tag of ["h1", "h2", "h3", "h4", "h5", "h6"] as const) {
      render({ div: [{ [tag]: "Title", $: [heading()] }] } as DomphyElement);
    }
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("releases color state listener on removal", () => {
    const color = toState<"neutral" | "primary">("neutral", "headingColor");
    const { node } = render({
      div: [{ h2: "Title", $: [heading({ color })] }],
    } as DomphyElement);
    expect(listenerCount(color)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(color)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// paragraph
// ---------------------------------------------------------------------------

describe("paragraph", () => {
  it("warns when applied to a non-p tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ span: "text", $: [paragraph()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("paragraph"));
    warn.mockRestore();
  });

  it("does not warn on a p tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ p: "text", $: [paragraph()] }] } as DomphyElement);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("releases color state listener on removal", () => {
    const color = toState<"neutral" | "primary">("neutral", "paraColor");
    const { node } = render({
      div: [{ p: "text", $: [paragraph({ color })] }],
    } as DomphyElement);
    expect(listenerCount(color)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(color)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// label
// ---------------------------------------------------------------------------

describe("label", () => {
  it("warns when applied to a non-label tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ span: "Email", $: [label()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("label"));
    warn.mockRestore();
  });

  it("renders a label element with for wiring", () => {
    render({
      div: [
        { label: "Email", for: "email-input", $: [label()] },
        { input: null, id: "email-input", type: "email" },
      ],
    } as DomphyElement);
    const el = document.querySelector("label");
    expect(el?.getAttribute("for")).toBe("email-input");
  });

  it("releases color state listener on removal", () => {
    const color = toState<"neutral" | "primary">("neutral", "labelColor");
    const { node } = render({
      div: [{ label: "Name", $: [label({ color })] }],
    } as DomphyElement);
    expect(listenerCount(color)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(color)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// link
// ---------------------------------------------------------------------------

describe("link", () => {
  it("warns when applied to a non-a tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ span: "Click", $: [link()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("link"));
    warn.mockRestore();
  });

  it("does not warn on an anchor tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ a: "Home", href: "/", $: [link()] }] } as DomphyElement);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("releases color state listener on removal", () => {
    const color = toState<"primary" | "secondary">("primary", "linkColor");
    const { node } = render({
      div: [{ a: "Home", href: "/", $: [link({ color })] }],
    } as DomphyElement);
    expect(listenerCount(color)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(color)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// code
// ---------------------------------------------------------------------------

describe("code", () => {
  it("warns when applied to a non-code tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ span: "npm i", $: [code()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("code"));
    warn.mockRestore();
  });

  it("sets data-tone attribute on the element", () => {
    render({ div: [{ code: "npm i", $: [code()] }] } as DomphyElement);
    const el = document.querySelector("code");
    expect(el?.dataset.tone).toBe("shift-2");
  });

  it("releases color state listener on removal", () => {
    const color = toState<"neutral" | "primary">("neutral", "codeColor");
    const { node } = render({
      div: [{ code: "npm i", $: [code({ color })] }],
    } as DomphyElement);
    expect(listenerCount(color)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(color)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// strong
// ---------------------------------------------------------------------------

describe("strong", () => {
  it("warns when applied to a non-strong tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ b: "bold", $: [strong()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("strong"));
    warn.mockRestore();
  });

  it("does not warn on a strong tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({
      div: [{ strong: "important", $: [strong()] }],
    } as DomphyElement);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("releases color state listener on removal", () => {
    const color = toState<"neutral" | "primary">("neutral", "strongColor");
    const { node } = render({
      div: [{ strong: "important", $: [strong({ color })] }],
    } as DomphyElement);
    expect(listenerCount(color)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(color)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// emphasis
// ---------------------------------------------------------------------------

describe("emphasis", () => {
  it("warns when applied to a non-em tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ i: "italic", $: [emphasis()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("emphasis"));
    warn.mockRestore();
  });

  it("does not warn on an em tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ em: "italic", $: [emphasis()] }] } as DomphyElement);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("releases color state listener on removal", () => {
    const color = toState<"neutral" | "primary">("neutral", "emColor");
    const { node } = render({
      div: [{ em: "italic", $: [emphasis({ color })] }],
    } as DomphyElement);
    expect(listenerCount(color)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(color)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// small
// ---------------------------------------------------------------------------

describe("small", () => {
  it("warns when applied to a non-small tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ span: "fine print", $: [small()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("small"));
    warn.mockRestore();
  });

  it("sets data-size=decrease-1 on the element", () => {
    render({
      div: [{ small: "fine print", $: [small()] }],
    } as DomphyElement);
    const el = document.querySelector("small");
    expect(el?.dataset.size).toBe("decrease-1");
  });

  it("releases color state listener on removal", () => {
    const color = toState<"neutral" | "primary">("neutral", "smallColor");
    const { node } = render({
      div: [{ small: "fine print", $: [small({ color })] }],
    } as DomphyElement);
    expect(listenerCount(color)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(color)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// mark
// ---------------------------------------------------------------------------

describe("mark", () => {
  it("warns when applied to a non-mark tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ span: "highlight", $: [mark()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("mark"));
    warn.mockRestore();
  });

  it("sets data-tone=shift-2 on the element", () => {
    render({ div: [{ mark: "highlight", $: [mark()] }] } as DomphyElement);
    const el = document.querySelector("mark");
    expect(el?.dataset.tone).toBe("shift-2");
  });

  it("releases accentColor state listener on removal", () => {
    const accentColor = toState<"highlight" | "primary">(
      "highlight",
      "markAccent",
    );
    const { node } = render({
      div: [{ mark: "highlight", $: [mark({ accentColor })] }],
    } as DomphyElement);
    expect(listenerCount(accentColor)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(accentColor)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// keyboard
// ---------------------------------------------------------------------------

describe("keyboard", () => {
  it("warns when applied to a non-kbd tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ span: "Ctrl", $: [keyboard()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("keyboard"));
    warn.mockRestore();
  });

  it("does not warn on a kbd tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ kbd: "Ctrl", $: [keyboard()] }] } as DomphyElement);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("releases color state listener on removal", () => {
    const color = toState<"neutral" | "primary">("neutral", "kbdColor");
    const { node } = render({
      div: [{ kbd: "Ctrl", $: [keyboard({ color })] }],
    } as DomphyElement);
    expect(listenerCount(color)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(color)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// abbreviation
// ---------------------------------------------------------------------------

describe("abbreviation", () => {
  it("warns when applied to a non-abbr tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ span: "HTML", $: [abbreviation()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("abbreviation"));
    warn.mockRestore();
  });

  it("preserves the title attribute for the tooltip", () => {
    render({
      div: [
        {
          abbr: "HTML",
          title: "HyperText Markup Language",
          $: [abbreviation()],
        },
      ],
    } as DomphyElement);
    const el = document.querySelector("abbr");
    expect(el?.title).toBe("HyperText Markup Language");
  });

  it("releases color state listeners on removal", () => {
    const color = toState<"neutral" | "primary">("neutral", "abbrColor");
    const { node } = render({
      div: [
        {
          abbr: "HTML",
          title: "HyperText Markup Language",
          $: [abbreviation({ color })],
        },
      ],
    } as DomphyElement);
    expect(listenerCount(color)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(color)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// blockquote
// ---------------------------------------------------------------------------

describe("blockquote", () => {
  it("warns when applied to a non-blockquote tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({
      div: [{ p: "Design is how it works.", $: [blockquote()] }],
    } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("blockquote"));
    warn.mockRestore();
  });

  it("sets data-tone=shift-2 on the element", () => {
    render({
      div: [{ blockquote: "Design is how it works.", $: [blockquote()] }],
    } as DomphyElement);
    const el = document.querySelector("blockquote");
    expect(el?.dataset.tone).toBe("shift-2");
  });

  it("releases color state listener on removal", () => {
    const color = toState<"neutral" | "primary">("neutral", "bqColor");
    const { node } = render({
      div: [
        { blockquote: "Design is how it works.", $: [blockquote({ color })] },
      ],
    } as DomphyElement);
    expect(listenerCount(color)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(color)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// divider
// ---------------------------------------------------------------------------

describe("divider", () => {
  it("warns when applied to a non-div tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ span: "or", $: [divider()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("divider"));
    warn.mockRestore();
  });

  it("sets role=separator on the element", () => {
    render({ div: [{ div: "or", $: [divider()] }] } as DomphyElement);
    // The inner div has role=separator
    const el = document.querySelector("[role=separator]");
    expect(el).not.toBeNull();
  });

  it("releases color state listener on removal", () => {
    const color = toState<"neutral" | "primary">("neutral", "divColor");
    const { node } = render({
      div: [{ div: "or", $: [divider({ color })] }],
    } as DomphyElement);
    expect(listenerCount(color)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(color)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// horizontalRule
// ---------------------------------------------------------------------------

describe("horizontalRule", () => {
  it("warns when applied to a non-hr tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ div: "", $: [horizontalRule()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("horizontalRule"),
    );
    warn.mockRestore();
  });

  it("does not warn on an hr tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ hr: "", $: [horizontalRule()] }] } as DomphyElement);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("releases color state listener on removal", () => {
    const color = toState<"neutral" | "primary">("neutral", "hrColor");
    const { node } = render({
      div: [{ hr: "", $: [horizontalRule({ color })] }],
    } as DomphyElement);
    expect(listenerCount(color)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(color)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// avatar
// ---------------------------------------------------------------------------

describe("avatar", () => {
  it("renders initials inside the container", () => {
    render({ div: [{ span: "JD", $: [avatar()] }] } as DomphyElement);
    const el = document.querySelector("span");
    expect(el?.textContent).toBe("JD");
  });

  it("sets data-tone=shift-2 on the element", () => {
    render({ div: [{ span: "JD", $: [avatar()] }] } as DomphyElement);
    const el = document.querySelector("span");
    expect(el?.dataset.tone).toBe("shift-2");
  });

  it("releases color state listener on removal", () => {
    const color = toState<"primary" | "secondary">("primary", "avatarColor");
    const { node } = render({
      div: [{ span: "JD", $: [avatar({ color })] }],
    } as DomphyElement);
    expect(listenerCount(color)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(color)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// icon
// ---------------------------------------------------------------------------

describe("icon", () => {
  it("warns when applied to a non-span tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ div: null, $: [icon()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("icon"));
    warn.mockRestore();
  });

  it("does not warn on a span tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ span: null, $: [icon()] }] } as DomphyElement);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("releases color state listener on removal", () => {
    const color = toState<"neutral" | "primary">("neutral", "iconColor");
    const { node } = render({
      div: [{ span: null, $: [icon({ color })] }],
    } as DomphyElement);
    expect(listenerCount(color)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(color)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// image
// ---------------------------------------------------------------------------

describe("image", () => {
  it("warns when applied to a non-img tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ div: null, $: [image()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("image"));
    warn.mockRestore();
  });

  it("renders the img element with src and alt attributes", () => {
    render({
      div: [{ img: null, src: "photo.jpg", alt: "A photo", $: [image()] }],
    } as DomphyElement);
    const el = document.querySelector("img");
    expect(el?.getAttribute("src")).toBe("photo.jpg");
    expect(el?.getAttribute("alt")).toBe("A photo");
  });

  it("sets data-tone=shift-2 on the element", () => {
    render({
      div: [{ img: null, src: "photo.jpg", alt: "photo", $: [image()] }],
    } as DomphyElement);
    const el = document.querySelector("img");
    expect(el?.dataset.tone).toBe("shift-2");
  });

  it("releases color state listener on removal", () => {
    const color = toState<"neutral" | "primary">("neutral", "imgColor");
    const { node } = render({
      div: [
        { img: null, src: "photo.jpg", alt: "photo", $: [image({ color })] },
      ],
    } as DomphyElement);
    expect(listenerCount(color)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(color)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// figure
// ---------------------------------------------------------------------------

describe("figure", () => {
  it("warns when applied to a non-figure tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ div: null, $: [figure()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("figure"));
    warn.mockRestore();
  });

  it("does not warn on a figure tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({
      div: [
        {
          figure: [{ img: null, src: "photo.jpg", alt: "photo" }],
          $: [figure()],
        },
      ],
    } as DomphyElement);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("releases color state listener on removal", () => {
    const color = toState<"neutral" | "primary">("neutral", "figureColor");
    const { node } = render({
      div: [
        {
          figure: [{ img: null, src: "photo.jpg", alt: "photo" }],
          $: [figure({ color })],
        },
      ],
    } as DomphyElement);
    expect(listenerCount(color)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(color)).toBe(0);
  });
});
