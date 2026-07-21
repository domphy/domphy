# Security Policy

Domphy follows enterprise-grade security hygiene similar to production open-source frameworks (disclosure process, dependency hygiene, and secure defaults for web delivery).

## Supported versions

Security fixes are applied to the latest published release line on `main` / npm (`@domphy/*`). Older minor lines are not patched unless a regression is critical and still widely consumed.

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Email the maintainer with:

- Affected package(s) and versions
- Description and impact
- Reproduction steps or PoC (if safe to share)
- Suggested fix (optional)

We aim to acknowledge reports within **72 hours** and provide a remediation timeline once confirmed.

## Scope

In scope:

- XSS or HTML injection through Domphy runtime/patch APIs when used as documented
- Prototype pollution or unsafe evaluation in published packages
- Supply-chain issues in published `@domphy/*` packages
- Auth / session handling bugs in `@domphy/app` when used as documented

Out of scope:

- Vulnerabilities only present in unreleased local forks or `reference/` trees
- Issues that require deliberately disabling CSP / doctor / browser security features
- Social engineering or physical attacks

## Secure defaults (product)

- **No `eval` / `innerHTML`** in the Domphy runtime model — UIs are plain objects + patches.
- **CSP nonce support** via `configure({ cspNonce })` from `@domphy/core` for sites that inject nonces on `<style>`.
- **Docs site headers** (Vercel): `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS, COOP.
- **Accessibility / FE quality gates** run against critical Front-End Checklist rules (skip link, focus, reduced motion, etc.).

## Dependency policy

- Production dependencies are kept minimal and reviewed on change.
- `pnpm` lockfile is required in CI (`--frozen-lockfile`).
- Publish path is guarded (`scripts/guard-pnpm-publish.mjs` / `verify-publish`).

## Hall of thanks

Responsible disclosures will be credited here with the reporter’s consent.
