// Markdown pipeline: VitePress-flavoured markdown → Domphy element tree.
// Containers (tip/warning/info/danger/details/code-group), <<< code imports,
// frontmatter, TOC. No Vue/component island extraction — that is app-specific.

import { readFileSync } from "node:fs"
import { dirname, extname, isAbsolute, resolve } from "node:path"
import type { DomphyElement } from "@domphy/core"
import { type MarkdownItToken, splitFrontmatter, tokensToDomphy } from "@domphy/markdown"
import MarkdownIt from "markdown-it"
import container from "markdown-it-container"
// @ts-expect-error -- no type declarations for markdown-it-include
import includeUntyped from "markdown-it-include"
import type { RenderDocOptions, RenderedDoc, TocEntry } from "./types.js"

type CoreState = { tokens: MarkdownItToken[] }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const include = includeUntyped as (md: MarkdownIt, options: { root: string }) => void

// --- <<< code imports --------------------------------------------------------

const CODE_IMPORT_PATTERN = /^<<<\s+(\S+?)(?:\s+\[([^\]]*)\])?\s*$/gm

const EXT_LANG: Record<string, string> = {
  ".ts": "ts", ".tsx": "tsx", ".js": "js", ".jsx": "jsx",
  ".mjs": "js", ".cjs": "js", ".json": "json", ".css": "css",
  ".html": "html", ".vue": "vue", ".md": "markdown",
  ".sh": "bash", ".bash": "bash", ".yml": "yaml", ".yaml": "yaml",
}

function resolveSpecifier(spec: string, fileDir: string, docsDir: string): string {
  if (spec.startsWith("@/")) return resolve(dirname(docsDir), spec.slice(2))
  if (isAbsolute(spec)) return spec
  return resolve(fileDir, spec)
}

function expandCodeImports(body: string, fileDir: string, docsDir: string): string {
  return body.replace(CODE_IMPORT_PATTERN, (_whole, rawPath: string, label?: string) => {
    const absolute = resolveSpecifier(rawPath, fileDir, docsDir)
    const fence = "```"
    let contents: string
    try {
      contents = readFileSync(absolute, "utf8")
    } catch {
      return [fence, `Could not import: ${rawPath}`, fence].join("\n")
    }
    const language = EXT_LANG[extname(absolute).toLowerCase()] ?? ""
    const info = label ? `${language} [${label}]` : language
    return [fence + info, contents.trimEnd(), fence].join("\n")
  })
}

// --- Strip <script> blocks ---------------------------------------------------

const SCRIPT_BLOCK_PATTERN = /<script\b[^>]*>[\s\S]*?<\/script>/gi

function stripScriptBlocks(source: string): string {
  return source.replace(SCRIPT_BLOCK_PATTERN, "").replace(/^\s*\n/, "")
}

// --- Container token shaping -------------------------------------------------

const ADMONITION_TITLES: Record<string, string> = {
  tip: "TIP", warning: "WARNING", info: "INFO", danger: "DANGER",
}

function containerTitle(info: string, type: string): string {
  return info.slice(info.indexOf(type) + type.length).trim()
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function buildTitleTokens(
  Token: new (type: string, tag: string, nesting: number) => MarkdownItToken,
  tag: string, openType: string, closeType: string, className: string | null, title: string,
): MarkdownItToken[] {
  const open = new Token(openType, tag, 1)
  open.block = true
  if (className) open.attrSet("class", className)
  const inline = new Token("inline", "", 0)
  inline.content = title
  inline.children = []
  const text = new Token("text", "", 0)
  text.content = title
  inline.children.push(text)
  const close = new Token(closeType, tag, -1)
  close.block = true
  return [open, inline, close]
}

function buildHtmlBlock(Token: new (type: string, tag: string, nesting: number) => MarkdownItToken, content: string): MarkdownItToken {
  const token = new Token("html_block", "", 0)
  token.content = content
  token.block = true
  return token
}

function buildCodeGroupTokens(
  Token: new (type: string, tag: string, nesting: number) => MarkdownItToken,
  tokens: MarkdownItToken[], openIndex: number, closeIndex: number, groupId: number,
): MarkdownItToken[] {
  const open = tokens[openIndex]
  open.tag = "div"
  open.attrSet("class", "code-group")
  const close = tokens[closeIndex]
  close.tag = "div"

  const fences: Array<{ token: MarkdownItToken; label: string }> = []
  for (let i = openIndex + 1; i < closeIndex; i++) {
    const token = tokens[i]
    if (token.type !== "fence") continue
    const info = (token.info ?? "").trim()
    const labelMatch = info.match(/\[([^\]]*)\]/)
    const language = info.split(/\s+/, 1)[0] ?? ""
    fences.push({ token, label: labelMatch ? labelMatch[1] : language || "Code" })
  }

  if (fences.length === 0) return tokens.slice(openIndex, closeIndex + 1)

  const tabsHtml = [`<div class="tabs">`]
  fences.forEach((fence, i) => {
    const id = `tab-${groupId}-${i}`
    tabsHtml.push(`<input type="radio" name="code-group-${groupId}" id="${id}"${i === 0 ? " checked" : ""}>`)
    tabsHtml.push(`<label for="${id}">${escapeHtml(fence.label)}</label>`)
  })
  tabsHtml.push(`</div>`)

  const inner: MarkdownItToken[] = [
    buildHtmlBlock(Token, tabsHtml.join("\n")),
    buildHtmlBlock(Token, `<div class="blocks">`),
  ]
  fences.forEach((fence, i) => {
    inner.push(buildHtmlBlock(Token, `<div class="block${i === 0 ? " active" : ""}" data-tab="${i}">`))
    fence.token.info = (fence.token.info ?? "").replace(/\[[^\]]*\]/, "").trim()
    inner.push(fence.token)
    inner.push(buildHtmlBlock(Token, `</div>`))
  })
  inner.push(buildHtmlBlock(Token, `</div>`))
  return [open, ...inner, close]
}

