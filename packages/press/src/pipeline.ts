// Markdown pipeline: VitePress-baseline markdown → Domphy element tree.
// Containers, <<< imports, frontmatter, TOC, line highlights, external links.

import { readFileSync } from "node:fs"
import { dirname, extname, isAbsolute, resolve } from "node:path"
import type { DomphyElement } from "@domphy/core"
import { type MarkdownItToken, splitFrontmatter, tokensToDomphy } from "@domphy/markdown"
import MarkdownIt from "markdown-it"
import container from "markdown-it-container"
// @ts-expect-error -- no bundled types
import markUntyped from "markdown-it-mark"
// @ts-expect-error -- no bundled types
import subUntyped from "markdown-it-sub"
// @ts-expect-error -- no bundled types
import supUntyped from "markdown-it-sup"
// @ts-expect-error -- no bundled types
import includeUntyped from "markdown-it-include"
import { escapeHtml, renderFence } from "./highlight.js"
import type { RenderDocOptions, RenderedDoc, TocEntry } from "./types.js"

type CoreState = { tokens: MarkdownItToken[] }
type MdPlugin = (md: MarkdownIt) => void
const include = includeUntyped as (md: MarkdownIt, options: { root: string }) => void
const markPlugin = markUntyped as MdPlugin
const subPlugin = subUntyped as MdPlugin
const supPlugin = supUntyped as MdPlugin

// --- <<< code imports --------------------------------------------------------

const CODE_IMPORT_PATTERN = /^<<<\s+(\S+?)(?:\s+\[([^\]]*)\])?\s*$/gm

const EXT_LANG: Record<string, string> = {
  ".ts": "ts", ".tsx": "tsx", ".js": "js", ".jsx": "jsx",
  ".mjs": "js", ".cjs": "js", ".json": "json", ".css": "css",
  ".html": "html", ".vue": "vue", ".md": "markdown",
  ".sh": "bash", ".bash": "bash", ".yml": "yaml", ".yaml": "yaml",
  ".rb": "ruby", ".py": "python", ".go": "go", ".rs": "rust",
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
    try { contents = readFileSync(absolute, "utf8") }
    catch { return [fence, `Could not import: ${rawPath}`, fence].join("\n") }
    const language = EXT_LANG[extname(absolute).toLowerCase()] ?? ""
    const info = label ? `${language} [${label}]` : language
    return [fence + info, contents.trimEnd(), fence].join("\n")
  })
}

// --- Strip <script> blocks ---------------------------------------------------

function stripScriptBlocks(source: string): string {
  return source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/^\s*\n/, "")
}

// --- Container token shaping -------------------------------------------------

const ADMONITION_TITLES: Record<string, string> = {
  tip: "TIP", warning: "WARNING", info: "INFO", danger: "DANGER",
  note: "NOTE", abstract: "ABSTRACT", success: "SUCCESS",
  question: "QUESTION", failure: "FAILURE", bug: "BUG",
  example: "EXAMPLE", quote: "QUOTE",
}

function containerTitle(info: string, type: string): string {
  return info.slice(info.indexOf(type) + type.length).trim()
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
    const labelMatch = info.match(/\[([^\]]+)\]/)
    const language = info.split(/\s+/, 1)[0] ?? ""
    fences.push({ token, label: labelMatch ? labelMatch[1] : language || "Code" })
  }

  if (fences.length === 0) return tokens.slice(openIndex, closeIndex + 1)

  // Inputs as direct children of .code-group (before .tabs) — enables CSS :checked sibling selector
  const inputsHtml = fences.map((_, i) =>
    `<input type="radio" name="cg-${groupId}" id="cgt-${groupId}-${i}"${i === 0 ? " checked" : ""}>`
  ).join("")
  const labelsHtml = fences.map((fence, i) =>
    `<label for="cgt-${groupId}-${i}">${escapeHtml(fence.label)}</label>`
  ).join("")

  const inner: MarkdownItToken[] = [
    buildHtmlBlock(Token, `${inputsHtml}<div class="tabs">${labelsHtml}</div>`),
    buildHtmlBlock(Token, `<div class="blocks">`),
  ]
  fences.forEach((fence) => {
    fence.token.info = (fence.token.info ?? "").replace(/\[[^\]]*\]/, "").trim()
    inner.push(fence.token)
  })
  inner.push(buildHtmlBlock(Token, `</div>`))
  return [open, ...inner, close]
}

