# Domphy visual regression

Playwright screenshots of every `[data-visual="<id>"]` cell in the patch/block
catalogs. Host is the **standalone** catalog server (not press islands).

## Run

```bash
# From apps/web — auto-starts serve-standalone on :4177
pnpm visual:update   # write baselines
pnpm visual           # compare

# One-shot dump for human review (no snapshot compare):
node visual/serve-standalone.mjs --port 4177   # terminal 1
node visual/shoot-all.mjs visual/shots-review-light
THEME=dark node visual/shoot-all.mjs visual/shots-review-dark
```

Catalogs (standalone query string):

- `/?catalog=patches` — UI patch prop/state matrices (`docs/demos/visual/patches-catalog.ts`)
- `/?catalog=blocks` — every `@domphy/blocks` demo

Press docs path `/visual/patches` exists but islands often don't mount
`data-visual` cells — always use the standalone host for screenshots.

Optional: `VISUAL_BASE_URL` (default `http://127.0.0.1:4177`).

## Regenerate blocks catalog

```bash
pnpm --filter domphy-web visual:blocks-gen
```

## CI note

Visual tests are **not** in the main CI pipeline by default (large baselines +
stable headless browser). Run locally after UI/blocks changes.
