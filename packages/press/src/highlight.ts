import { type BundledLanguage, createHighlighter as createShiki } from "shiki"

const THEME = "github-light"

const LANGUAGES: BundledLanguage[] = [
  "typescript", "javascript", "tsx", "jsx",
  "json", "bash", "shellscript", "html", "css",
  "vue", "svelte", "markdown", "diff", "yaml",
]

const ALIASES: Record<string, string> = {
  ts: "typescript",
  js: "javascript",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  md: "markdown",
  yml: "yaml",
  htm: "html",
}

let pending: ReturnType<typeof createShiki> | null = null

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function unwrapCode(html: string): string {
  const match = html.match(/<code[^>]*>([\s\S]*)<\/code>/)
  return match ? match[1] : html
}

export async function createHighlighter(): Promise<(code: string, language: string) => string> {
  if (!pending) {
    pending = createShiki({ themes: [THEME], langs: LANGUAGES })
  }
  const highlighter = await pending
  const loaded = new Set(highlighter.getLoadedLanguages())
  return (code: string, language: string): string => {
    const resolved = ALIASES[language?.toLowerCase()] ?? language?.toLowerCase()
    if (!resolved || !loaded.has(resolved)) return escapeHtml(code)
    return unwrapCode(
      highlighter.codeToHtml(code, { lang: resolved, theme: THEME }),
    )
  }
}
