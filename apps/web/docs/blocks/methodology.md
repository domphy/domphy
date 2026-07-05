---
title: "@domphy/blocks — Methodology"
description: "How @domphy/blocks components are clean-room reimplemented, and how to compare a block against its public reference."
---

# Methodology

Every component in `@domphy/blocks` is a **clean-room implementation**: reimplemented independently from a written functional/visual specification, never from the original source code.

## Why clean-room

`@domphy/blocks` reimplements publicly documented UI patterns from two sources — shadcn/ui and Magic UI. Both are MIT-licensed and their free components are explicitly meant to be copied; this package doesn't rely on that license grant to justify inclusion, since nothing is copied from them in the first place — the process below describes the behavior, then implements independently from that description, so the underlying visual/behavioral idea (not copyrightable) is what gets reused, not the specific code expressing it.

An earlier version of this package also included ~79 components sourced from Aceternity UI, spec'd the same way. That category was removed entirely (2026-07-05): Aceternity has no clean public source repo, only an unauthenticated registry JSON endpoint, so those 79 had never actually been diffed against real upstream code. A direct-diff pass on a couple of them (see "Fidelity corrections via direct source diff" below) turned up genuine, not-approximation-level gaps — the wrong animation technique entirely, not a styling nuance. Rather than re-diff all 79 one at a time, the whole category was dropped instead of shipping components nobody had verified.

## The two-stage process

1. **Spec stage.** An agent opens the public reference (the live demo/docs page) and writes a functional/visual specification in plain language: what it looks like, how it behaves, what should be configurable, and the general animation technique — never quoting code, class names, or comments.
2. **Implementation stage.** A *different* agent — one that never saw, browsed, or fetched the original source or website — implements the component from that specification alone, using Domphy's own idioms (`@domphy/core` reactivity, `@domphy/theme` tokens, `@domphy/ui` patches, the Web Animations API instead of Framer Motion).

No third-party source code is copied, transcribed, or redistributed anywhere in this package.

## Fidelity corrections via direct source diff

The two-stage spec process is good at capturing gross behavior but can miss precise implementation detail (an animation driven by a growing border vs. a traced SVG outline look similar in prose but read very differently on screen). Since shadcn/ui and Magic UI are both MIT-licensed, reading their real source directly — after the fact, specifically to verify or fix a shipped component — carries no license concern; only the original clean-room *build* process avoided it. When a fidelity issue is suspected or reported, the correct next step is: clone the real upstream repo (or, for shadcn/Magic UI CLI-style registries, fetch the component's registry JSON), diff it line-by-line against the shipped Domphy file, and fix only what's actually different — not re-guess from screenshots. This is how `bentoGrid`'s missing box-shadow and `pointerHighlight`'s (pre-removal Aceternity) wrong outline-draw technique were both found and fixed.

## Honesty about fidelity

Every component's manifest entry (see [`SOURCES.md`](https://github.com/domphy/domphy/blob/main/packages/blocks/SOURCES.md)) records a `status`:

- **`ported`** — implemented to the full recorded spec.
- **`partial`** — implemented with a specific, documented gap (e.g. an animation technique the reference uses that Domphy has no equivalent primitive for yet — see the entry's notes for exactly what differs).

Nothing was silently faked; if an implementer couldn't reasonably match part of the spec, it says so in the notes instead of claiming full fidelity.

## Comparing a block against its reference

Two ways to check a block against the public pattern it's based on:

- **Read the reference URL.** Every `SOURCES.md`/`registry.json` entry links to the live docs page it was specified from — open it side by side with the block's demo.
- **Run the visual-compare script.** `pnpm --filter @domphy/blocks visual-compare [exportName]` boots the local demo harness, screenshots the block, screenshots the reference URL with Playwright, and writes both images to a local (gitignored) folder for side-by-side inspection. The reference screenshot is cached on disk and reused on later runs (only the local screenshot is re-captured each time) — pass `--refresh-reference` to force re-fetching it. This is an on-demand developer tool, not part of CI — reference screenshots are never committed to the repository.
