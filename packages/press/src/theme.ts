// Generates all DomphyPress CSS as a string — no static .css file needed.
// Uses themeColor(null, ...) which returns var(--neutral-N) / var(--primary-N)
// references. themeCSS() from @domphy/theme provides the :root + dark-mode
// overrides that resolve those vars, so dark mode just works.

import { themeColor, themeSpacing } from "@domphy/theme"

// Shorthand helpers (no listener — static CSS var references)
const tc = (tone: string, color?: string): string => themeColor(null, tone as any, color)
const ts = (n: number): string => themeSpacing(n)

// Named semantic tokens
const bg = tc("inherit")                  // surface background
const bgSoft = tc("shift-1")             // subtle background
const bgMute = tc("shift-2")             // muted background
const border = tc("shift-3")             // dividers / borders
const textSoft = tc("shift-6")           // placeholder / hint text
const text = tc("shift-9")              // body text
const textStrong = tc("shift-11")        // headings / emphasis
const brand = tc("shift-9", "primary")   // link / active / brand color
const brandHover = tc("shift-10", "primary") // hovered link

// Structural sizes (all em so they scale with root font-size)
const headerH = ts(14)   // 3.5em = 56px @ 16px
const sidebarW = ts(62)  // 15.5em = 248px @ 16px
const asideW = ts(56)    // 14em = 224px @ 16px
const contentMax = ts(190) // 47.5em = 760px @ 16px

