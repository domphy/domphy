import { type BundledLanguage, createHighlighter as createShiki } from "shiki";

const LIGHT_THEME = "github-light";
const DARK_THEME = "github-dark-dimmed";

const LANGUAGES: BundledLanguage[] = [
  "typescript",
  "javascript",
  "tsx",
  "jsx",
  "json",
  "bash",
  "shellscript",
  "html",
  "css",
  "vue",
  "svelte",
  "markdown",
  "diff",
  "yaml",
  "ruby",
  "python",
  "go",
  "rust",
  "sql",
];

const ALIASES: Record<string, string> = {
  ts: "typescript",
  js: "javascript",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  md: "markdown",
  yml: "yaml",
  htm: "html",
  rb: "ruby",
  py: "python",
};

let pending: ReturnType<typeof createShiki> | null = null;

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function unwrapCode(html: string): string {
  const match = html.match(/<code[^>]*>([\s\S]*)<\/code>/);
  return match ? match[1] : html;
}

// --- Fence info parsing -------------------------------------------------------

export interface FenceMeta {
  lang: string;
  highlightLines: Set<number>;
  lineNumbers: boolean;
  title: string | null;
}

export function parseFenceInfo(info: string): FenceMeta {
  const rawLang = (info.match(/^(\S+)/) ?? [])[1] ?? "";
  const lang = ALIASES[rawLang.toLowerCase()] ?? rawLang.toLowerCase();
  const lineNumbers = info.includes(":line-numbers");
  // Title: [text] where text contains non-digit chars (to not conflict with line range labels)
  const titleMatch = info.match(/\[([^\]]*[a-zA-Z.][^\]]*)\]/);
  const title = titleMatch ? titleMatch[1] : null;
  const rangeMatch = info.match(/\{([0-9,\s-]+)\}/);
  const highlightLines = new Set<number>();
  if (rangeMatch) {
    for (const part of rangeMatch[1].split(",")) {
      const range = part.trim().split("-").map(Number);
      if (range.length === 1 && !Number.isNaN(range[0]))
        highlightLines.add(range[0]);
      else if (range.length === 2)
        for (let i = range[0]; i <= range[1]; i++) highlightLines.add(i);
    }
  }
  return { lang, highlightLines, lineNumbers, title };
}

// --- [!code ...] annotation extraction ----------------------------------------

const CODE_ANNOTATION_RE = /\s*\/\/ \[!code ([^\]]+)\]\s*$/;

const ANNOTATION_CLASSES: Record<string, string> = {
  "++": "diff add",
  "--": "diff remove",
  highlight: "highlighted",
  focus: "focus",
  error: "highlighted error",
  warning: "highlighted warning",
};

interface Annotations {
  cleanCode: string;
  lineClasses: Map<number, string>;
  hasFocus: boolean;
}

function extractAnnotations(code: string): Annotations {
  const lines = code.split("\n");
  const lineClasses = new Map<number, string>();
  const cleanLines: string[] = [];
  let hasFocus = false;

  for (const line of lines) {
    const match = CODE_ANNOTATION_RE.exec(line);
    if (match) {
      const keyword = match[1].trim();
      const cls = ANNOTATION_CLASSES[keyword];
      if (cls) {
        if (cls.includes("focus")) hasFocus = true;
        lineClasses.set(cleanLines.length + 1, cls);
      }
      cleanLines.push(line.replace(CODE_ANNOTATION_RE, ""));
    } else {
      cleanLines.push(line);
    }
  }
  return { cleanCode: cleanLines.join("\n"), lineClasses, hasFocus };
}

// --- Post-process shiki HTML --------------------------------------------------

function annotateLines(
  html: string,
  lineClasses: Map<number, string>,
  highlightLines: Set<number>,
  hasFocus: boolean,
  lineNumbers: boolean,
): string {
  let lineIndex = 0;
  return html.replace(/<span class="line">/g, () => {
    lineIndex++;
    const annotationCls = lineClasses.get(lineIndex) ?? "";
    const classes = ["line"];
    if (annotationCls) classes.push(...annotationCls.split(" "));
    else if (highlightLines.has(lineIndex)) classes.push("highlighted");
    if (hasFocus && !annotationCls.includes("focus")) classes.push("dimmed");
    const numHtml = lineNumbers
      ? `<span class="line-number">${lineIndex}</span>`
      : "";
    return `${numHtml}<span class="${classes.join(" ")}">`;
  });
}

// --- Public API ---------------------------------------------------------------

export async function createHighlighter(): Promise<
  (code: string, lang: string) => string
> {
  if (!pending)
    pending = createShiki({ themes: [LIGHT_THEME, DARK_THEME], langs: LANGUAGES });
  const highlighter = await pending;
  const loaded = new Set(highlighter.getLoadedLanguages());
  return (code: string, lang: string): string => {
    const resolved = ALIASES[lang?.toLowerCase()] ?? lang?.toLowerCase();
    if (!resolved || !loaded.has(resolved)) return escapeHtml(code);
    return unwrapCode(
      highlighter.codeToHtml(code, {
        lang: resolved,
        themes: { light: LIGHT_THEME, dark: DARK_THEME },
      }),
    );
  };
}

// renderFence: converts one fence block to HTML with title, copy button, line annotations.
export function renderFence(
  code: string,
  info: string,
  highlight: (code: string, lang: string) => string,
): string {
  const { lang, highlightLines, lineNumbers, title } = parseFenceInfo(info);

  if (lang === "mermaid") {
    return `<div class="dp-mermaid language-mermaid">${escapeHtml(code.trim())}</div>`;
  }

  const { cleanCode, lineClasses, hasFocus } = extractAnnotations(code);
  const innerHtml = highlight(cleanCode.trimEnd(), lang);
  const annotated = annotateLines(
    innerHtml,
    lineClasses,
    highlightLines,
    hasFocus,
    lineNumbers,
  );
  const hasAnnotations = highlightLines.size > 0 || lineClasses.size > 0;
  const titleHtml = title
    ? `<div class="code-block-title"><span>${escapeHtml(title)}</span></div>`
    : "";
  const preClass = [
    "shiki",
    lineNumbers ? "line-numbers" : "",
    hasAnnotations ? "has-annotations" : "",
    hasFocus ? "has-focus" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const langClass = lang ? `language-${lang}` : "";
  return `<div class="code-block ${langClass}">${titleHtml}<div class="code-block-inner"><pre class="${preClass}"><code>${annotated}</code></pre><button class="code-copy-btn" type="button" aria-label="Copy code" data-copy>⎘</button></div></div>`;
}
