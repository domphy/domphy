// Minimal global CSS for @domphy/press.
// Layout element styles now live in layout.ts as inline style:{} objects
// so generateCSS() is the single source of truth for component CSS.
// Only rules that CANNOT be expressed as element-scoped styles remain here:
//   1. Global reset (*, html, body, a)
//   2. JS-managed class-state cross-element selectors
//   3. SVG icon masks (class-targeted, third-party)
//   4. Markdown-rendered HTML content (code blocks, custom blocks, etc.)
//   5. Shiki dark-mode override (data-attr on html, targets third-party spans)

import { themeColor, themeSpacing } from "@domphy/theme";

const tc = (tone: string, color?: string): string =>
  themeColor(null, tone as any, color);
const ts = (n: number): string => themeSpacing(n);

const bg = tc("inherit");
const bgSoft = tc("shift-1");
const bgMute = tc("shift-2");
const border = tc("shift-3");
const textSoft = tc("shift-6");
const text = tc("shift-9");
const textStrong = tc("shift-11");
const brand = tc("shift-9", "primary");

const headerH = ts(14);

export function pressCSS(): string {
  return `
/* ------------------------------------------------------------------ reset */
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:calc(${headerH} + ${ts(4)})}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:${bg};color:${text};line-height:1.6;font-size:16px}
a{color:${brand};text-decoration:none}
a:hover{text-decoration:underline}

/* -------------------------------------------------------- logo theme variants */
/* dp-logo-light/dark classes set in layout.ts img elements */
[data-theme="dark"] .dp-logo-light{display:none}
[data-theme="light"] .dp-logo-dark,.dp-logo-dark{display:none}
[data-theme="dark"] .dp-logo-dark{display:block}

/* ---------------------------------------------------------- social icon masks */
/* dp-social-icon + dp-icon-* classes set in layout.ts socialLinkEl */
.dp-social-icon{display:block;width:${ts(4)};height:${ts(4)};background:currentColor;flex-shrink:0}
.dp-icon-github{-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.741 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.741 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z'/%3E%3C/svg%3E") center/contain no-repeat}
.dp-icon-twitter{-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'/%3E%3C/svg%3E") center/contain no-repeat}
.dp-icon-discord{-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.01.044.032.084.064.107a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01 10.2 10.2 0 0 0 .373.292.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.01.044.032.084.064.107a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01 10.2 10.2 0 0 0 .373.292.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z'/%3E%3C/svg%3E") center/contain no-repeat}

/* ------- sidebar collapsed state (JS toggles 'collapsed' class on group) ------- */
.dp-sidebar-group.collapsed .dp-sidebar-items{display:none}

/* ------- sidebar open state on mobile (JS sets html[data-sidebar="open"]) ------ */
@media(max-width:860px){
  html[data-sidebar="open"] nav[aria-label="Documentation"]{transform:translateX(0)}
}

/* -------------------------------------------------------- heading anchors */
.header-anchor{opacity:0;margin-left:${ts(2)};font-weight:400;font-size:.85em;color:${textSoft};transition:opacity .15s}
:is(h1,h2,h3,h4,h5,h6):hover .header-anchor{opacity:1}
.header-anchor:hover{color:${brand};text-decoration:none}

/* ------------------------------------------------------------ code blocks */
.code-block{margin:${ts(4)} 0;border:1px solid ${border};border-radius:${ts(2)};overflow:hidden}
.code-block-title{display:flex;align-items:center;padding:${ts(1.5)} ${ts(4)};background:${bgMute};border-bottom:1px solid ${border};font-size:12px;font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,monospace;color:${textSoft}}
.code-block-inner{position:relative}
.code-block pre{margin:0;padding:${ts(4)} ${ts(5)};background:${bgSoft};border:none;border-radius:0;overflow-x:auto;font-size:13.5px;line-height:1.5;font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,monospace}
.code-block code{font-family:inherit;background:none;padding:0;font-size:inherit}
.code-block .line{display:inline-block;width:100%}
.code-block .line.highlighted{background:color-mix(in srgb,${brand} 10%,transparent)}
.code-block .line.diff.add{background:color-mix(in srgb,${tc("shift-7", "success")} 12%,transparent)}
.code-block .line.diff.add::before{content:"+ ";color:${tc("shift-7", "success")}}
.code-block .line.diff.remove{background:color-mix(in srgb,${tc("shift-9", "danger")} 10%,transparent);opacity:.7}
.code-block .line.diff.remove::before{content:"- ";color:${tc("shift-9", "danger")}}
.code-block .line.highlighted.error{background:color-mix(in srgb,${tc("shift-9", "error")} 10%,transparent)}
.code-block .line.highlighted.warning{background:color-mix(in srgb,${tc("shift-7", "warning")} 10%,transparent)}
.code-block pre.has-focus .line:not(.focus){opacity:.4;filter:blur(.4px);transition:opacity .2s,filter .2s}
.code-block pre.has-focus:hover .line{opacity:1;filter:none}
.code-block .line-number{display:inline-block;min-width:2.5em;margin-right:1em;color:${textSoft};text-align:right;user-select:none;font-size:.9em}
.code-copy-btn{position:absolute;top:${ts(2)};right:${ts(2)};padding:${ts(1)} ${ts(2)};border-radius:${ts(1.25)};border:1px solid ${border};background:${bgSoft};color:${textSoft};cursor:pointer;font-size:13px;opacity:0;transition:opacity .15s}
.code-block-inner:hover .code-copy-btn{opacity:1}
.code-copy-btn:hover{background:${bgMute};color:${text}}

/* ------------------------------------------------------------- code groups */
.code-group{margin:${ts(4)} 0;border:1px solid ${border};border-radius:${ts(2)};overflow:hidden}
.code-group>input[type="radio"]{position:absolute;opacity:0;pointer-events:none;width:0;height:0}
.code-group .tabs{display:flex;gap:${ts(0.5)};padding:${ts(1.5)} ${ts(2)};background:${bgSoft};border-bottom:1px solid ${border};flex-wrap:wrap}
.code-group .tabs label{padding:${ts(1)} ${ts(3)};font-size:13px;font-weight:500;color:${textSoft};border-radius:${ts(1.25)};cursor:pointer}
.code-group .blocks>.code-block{display:none;margin:0;border:none;border-radius:0}
.code-group .blocks>.code-block pre{border-radius:0}
${Array.from({ length: 8 }, (_, i) => `.code-group>input:nth-of-type(${i + 1}):checked~.blocks>.code-block:nth-child(${i + 1})`).join(",\n")}{display:block}
${Array.from({ length: 8 }, (_, i) => `.code-group>input:nth-of-type(${i + 1}):checked~.tabs>label:nth-child(${i + 1})`).join(",\n")}{color:${brand};background:${bgMute}}

/* ---------------------------------------------------------- card containers */
.custom-block.card{background:${bgSoft};border:1px solid ${border};border-radius:${ts(3)};padding:${ts(5)} ${ts(6)};margin:${ts(3)} 0}
.custom-block.card .card-title{font-size:16px;font-weight:600;color:${textStrong};margin:0 0 ${ts(2)}}
.custom-block.card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(${ts(56)},1fr));gap:${ts(4)};margin:${ts(4)} 0}
a.custom-block.link-card{display:block;background:${bgSoft};border:1px solid ${border};border-radius:${ts(3)};padding:${ts(5)} ${ts(6)};margin:${ts(3)} 0;transition:border-color .15s,background .15s;text-decoration:none;color:${text}}
a.custom-block.link-card:hover{border-color:${brand};background:${bgMute};text-decoration:none}
a.custom-block.link-card .link-card-title{font-size:16px;font-weight:600;color:${brand};margin:0 0 ${ts(2)}}
.custom-block.card-grid .custom-block.card,.custom-block.card-grid a.custom-block.link-card{margin:0}

/* --------------------------------------------------------- custom blocks */
.custom-block{margin:${ts(4)} 0;padding:${ts(3)} ${ts(4)};border-radius:${ts(2)};border:1px solid transparent;font-size:14.5px}
.custom-block p{margin:${ts(2)} 0}
.custom-block-title{font-weight:700;margin:0 0 ${ts(1)} !important;font-size:13px}
.custom-block.tip,.custom-block.success{background:color-mix(in srgb,${brand} 8%,${bg});border-color:color-mix(in srgb,${brand} 28%,transparent)}
.custom-block.info,.custom-block.note,.custom-block.abstract{background:${bgSoft};border-color:${border}}
.custom-block.warning,.custom-block.question{background:color-mix(in srgb,${tc("shift-6", "warning")} 10%,${bg});border-color:${tc("shift-6", "warning")}}
.custom-block.danger,.custom-block.failure,.custom-block.bug{background:color-mix(in srgb,${tc("shift-7", "danger")} 10%,${bg});border-color:${tc("shift-7", "danger")}}
.custom-block.example{background:color-mix(in srgb,${tc("shift-7", "secondary")} 10%,${bg});border-color:${tc("shift-7", "secondary")}}
.custom-block.quote{background:${bgSoft};border-color:${border};border-left-width:4px;border-radius:0 ${ts(2)} ${ts(2)} 0}
details.custom-block summary{cursor:pointer;font-weight:600}

/* ------------------------------------------------------------------- steps */
.custom-block.steps{background:none;border:none;padding:0}
.custom-block.steps>ol{counter-reset:step;list-style:none;padding:0;margin:0}
.custom-block.steps>ol>li{counter-increment:step;display:grid;grid-template-columns:${ts(9)} 1fr;gap:0 ${ts(4)};margin-bottom:${ts(6)}}
.custom-block.steps>ol>li::before{content:counter(step);display:flex;align-items:center;justify-content:center;width:${ts(7.5)};height:${ts(7.5)};border-radius:50%;background:${brand};color:${bg};font-size:13px;font-weight:700;flex-shrink:0}

/* ----------------------------------------------------------------- mermaid */
.dp-mermaid{margin:${ts(5)} 0;text-align:center;overflow-x:auto}
.dp-mermaid svg{max-width:100%;height:auto}

/* --------------------------------------------------------------- task lists */
.task-list-item{list-style:none;margin-left:-1.4em;padding-left:1.8em;position:relative}
.task-list-check{position:absolute;left:0;top:.25em;width:14px;height:14px;cursor:default;accent-color:${brand}}

/* ---------------------------------------------------------------- shiki dark */
html[data-theme="dark"] .shiki,html[data-theme="dark"] .shiki span{color:var(--shiki-dark,inherit) !important}

/* ------------------------------------------------------------------ badges */
.dp-badge{display:inline-block;padding:2px ${ts(2)};font-size:12px;font-weight:600;border-radius:${ts(1.5)};line-height:1.7;vertical-align:middle;white-space:nowrap}
.dp-badge-tip,.dp-badge-info{background:color-mix(in srgb,${brand} 15%,transparent);color:${brand}}
.dp-badge-warning{background:color-mix(in srgb,${tc("shift-6","warning")} 15%,transparent);color:${tc("shift-7","warning")}}
.dp-badge-danger,.dp-badge-error{background:color-mix(in srgb,${tc("shift-7","danger")} 15%,transparent);color:${tc("shift-8","danger")}}
`;
}