function shapeContainers(tokens: MarkdownItToken[]): MarkdownItToken[] {
  if (tokens.length === 0) return tokens
  const Token = tokens[0].constructor as new (type: string, tag: string, nesting: number) => MarkdownItToken
  const output: MarkdownItToken[] = []
  let groupCounter = 0

  const ALL_ADMONITIONS = Object.keys(ADMONITION_TITLES).join("|")
  const admonitionRe = new RegExp(`^container_(${ALL_ADMONITIONS})_open$`)
  const admonitionCloseRe = new RegExp(`^container_(${ALL_ADMONITIONS})_close$`)

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    const admonition = token.type.match(admonitionRe)
    if (admonition) {
      const type = admonition[1]
      token.tag = "div"
      token.attrSet("class", `custom-block ${type}`)
      const custom = containerTitle(token.info.trim(), type)
      output.push(token)
      output.push(...buildTitleTokens(Token, "p", "paragraph_open", "paragraph_close", "custom-block-title", custom || ADMONITION_TITLES[type] || type.toUpperCase()))
      continue
    }
    if (admonitionCloseRe.test(token.type)) { token.tag = "div"; output.push(token); continue }
    if (token.type === "container_details_open") {
      token.tag = "details"; token.attrSet("class", "custom-block details")
      output.push(token)
      output.push(...buildTitleTokens(Token, "summary", "summary_open", "summary_close", null, containerTitle(token.info.trim(), "details") || "Details"))
      continue
    }
    if (token.type === "container_details_close") { token.tag = "details"; output.push(token); continue }
    if (token.type === "container_steps_open") {
      token.tag = "div"; token.attrSet("class", "custom-block steps")
      output.push(token); continue
    }
    if (token.type === "container_steps_close") { token.tag = "div"; output.push(token); continue }
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

// --- Task list detection (GFM-style) -----------------------------------------

function shapeTaskLists(tokens: MarkdownItToken[]): MarkdownItToken[] {
  if (tokens.length === 0) return tokens
  const Token = tokens[0].constructor as new (type: string, tag: string, nesting: number) => MarkdownItToken
  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i]
    if (token.type !== "inline" || !token.children?.length) continue
    const prev = tokens[i - 1]
    if (prev?.type !== "list_item_open") continue
    const firstChild = token.children[0]
    if (firstChild.type !== "text") continue
    const text = firstChild.content
    const isTask = text.startsWith("[ ] ") || text.startsWith("[x] ") || text.startsWith("[X] ")
    if (!isTask) continue
    const checked = text[1].toLowerCase() === "x"
    firstChild.content = text.slice(4)
    token.content = token.content.replace(/^\[[ xX]\] /, "")
    prev.attrSet("class", ((prev.attrGet("class") ?? "") + " task-list-item").trim())
    const checkToken = new Token("html_inline", "", 0)
    checkToken.content = `<input type="checkbox"${checked ? " checked" : ""} disabled class="task-list-check" aria-label="${checked ? "done" : "todo"}">`
    token.children.unshift(checkToken)
  }
  return tokens
}

// --- Parser ------------------------------------------------------------------

function createParser(docsDir: string, highlight: (code: string, lang: string) => string): MarkdownIt {
  const md = new MarkdownIt({ html: true, linkify: true, typographer: false })
  md.enable(["strikethrough", "table"])
  md.use(include, { root: docsDir })
  md.use(markPlugin)
  md.use(subPlugin)
  md.use(supPlugin)
  const noopRender = () => ""
  const ADMONITION_NAMES = Object.keys(ADMONITION_TITLES)
  for (const name of [...ADMONITION_NAMES, "details", "code-group", "steps"]) {
    // biome-ignore lint/suspicious/noExplicitAny: markdown-it-container type mismatch
    md.use(container as any, name, { render: noopRender })
  }
  md.core.ruler.push("press_containers", (state: CoreState) => {
    state.tokens = shapeContainers(state.tokens)
    return true
  })
  md.core.ruler.push("press_task_lists", (state: CoreState) => {
    state.tokens = shapeTaskLists(state.tokens)
    return true
  })
  // Convert fence tokens → html_block with full rendering (line highlights, copy button)
  md.core.ruler.push("press_fences", (state: CoreState) => {
    for (const token of state.tokens) {
      if (token.type !== "fence") continue
      const html = renderFence(token.content, token.info ?? "", highlight)
      token.type = "html_block"
      token.content = html
      token.tag = ""
    }
    return true
  })
  // External links: add target=_blank + rel=noopener
  md.core.ruler.push("press_external_links", (state: CoreState) => {
    for (const token of state.tokens) {
      if (token.type !== "inline" || !token.children) continue
      for (const child of token.children) {
        if (child.type !== "link_open") continue
        const href = child.attrGet("href") ?? ""
        if (href.startsWith("http://") || href.startsWith("https://")) {
          child.attrSet("target", "_blank")
          child.attrSet("rel", "noopener noreferrer")
        }
      }
    }
    return true
  })
  return md
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

// --- Public API --------------------------------------------------------------

export async function renderDoc(source: string, options: RenderDocOptions): Promise<RenderedDoc> {
  const { filePath, docsDir, highlight } = options
  const fileDir = dirname(filePath)
  const { frontmatter, content } = splitFrontmatter(source)
  const stripped = stripScriptBlocks(content)
  const expanded = expandCodeImports(stripped, fileDir, docsDir)
  const md = createParser(docsDir, highlight)
  const tokens = md.parse(expanded, {}) as MarkdownItToken[]
  // highlight still passed to tokensToDomphy for any inline code handling
  const { body, toc } = tokensToDomphy(tokens, { highlight })
  const frontmatterTitle = typeof frontmatter.title === "string" ? frontmatter.title : undefined
  const title = frontmatterTitle ?? firstH1(toc) ?? titleFromFilePath(filePath)
  return { frontmatter, body: body as DomphyElement[], toc, islands: [], title }
}
