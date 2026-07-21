# Domphy visual regression

Playwright screenshot tests against the internal visual catalogs:

- `/docs/visual/patches` — UI patch prop/state matrices
- `/docs/visual/blocks` — every `@domphy/blocks` demo

Each `[data-visual="<id>"]` cell is one baseline PNG.

## Run

```bash
pnpm --filter domphy-web dev   # terminal 1
pnpm --filter domphy-web visual:update  # write baselines
pnpm --filter domphy-web visual         # compare
```

Optional env:

- `VISUAL_BASE_URL` — default `http://127.0.0.1:3000`

## Regenerate blocks catalog

When demos under `docs/demos/blocks/` change:

```bash
pnpm --filter domphy-web visual:blocks-gen
```

## CI note

Visual tests are **not** wired into the main CI pipeline by default (baselines are large and need a stable headless browser). Run them locally (or a dedicated visual job) after UI/blocks changes. Commit updated snapshots from `visual:update` together with the code change.
