---
title: "@domphy/blocks — Methodology"
description: "How @domphy/blocks components are clean-room reimplemented, and how to compare a block against its public reference."
---

# Methodology

Every component in `@domphy/blocks` is a **clean-room implementation**: reimplemented independently from a written functional/visual specification, never from the original source code.

## Why clean-room

`@domphy/blocks` reimplements publicly documented UI patterns from three sources — shadcn/ui, Magic UI, and Aceternity UI. shadcn/ui and Magic UI's free components are MIT-licensed and explicitly meant to be copied; Aceternity UI is distributed through a mixed free/paid registry with no clearly published permissive license for redistributing source code. Rather than treating these three sources differently, the same process was applied to all of them: describe the behavior, then implement independently from that description. This sidesteps the license question entirely, because the underlying visual/behavioral idea — not the specific code expressing it — is what gets reused, and ideas aren't copyrightable.

## The two-stage process

1. **Spec stage.** An agent opens the public reference (the live demo/docs page) and writes a functional/visual specification in plain language: what it looks like, how it behaves, what should be configurable, and the general animation technique — never quoting code, class names, or comments.
2. **Implementation stage.** A *different* agent — one that never saw, browsed, or fetched the original source or website — implements the component from that specification alone, using Domphy's own idioms (`@domphy/core` reactivity, `@domphy/theme` tokens, `@domphy/ui` patches, the Web Animations API instead of Framer Motion).

No third-party source code is copied, transcribed, or redistributed anywhere in this package.

## Honesty about fidelity

Every component's manifest entry (see [`SOURCES.md`](https://github.com/domphy/domphy/blob/main/packages/blocks/SOURCES.md)) records a `status`:

- **`ported`** — implemented to the full recorded spec.
- **`partial`** — implemented with a specific, documented gap (e.g. an animation technique the reference uses that Domphy has no equivalent primitive for yet — see the entry's notes for exactly what differs).

Nothing was silently faked; if an implementer couldn't reasonably match part of the spec, it says so in the notes instead of claiming full fidelity.

## Comparing a block against its reference

Two ways to check a block against the public pattern it's based on:

- **Read the reference URL.** Every `SOURCES.md`/`registry.json` entry links to the live docs page it was specified from — open it side by side with the block's demo.
- **Run the visual-compare script.** `pnpm --filter @domphy/blocks visual-compare [exportName]` boots the local demo harness, screenshots the block, screenshots the reference URL with Playwright, and writes both images to a local (gitignored) folder for side-by-side inspection. This is an on-demand developer tool, not part of CI — reference screenshots are never committed to the repository.