function shapeContainers(tokens: MarkdownItToken[]): MarkdownItToken[] {
  if (tokens.length === 0) return tokens
  const Token = tokens[0].constructor as new (type: string, tag: string, nesting: number) => MarkdownItToken
  const output: MarkdownItToken[] = []
  let groupCounter = 0

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    const admonition = token.type.match(/^container_(tip|warning|info|danger)_open$/)
    if (admonition) {
      const type = admonition[1]
      token.tag = "div"
      token.attrSet("class", `custom-block ${type}`)
      const custom = containerTitle(token.info.trim(), type)
      output.push(token)
      output.push(...buildTitleTokens(Token, "p", "paragraph_open", "paragraph_close", "custom-block-title", custom || ADMONITION_TITLES[type] || type.toUpperCase()))
      continue
    }
    if (/^container_(tip|warning|info|danger)_close$/.test(token.type)) {
      token.tag = "div"; output.push(token); continue
    }
    if (token.type === "container_details_open") {
      token.tag = "details"; token.attrSet("class", "custom-block details")
      output.push(token)
      output.push(...buildTitleTokens(Token, "summary", "summary_open", "summary_close", null, containerTitle(token.info.trim(), "details") || "Details"))
      continue
    }
    if (token.type === "container_details_close") {
      token.tag = "details"; output.push(token); continue
    }
    if (token.type === "container_code-group_open") {
      let depth = 0, closeIndex = -1
      for (let j = i; j < tokens.length; j++) {
        if (tokens[j].type === "container_code-group_open") depth++
        else if (tokens[j].type === "container_code-group_close") { depth--; if (depth === 0) { closeIndex = j; break } }
      }
      if (closeIndex === -1) { output.push(token); continue }
      output.push(...buildCodeGroupTokens(Token, tokens, i, closeIndex, groupCounter++))
      i = closeIndex; continue
    }
    output.push(token)
  }
  return output
}

// --- Title resolution --------------------------------------------------------

function titleFromFilePath(filePath: string): string {
  const base = filePath.split(/[\\/]/).pop() ?? filePath
  const name = base.replace(/\.md$/i, "")
  if (name.toLowerCase() === "index") {
    const parts = filePath.split(/[\\/]/).filter(Boolean)
    return parts[parts.length - 2] ?? name
  }
  return name
}

function firstH1(toc: TocEntry[]): string | undefined {
  return toc.find(e => e.level === 1)?.text
}

// --- Parser ------------------------------------------------------------------

function createParser(docsDir: string): MarkdownIt {
  const md = new MarkdownIt({ html: true, linkify: true, typographer: false })
  md.enable(["strikethrough", "table"])
  md.use(include, { root: docsDir })
  const noopRender = () => ""
  for (const name of ["tip", "warning", "info", "danger", "details", "code-group"]) {
    // biome-ignore lint/suspicious/noExplicitAny: markdown-it-container type mismatch across @types versions
    md.use(container as any, name, { render: noopRender })
  }
  md.core.ruler.push("press_containers", (state: CoreState) => {
    state.tokens = shapeContainers(state.tokens)
    return true
  })
  return md
}

// --- Public API --------------------------------------------------------------

export async function renderDoc(source: string, options: RenderDocOptions): Promise<RenderedDoc> {
  const { filePath, docsDir, highlight } = options
  const fileDir = dirname(filePath)
  const { frontmatter, content } = splitFrontmatter(source)
  const stripped = stripScriptBlocks(content)
  const expanded = expandCodeImports(stripped, fileDir, docsDir)
  const md = createParser(docsDir)
  const tokens = md.parse(expanded, {}) as MarkdownItToken[]
  const { body, toc } = tokensToDomphy(tokens, { highlight })
  const frontmatterTitle = typeof frontmatter.title === "string" ? frontmatter.title : undefined
  const title = frontmatterTitle ?? firstH1(toc) ?? titleFromFilePath(filePath)
  return { frontmatter, body: body as DomphyElement[], toc, islands: [], title }
}
