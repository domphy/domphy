---
title: "@domphy/blocks — tweetCard"
description: "Independently designed TweetData contract (author/avatar/verified, text, media, linkPreview, quotedTweet capped at 1 nesting level, createdAt) with an..."
---

# tweetCard

<script setup lang="ts">
import TweetCardDemo from "../demos/blocks/tweetCard.ts?raw"
</script>

A **Core** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `tweetCard()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="TweetCardDemo" />

::: details Implementation notes
Independently designed TweetData contract (author/avatar/verified, text, media, linkPreview, quotedTweet capped at 1 nesting level, createdAt) with an injectable fetchTweet for testability (defaults to an in-memory fixture mock — no real network call). Header (avatar/name/verified-badge/handle/platform-glyph), body with @mention/#hashtag/URL entity styling via a regex tokenizer, media grid (1-4 images), external link-preview card, nested quoted-tweet card, footer timestamp, pulsing loading skeleton, and an 'unavailable' fallback on fetch rejection. Supports both the server-rendered path (`tweet` prop, renders synchronously with zero flicker) and the client-fetch path (`tweetId` + async phases). `theme` prop maps to Domphy's own `dataTheme` attribute override. One real bug found and fixed during testing: the phase-switching reactive root needed distinct `_key`s per phase (skeleton/error/body) — without them the reconciler positionally patched the old skeleton DOM in place instead of replacing it, leaking stale attributes (e.g. the skeleton's aria-label) onto the loaded body; fixed and covered by a test. Verified-badge and platform-logo glyphs are deliberately original generic icons, not reproductions of any platform's trademarked logo.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/tweet-card)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/core/tweetCard.ts [tweetCard]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