export function pressCSS(): string { return `
/* ------------------------------------------------------------------ reset */
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:calc(${headerH} + ${ts(4)})}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:${bg};color:${text};line-height:1.6;font-size:16px}
a{color:${brand};text-decoration:none}
a:hover{text-decoration:underline}

/* -------------------------------------------------------- announcement bar */
.dp-announcement{display:flex;align-items:center;justify-content:center;gap:${ts(3)};padding:${ts(2.5)} ${ts(6)};background:${brand};color:${bg};font-size:14px;font-weight:500;text-align:center}
.dp-announcement a{color:${bg};font-weight:700}
.dp-announcement-close{background:none;border:none;color:${bg};cursor:pointer;font-size:14px;opacity:.7;padding:${ts(0.5)} ${ts(1.5)};border-radius:${ts(1)};flex-shrink:0}
.dp-announcement-close:hover{opacity:1}

/* ------------------------------------------------------------------ header */
.dp-logo{font-weight:700;font-size:18px;color:${textStrong};white-space:nowrap;flex-shrink:0}
.dp-logo:hover{text-decoration:none}
.dp-logo-img{height:${ts(7)};width:auto;display:block}
.dp-nav a{color:${textSoft};font-size:14px;font-weight:500;white-space:nowrap;line-height:1}
.dp-nav a:hover,.dp-nav a[aria-current="page"]{color:${brand};text-decoration:none}
.dp-nav-dropdown{position:relative;display:flex;align-items:center}
.dp-nav-dropdown-label{color:${textSoft};font-size:14px;font-weight:500;cursor:pointer;user-select:none}
.dp-nav-dropdown-label::after{content:" ▾";font-size:10px;opacity:.6}
.dp-nav-dropdown-menu{display:none;position:absolute;top:calc(100% + ${ts(2)});right:0;background:${bgSoft};border:1px solid ${border};border-radius:${ts(2)};padding:${ts(1.5)};min-width:${ts(40)};z-index:100;flex-direction:column;gap:${ts(0.5)};box-shadow:0 4px 16px rgba(0,0,0,.1)}
.dp-nav-dropdown-menu a{display:block;padding:${ts(1.25)} ${ts(2.5)};border-radius:${ts(1.25)};font-size:13px}
.dp-nav-dropdown-menu a:hover{background:${bgMute}}
.dp-nav-dropdown:hover .dp-nav-dropdown-menu,.dp-nav-dropdown:focus-within .dp-nav-dropdown-menu{display:flex}
.dp-header-actions{flex-shrink:0}
.dp-search-slot{width:${ts(50)}}
.dp-search-static{width:100%;height:${ts(8)};padding:0 ${ts(2.5)};border:1px solid ${border};border-radius:${ts(1.5)};background:${bgSoft};color:${textSoft};font-size:13px;font-family:inherit;outline:none;cursor:pointer}
.dp-search-static::placeholder{color:${textSoft}}
.dp-theme-toggle,.dp-menu-toggle{border:1px solid ${border};background:${bgSoft};color:${text};border-radius:${ts(2)};width:${ts(8.5)};height:${ts(8.5)};cursor:pointer;font-size:16px}
.dp-menu-toggle{display:none}

/* ------------------------------------------------------------ social links */
.dp-social-link{display:inline-flex;align-items:center;justify-content:center;width:${ts(8.5)};height:${ts(8.5)};border-radius:${ts(2)};color:${textSoft};background:${bgSoft};border:1px solid ${border};font-size:10px;font-weight:700;flex-shrink:0}
.dp-social-link:hover{color:${text};border-color:${textSoft};text-decoration:none}
.dp-social-icon{display:block;width:${ts(4)};height:${ts(4)};background:currentColor;flex-shrink:0}
.dp-icon-github{-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.741 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.741 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z'/%3E%3C/svg%3E") center/contain no-repeat}
.dp-icon-twitter{-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'/%3E%3C/svg%3E") center/contain no-repeat}
.dp-icon-discord{-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.01.044.032.084.064.107a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01 10.2 10.2 0 0 0 .373.292.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.01.044.032.084.064.107a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01 10.2 10.2 0 0 0 .373.292.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z'/%3E%3C/svg%3E") center/contain no-repeat}

/* ------------------------------------------------------------------ layout */
.dp-shell{display:grid;grid-template-columns:${sidebarW} minmax(0,1fr) ${asideW};align-items:start;max-width:1440px;margin:0 auto}
.dp-sidebar{position:sticky;top:${headerH};max-height:calc(100vh - ${headerH});overflow-y:auto;padding:${ts(6)} ${ts(3)} ${ts(12)} ${ts(6)};border-right:1px solid ${border}}
.dp-sidebar-group{margin-bottom:${ts(3.5)}}
.dp-sidebar-title{display:flex;align-items:center;gap:${ts(1.5)};font-size:13px;font-weight:700;color:${textStrong};margin:${ts(2)} 0 ${ts(1)}}
.dp-sidebar-subtitle{font-size:12px;color:${textSoft};padding:${ts(1)} ${ts(3)};font-weight:600}
.dp-sidebar-items{display:flex;flex-direction:column}
.dp-sidebar-toggle{margin-left:auto;background:none;border:none;cursor:pointer;color:${textSoft};font-size:14px;padding:0 ${ts(1)};line-height:1}
.dp-sidebar-toggle:hover{color:${text}}
.dp-sidebar-group.collapsed .dp-sidebar-items{display:none}
.dp-sidebar a{display:flex;align-items:center;gap:${ts(1.5)};padding:${ts(1.25)} ${ts(3)};font-size:14px;color:${textSoft};border-radius:${ts(1.5)}}
.dp-sidebar a:hover{color:${text};text-decoration:none}
.dp-sidebar a[aria-current="page"]{color:${brand};font-weight:600;background:${bgSoft}}
.dp-sidebar-link-with-badge{display:flex;align-items:center}
.dp-main{padding:${ts(8)} ${ts(12)} ${ts(20)};min-width:0}
.dp-content{max-width:${contentMax}}
.dp-aside{position:sticky;top:${headerH};max-height:calc(100vh - ${headerH});overflow-y:auto;padding:${ts(8)} ${ts(6)};font-size:13px}
.dp-aside-title{font-weight:700;margin-bottom:${ts(2)};color:${text}}
.dp-toc a{display:block;padding:${ts(0.75)} 0;color:${textSoft}}
.dp-toc a:hover{color:${brand};text-decoration:none}
.dp-toc-2{padding-left:0}
.dp-toc-3{padding-left:${ts(3)}}
.dp-toc-4{padding-left:${ts(6)}}

/* ------------------------------------------------------------------ badges */
.dp-badge{display:inline-block;padding:${ts(0.5)} ${ts(1.75)};border-radius:${ts(2.5)};font-size:11px;font-weight:700;line-height:1.4;white-space:nowrap;vertical-align:middle}
.dp-badge-tip{background:color-mix(in srgb,${brand} 12%,${bg});color:${brand}}
.dp-badge-info{background:${bgMute};color:${textSoft}}
.dp-badge-warning{background:color-mix(in srgb,${tc("shift-9","warning")} 12%,${bg});color:${tc("shift-9","warning")}}
.dp-badge-danger{background:color-mix(in srgb,${tc("shift-9","danger")} 12%,${bg});color:${tc("shift-9","danger")}}
.dp-page-badge{margin-left:${ts(2)}}
.dp-page-badge-row{margin-bottom:${ts(-2)}}

/* ------------------------------------------------------------------- prose */
.dp-content h1{font-size:30px;font-weight:700;line-height:1.25;margin:0 0 ${ts(6)};letter-spacing:-.02em;color:${textStrong}}
.dp-content h2{font-size:22px;font-weight:700;margin:${ts(11)} 0 ${ts(4)};padding-top:${ts(5)};border-top:1px solid ${border};letter-spacing:-.01em;color:${textStrong}}
.dp-content h3{font-size:18px;font-weight:600;margin:${ts(7)} 0 ${ts(3)};color:${textStrong}}
.dp-content h4{font-size:16px;font-weight:600;margin:${ts(5.5)} 0 ${ts(2)};color:${textStrong}}
.dp-content p{margin:${ts(4)} 0}
.dp-content ul,.dp-content ol{margin:${ts(4)} 0;padding-left:1.4em}
.dp-content li{margin:${ts(1.5)} 0}
.dp-content a{font-weight:500}
.dp-content strong{font-weight:600;color:${textStrong}}
.dp-content em{font-style:italic}
.dp-content mark{background:color-mix(in srgb,${tc("shift-6","warning")} 40%,${bg});color:inherit;padding:${ts(0.25)} ${ts(0.75)};border-radius:${ts(0.75)}}
.dp-content sup{font-size:.75em;vertical-align:super}
.dp-content sub{font-size:.75em;vertical-align:sub}
.dp-content del{opacity:.5}
.dp-content blockquote{margin:${ts(4)} 0;padding:0 ${ts(4)};border-left:3px solid ${border};color:${textSoft}}
.dp-content img{max-width:100%;height:auto;border-radius:${ts(1.5)}}
.dp-content hr{border:none;border-top:1px solid ${border};margin:${ts(8)} 0}
.dp-content :not(pre)>code{font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,monospace;font-size:.85em;background:${bgMute};padding:${ts(0.75)} ${ts(1.5)};border-radius:${ts(1)}}
.dp-content pre{margin:${ts(4)} 0;padding:${ts(4)} ${ts(5)};background:${bgSoft};border:1px solid ${border};border-radius:${ts(2)};overflow-x:auto;font-size:13.5px;line-height:1.5}
.dp-content pre code{font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,monospace;background:none;padding:0}
.dp-content table{border-collapse:collapse;margin:${ts(4)} 0;display:block;overflow-x:auto}
.dp-content th,.dp-content td{border:1px solid ${border};padding:${ts(2)} ${ts(3.5)};text-align:left}
.dp-content th{background:${bgSoft};font-weight:600}

/* -------------------------------------------------------- heading anchors */
.header-anchor{opacity:0;margin-left:${ts(2)};font-weight:400;font-size:.85em;color:${textSoft};transition:opacity .15s}
:is(h1,h2,h3,h4,h5,h6):hover .header-anchor{opacity:1}
.header-anchor:hover{color:${brand};text-decoration:none}

/* -------------------------------------------------------- external links */
.dp-content a[target="_blank"]::after{content:" ↗";font-size:.75em;opacity:.6}

/* --------------------------------------------------------------- task lists */
.task-list-item{list-style:none;margin-left:-1.4em;padding-left:1.8em;position:relative}
.task-list-check{position:absolute;left:0;top:.25em;width:14px;height:14px;cursor:default;accent-color:${brand}}

/* ------------------------------------------------------------ code blocks */
.code-block{margin:${ts(4)} 0;border:1px solid ${border};border-radius:${ts(2)};overflow:hidden}
.code-block-title{display:flex;align-items:center;padding:${ts(1.5)} ${ts(4)};background:${bgMute};border-bottom:1px solid ${border};font-size:12px;font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,monospace;color:${textSoft}}
.code-block-inner{position:relative}
.code-block pre{margin:0;padding:${ts(4)} ${ts(5)};background:${bgSoft};border:none;border-radius:0;overflow-x:auto;font-size:13.5px;line-height:1.5;font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,monospace}
.code-block code{font-family:inherit;background:none;padding:0;font-size:inherit}
.code-block .line{display:inline-block;width:100%}
.code-block .line.highlighted{background:color-mix(in srgb,${brand} 10%,transparent)}
.code-block .line.diff.add{background:color-mix(in srgb,${tc("shift-7","success")} 12%,transparent)}
.code-block .line.diff.add::before{content:"+ ";color:${tc("shift-7","success")}}
.code-block .line.diff.remove{background:color-mix(in srgb,${tc("shift-9","danger")} 10%,transparent);opacity:.7}
.code-block .line.diff.remove::before{content:"- ";color:${tc("shift-9","danger")}}
.code-block .line.highlighted.error{background:color-mix(in srgb,${tc("shift-9","error")} 10%,transparent)}
.code-block .line.highlighted.warning{background:color-mix(in srgb,${tc("shift-7","warning")} 10%,transparent)}
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
${Array.from({length: 8}, (_, i) => `.code-group>input:nth-of-type(${i+1}):checked~.blocks>.code-block:nth-child(${i+1})`).join(",\n")}{display:block}
${Array.from({length: 8}, (_, i) => `.code-group>input:nth-of-type(${i+1}):checked~.tabs>label:nth-child(${i+1})`).join(",\n")}{color:${brand};background:${bgMute}}

/* --------------------------------------------------------- custom blocks */
.custom-block{margin:${ts(4)} 0;padding:${ts(3)} ${ts(4)};border-radius:${ts(2)};border:1px solid transparent;font-size:14.5px}
.custom-block p{margin:${ts(2)} 0}
.custom-block-title{font-weight:700;margin:0 0 ${ts(1)} !important;font-size:13px}
.custom-block.tip,.custom-block.success{background:color-mix(in srgb,${brand} 8%,${bg});border-color:color-mix(in srgb,${brand} 28%,transparent)}
.custom-block.info,.custom-block.note,.custom-block.abstract{background:${bgSoft};border-color:${border}}
.custom-block.warning,.custom-block.question{background:color-mix(in srgb,${tc("shift-6","warning")} 10%,${bg});border-color:${tc("shift-6","warning")}}
.custom-block.danger,.custom-block.failure,.custom-block.bug{background:color-mix(in srgb,${tc("shift-7","danger")} 10%,${bg});border-color:${tc("shift-7","danger")}}
.custom-block.example{background:color-mix(in srgb,${tc("shift-7","secondary")} 10%,${bg});border-color:${tc("shift-7","secondary")}}
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

/* --------------------------------------------------------------- doc footer */
.dp-doc-footer{display:flex;align-items:center;gap:${ts(4)};flex-wrap:wrap;margin-top:${ts(8)};padding-top:${ts(5)};border-top:1px solid ${border};font-size:13px;color:${textSoft}}
.dp-edit-link{font-weight:500;font-size:13px}
.dp-reading-time::before{content:"📖 "}

/* --------------------------------------------------------------- prev/next */
.dp-prevnext{display:flex;justify-content:space-between;gap:${ts(4)};margin-top:${ts(12)};padding-top:${ts(6)};border-top:1px solid ${border}}
.dp-prevnext a{display:block;padding:${ts(3)} ${ts(4)};border:1px solid ${border};border-radius:${ts(2)};font-weight:600;flex:1}
.dp-prevnext a:hover{border-color:${brand};text-decoration:none}
.dp-prevnext .next{text-align:right}
.dp-prevnext small{display:block;color:${textSoft};font-weight:400;font-size:12px}

/* ----------------------------------------------------------------- footer */
.dp-footer{padding:${ts(6)} ${ts(12)};border-top:1px solid ${border};color:${textSoft};font-size:13px}

/* ---------------------------------------------------------------- home page */
.dp-main-home{max-width:1100px;margin:0 auto;padding:${ts(12)} ${ts(6)} ${ts(20)}}
.dp-hero{text-align:center;padding:${ts(10)} 0 ${ts(6)}}
.dp-hero-name{font-size:56px;font-weight:800;line-height:1.1;letter-spacing:-.03em;background:linear-gradient(120deg,${brand},${tc("shift-7","secondary")});-webkit-background-clip:text;background-clip:text;color:transparent}
.dp-hero-text{font-size:30px;font-weight:700;margin:${ts(3)} 0 0;color:${textStrong}}
.dp-hero-tagline{font-size:18px;color:${textSoft};max-width:${ts(160)};margin:${ts(5)} auto 0}
.dp-hero-actions{display:flex;gap:${ts(3)};justify-content:center;margin-top:${ts(7)};flex-wrap:wrap}
.dp-hero-action{padding:${ts(2.5)} ${ts(5.5)};border-radius:${ts(5.5)};font-weight:600;font-size:15px}
.dp-hero-action.brand{background:${brand};color:${bg}}
.dp-hero-action.brand:hover{background:${brandHover};text-decoration:none}
.dp-hero-action.alt{background:${bgSoft};color:${text};border:1px solid ${border}}
.dp-hero-action.alt:hover{border-color:${brand};text-decoration:none}
.dp-features{display:grid;grid-template-columns:repeat(auto-fit,minmax(${ts(60)},1fr));gap:${ts(4)};margin:${ts(10)} 0}
.dp-feature{padding:${ts(5)};background:${bgSoft};border:1px solid ${border};border-radius:${ts(3)}}
.dp-feature-icon{font-size:28px;margin-bottom:${ts(3)}}
.dp-feature-title{font-weight:700;font-size:17px;margin-bottom:${ts(2)};color:${textStrong}}
.dp-feature-details{font-size:14px;color:${textSoft};margin:0;line-height:1.5}
.dp-feature-link{display:block;color:inherit}
.dp-feature-link:hover{text-decoration:none}
.dp-feature-link:hover .dp-feature{border-color:${brand}}
.dp-home{max-width:${contentMax};margin:0 auto}

/* ---------------------------------------------------------------- shiki dark */
html[data-theme="dark"] .shiki,html[data-theme="dark"] .shiki span{color:var(--shiki-dark,inherit) !important}

/* -------------------------------------------------------------- responsive */
@media(max-width:1200px){
  .dp-shell{grid-template-columns:${sidebarW} minmax(0,1fr)}
  .dp-aside{display:none}
}
@media(max-width:860px){
  .dp-shell{grid-template-columns:1fr}
  .dp-menu-toggle{display:block}
  .dp-sidebar{position:fixed;top:${headerH};left:0;bottom:0;width:80%;max-width:${ts(80)};background:${bg};z-index:25;transform:translateX(-100%);transition:transform .2s ease;max-height:none}
  html[data-sidebar="open"] .dp-sidebar{transform:translateX(0)}
  .dp-nav{display:none}
  .dp-main{padding:${ts(6)} ${ts(5)} ${ts(16)}}
  .dp-search-slot{width:${ts(35)}}
}
` }
