# Enterprise readiness map

How Domphy maps [Front-End Checklist](https://github.com/thedaviddias/Front-End-Checklist) quality rules and [Haystack](https://github.com/deepset-ai/haystack)-style open-source enterprise hygiene onto this monorepo.

Haystack is a **Python** LLM orchestration framework — we do **not** embed it as a runtime dependency of Domphy (TypeScript UI stack). We adopt the **product practices** it models (security policy, CI gates, production verification) and implement FE rules from the Checklist with real tooling.

## Front-End Checklist → Domphy

| Checklist area | Domphy implementation |
| --- | --- |
| HTML: doctype, charset, viewport, lang | `@domphy/press` HTML document + `apps/web/html-template.ts` |
| Accessibility: skip navigation | `.dp-skip-link` → `#main-content` on every press shell |
| Accessibility: focus indicators | `@domphy/ui` shared `focusRing()` on interactive patches |
| Accessibility: reduced motion | `prefers-reduced-motion` in `pressCSS()` + `motion()` skip WAAPI |
| Accessibility: automated audit | `pnpm a11y` / `pnpm a11y:prod` (axe-core + Puppeteer) |
| Security: transport & framing | `vercel.json` headers (HSTS, XFO, nosniff, Referrer-Policy, COOP, Permissions-Policy) |
| Security: CSP hooks | `configure({ cspNonce })` in `@domphy/core` for apps that enforce CSP |
| Performance: cache static assets | long-cache headers for `/assets/*` and hashed static files |
| SEO: robots + sitemap | `public/robots.txt` + press build sitemap |
| Testing | Vitest monorepo + CI workflow + prod a11y job on `main` |

## Haystack-style hygiene → Domphy

| Practice | Domphy |
| --- | --- |
| Public security policy | `SECURITY.md` |
| Strict CI | `.github/workflows/ci.yml` (biome + build + test) |
| Production verification | `a11y-prod` job after push to `main` |
| Minimal trusted publish path | `scripts/verify-publish.mjs`, publish guards |
| Agent-readable product surface | `AGENTS.md`, `llms.txt`, `@domphy/mcp` |

## Commands

```bash
# Full monorepo quality gate
pnpm ci

# Production a11y audit (requires network)
pnpm a11y:prod

# Audit arbitrary URL(s)
pnpm --filter domphy-web a11y -- https://example.com
```

## Out of scope (intentionally)

- Installing `haystack-ai` into this TypeScript monorepo
- Shipping a RAG product inside Domphy core (use a separate service if needed)
