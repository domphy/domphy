// Dump every [data-visual] cell as PNG for human review (not snapshot compare).
// Usage (with docs server running on :3000):
//   node visual/shoot-all.mjs visual/shots-review-light
//   THEME=dark node visual/shoot-all.mjs visual/shots-review-dark
import { createRequire } from "node:module"
import { mkdirSync, writeFileSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { pathToFileURL } from "node:url"

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))
// pnpm nests playwright under the monorepo root .pnpm store
const monorepoRoot = join(here, "../../..")
const coreCandidates = [
  join(monorepoRoot, "node_modules/.pnpm/playwright-core@1.61.1/node_modules/playwright-core/index.mjs"),
  join(monorepoRoot, "node_modules/playwright-core/index.mjs"),
  join(here, "../node_modules/playwright-core/index.mjs"),
]
const corePath = coreCandidates.find((p) => existsSync(p))
if (!corePath) {
  console.error("playwright-core not found; tried:\n" + coreCandidates.join("\n"))
  process.exit(1)
}
const { chromium } = await import(pathToFileURL(corePath).href)

// Standalone catalog host (visual/serve-standalone.mjs), NOT press :3000.
const BASE = process.env.VISUAL_BASE_URL || "http://127.0.0.1:4177"
const outDir = process.argv[2] || "visual/shots-review"
const theme = process.env.THEME || "light"
const catalog = process.env.CATALOG || "patches"
const path = `/?catalog=${catalog}&theme=${theme}`
mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  headless: true,
})
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const report = { theme, path, base: BASE, catalog, cells: [], issues: [] }

await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 120000 })
await page.waitForSelector("[data-visual-ready]", { timeout: 120000 })
await page.waitForSelector("[data-visual]", { timeout: 30000 })
await page.waitForTimeout(800)

const cells = page.locator("[data-visual]")
const count = await cells.count()
if (count === 0) {
  console.error("No [data-visual] cells — is the catalog island mounted?")
  process.exit(1)
}
console.log(`Found ${count} cells on ${path} (${theme})`)

for (let i = 0; i < count; i++) {
  const cell = cells.nth(i)
  const id = await cell.getAttribute("data-visual")
  if (!id) continue
  await cell.scrollIntoViewIfNeeded()
  const focus = await cell.getAttribute("data-visual-focus")
  const hover = await cell.getAttribute("data-visual-hover")
  if (focus) {
    const t = cell.locator("button, a, input, textarea, select").first()
    if ((await t.count()) > 0) await t.focus().catch(() => {})
  }
  if (hover) await cell.hover().catch(() => {})

  const file = join(outDir, `${id}.png`)
  await cell.screenshot({ path: file, animations: "disabled" })

  const contrast = await cell.evaluate((el) => {
    const targets = [...el.querySelectorAll("button, a")]
    const parse = (c) => {
      const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
      return m ? [+m[1], +m[2], +m[3]] : null
    }
    const lum = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
    return targets.map((n) => {
      const s = getComputedStyle(n)
      const tc = parse(s.color)
      const bg = parse(s.backgroundColor)
      const text = (n.innerText || n.textContent || "").trim().slice(0, 40)
      let ratio = null
      if (tc && bg && s.backgroundColor !== "rgba(0, 0, 0, 0)") {
        const L1 = lum(tc)
        const L2 = lum(bg)
        const lighter = Math.max(L1, L2)
        const darker = Math.min(L1, L2)
        ratio = (lighter + 0.05) / (darker + 0.05)
      }
      return {
        text,
        color: s.color,
        bg: s.backgroundColor,
        dataTone: n.getAttribute("data-tone"),
        ratio,
        blankText: text.length === 0 && n.tagName === "BUTTON" && n.getAttribute("data-tone") === "shift-17",
      }
    })
  })

  for (const c of contrast) {
    if (c.ratio != null && c.ratio < 3 && c.text) {
      report.issues.push({ id, kind: "low-contrast", ...c })
      console.log(`[LOW CONTRAST ${c.ratio.toFixed(2)}] ${id}: "${c.text}"`)
    }
    if (c.blankText) {
      report.issues.push({ id, kind: "blank-solid", ...c })
      console.log(`[BLANK SOLID] ${id}`)
    }
  }

  report.cells.push({ id, file, contrast })
  if ((i + 1) % 30 === 0) console.log(`… ${i + 1}/${count}`)
}

writeFileSync(join(outDir, "report.json"), JSON.stringify(report, null, 2))
console.log(`\nDone: ${count} shots → ${outDir}`)
console.log(`Issues: ${report.issues.length}`)
await browser.close()
