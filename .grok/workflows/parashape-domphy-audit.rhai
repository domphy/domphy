let meta = #{
    name: "parashape-domphy-audit",
    description: "Audit parashape UI consumption of @domphy: fits, friction, and Domphy-side improvement options",
    when_to_use: "When parashape (apps/app, apps/dashboard, packages/ui, packages/auth) is the consumer and the question is what to improve in Domphy — not a re-audit of @domphy packages themselves.",
    phases: [
        #{ title: "Inventory", detail: "dirty files + usage greps" },
        #{ title: "Audit", detail: "one read-only auditor per UI region" },
        #{ title: "Verify", detail: "adversarial skeptics per cited item" },
        #{ title: "Synthesize", detail: "Domphy improvement options mapped to confirmed friction" },
        #{ title: "Report" },
    ],
};

let inventory_schema = #{
    "type": "object",
    "required": ["dirty", "greps", "notes"],
    "properties": #{
        "dirty": #{
            "type": "array",
            "maxItems": 32,
            "items": #{ "type": "string" },
        },
        "greps": #{
            "type": "array",
            "maxItems": 16,
            "items": #{
                "type": "object",
                "required": ["pattern", "count", "sample_file"],
                "properties": #{
                    "pattern": #{ "type": "string" },
                    "count": #{ "type": "string" },
                    "sample_file": #{ "type": "string" },
                },
            },
        },
        "notes": #{ "type": "string" },
    },
};

let region_schema = #{
    "type": "object",
    "required": ["region", "fits", "friction"],
    "properties": #{
        "region": #{ "type": "string" },
        "fits": #{
            "type": "array",
            "maxItems": 2,
            "items": #{
                "type": "object",
                "required": ["file", "symbol", "claim", "quote"],
                "properties": #{
                    "file": #{ "type": "string" },
                    "symbol": #{ "type": "string" },
                    "claim": #{ "type": "string" },
                    "quote": #{ "type": "string" },
                    "dirty": #{ "type": "boolean" },
                },
            },
        },
        "friction": #{
            "type": "array",
            "maxItems": 2,
            "items": #{
                "type": "object",
                "required": ["file", "symbol", "claim", "quote"],
                "properties": #{
                    "file": #{ "type": "string" },
                    "symbol": #{ "type": "string" },
                    "claim": #{ "type": "string" },
                    "quote": #{ "type": "string" },
                    "dirty": #{ "type": "boolean" },
                },
            },
        },
    },
};

let verdict_schema = #{
    "type": "object",
    "required": ["real", "reason", "evidence"],
    "properties": #{
        "real": #{ "type": "boolean" },
        "reason": #{ "type": "string" },
        "evidence": #{ "type": "string" },
    },
};

let options_schema = #{
    "type": "object",
    "required": ["options", "notes"],
    "properties": #{
        "options": #{
            "type": "array",
            "maxItems": 8,
            "items": #{
                "type": "object",
                "required": ["title", "layer", "addresses", "proposal"],
                "properties": #{
                    "title": #{ "type": "string" },
                    "layer": #{ "type": "string" },
                    "addresses": #{ "type": "string" },
                    "proposal": #{ "type": "string" },
                },
            },
        },
        "notes": #{ "type": "string" },
    },
};

let report_schema = #{
    "type": "object",
    "required": ["markdown"],
    "properties": #{
        "markdown": #{ "type": "string" },
    },
};

fn starts_with(s, prefix) {
    if type_of(s) != "string" { return false; }
    if type_of(prefix) != "string" { return false; }
    if s.len() < prefix.len() { return false; }
    s.sub_string(0, prefix.len()) == prefix
}

fn contains(s, needle) {
    if type_of(s) != "string" { return false; }
    if type_of(needle) != "string" { return false; }
    let n = s.len();
    let m = needle.len();
    if m == 0 { return true; }
    if n < m { return false; }
    let i = 0;
    while i + m <= n {
        if s.sub_string(i, m) == needle { return true; }
        i += 1;
    }
    false
}

fn trimmed(s) {
    if type_of(s) == "string" {
        s.trim();
        s
    } else {
        ""
    }
}

fn in_scope(file) {
    let path = trimmed(file);
    if path == "" { return false; }
    if contains(path, "node_modules") { return false; }
    if contains(path, "packages/core") { return false; }
    if contains(path, "packages/theme") { return false; }
    if contains(path, "@domphy/") { return false; }
    if contains(path, "apps/app") { return true; }
    if contains(path, "apps/dashboard") { return true; }
    if contains(path, "packages/ui") { return true; }
    if contains(path, "packages/auth") { return true; }
    false
}

fn item_ok(it) {
    if it == () { return false; }
    if type_of(it.file) != "string" { return false; }
    if type_of(it.symbol) != "string" { return false; }
    if type_of(it.claim) != "string" { return false; }
    if type_of(it.quote) != "string" { return false; }
    if trimmed(it.file) == "" { return false; }
    if trimmed(it.symbol) == "" { return false; }
    if trimmed(it.claim) == "" { return false; }
    if trimmed(it.quote) == "" { return false; }
    in_scope(it.file)
}

let root = if args == () { () } else { args.root };
if root == () { pause("verification", "Pass args.root — absolute path to the parashape repo (E:/github/parashape)."); }
if type_of(root) != "string" { pause("verification", "args.root must be a string path to the parashape repo."); }

let regions = [
    #{ id: "ui-builder", glob: "packages/ui/src/builder" },
    #{ id: "ui-config-controls", glob: "packages/ui/src/configurator and packages/ui/src/controls" },
    #{ id: "ui-ds", glob: "packages/ui/src/ds" },
    #{ id: "ui-workspace", glob: "packages/ui/src/workspace" },
    #{ id: "ui-material-font", glob: "packages/ui/src/material and packages/ui/src/font" },
    #{ id: "auth", glob: "packages/auth/src" },
    #{ id: "app-shell", glob: "apps/app/src/shell, apps/app/src/router.ts, apps/app/src/main.ts" },
    #{ id: "app-builder-editor", glob: "apps/app/src/builder, apps/app/src/editor, apps/app/src/ViewPage.ts, apps/app/src/ModelDetailPage.ts" },
    #{ id: "app-hosts", glob: "apps/app/src/sketchup, apps/app/src/share, apps/app/src/storefront" },
    #{ id: "dash-shell", glob: "apps/dashboard/src/shell, apps/dashboard/src/router.ts, apps/dashboard/src/main.ts" },
    #{ id: "dash-pages", glob: "apps/dashboard/src/pages" },
    #{ id: "dash-admin-cpq", glob: "apps/dashboard/src/admin, apps/dashboard/src/cpq" },
];

phase("Inventory");
let inv_prompt = "Inventory parashape UI usage of @domphy. ROOT=" + root + ".";
inv_prompt += " Do not audit Domphy's own packages. Subject is the parashape tree only.";
inv_prompt += " Use run_terminal_command and grep. A valid empty dirty list requires that you actually ran git -C ROOT status --short.";
inv_prompt += " 1) git -C ROOT status --short — return dirty/untracked paths under apps/app, apps/dashboard, packages/ui, packages/auth only.";
inv_prompt += " 2) Count (rg --count-matches or grep) these patterns under ROOT restricted to those four trees, *.ts only, exclude node_modules:";
inv_prompt += " display: \"flex\"; stack(; row(; themeColor(; themeSpacing(; themeFluidSpacing(; toState(; behavior(; _onMount; fontSize:; color: \"#; rgba(; from \"@domphy/ui\"; from \"@domphy/core\"; from \"@domphy/theme\".";
inv_prompt += " For each pattern: count as a string (e.g. \"41 files / 120 hits\"), plus one sample_file path relative to ROOT.";
inv_prompt += " notes: one paragraph on whether committed UI vs dirty WIP should be distinguished (ModelThumb.ts if present).";
inv_prompt += " Do not invent counts. If a pattern has 0 hits, count \"0\" and sample_file \"\".";

let inventory = agent(inv_prompt, #{
    label: "inventory",
    capability_mode: "execute",
    output_schema: inventory_schema,
});

let dirty_list = [];
let grep_rows = [];
if inventory != () && inventory.success && inventory.output != () {
    if inventory.output.dirty != () {
        for d in inventory.output.dirty {
            if type_of(d) == "string" && in_scope(d) { dirty_list.push(d); }
        }
    }
    if inventory.output.greps != () {
        for g in inventory.output.greps { grep_rows.push(g); }
    }
}

let dirty_text = json_encode(dirty_list);
log("inventory dirty=" + dirty_list.len().to_string() + " greps=" + grep_rows.len().to_string());

phase("Audit");
let audit_jobs = [];
for region in regions {
    let p = "You are auditing parashape UI consumption of @domphy in ONE region.";
    p += " ROOT=" + root + ". REGION id=" + region.id + ". Paths: " + region.glob + ".";
    p += " Workspace of the parent is Domphy; you MUST read files under ROOT (absolute or ROOT-relative).";
    p += " Do not answer from memory. Use grep and read_file on this region before any claim.";
    p += " A valid empty fits or friction array requires that you opened at least 3 source files in the region.";
    p += " SCOPE: only apps/app, apps/dashboard, packages/ui, packages/auth. Never cite @domphy package sources as evidence of parashape usage.";
    p += " DIRTY FILES (uncommitted; label dirty=true if you cite them): " + dirty_text + ".";
    p += " FITS (thuận lợi, max 2): places this region already uses Domphy correctly — patches via $, themeColor/themeSpacing/themeFluidSpacing, toState/RecordState, stack()/row()/panelSection(), behavior(), typography patches, dialog/button/table/etc.";
    p += " FRICTION (khó khăn, max 2): workarounds, missing primitives, doctor-rule clashes (inline flex instead of stack/row, raw colors, inline typography, hand-rolled focus ring, _onMount instead of behavior, reused-node lifecycle), duplicated design-system wrappers, canvas/host integration pain.";
    p += " Each item MUST have: file (path under ROOT, repo-relative like packages/ui/src/ds/PageContainer.ts), symbol (exported function/class/const), claim (one sentence), quote (verbatim snippet from the opened file, <=160 chars).";
    p += " Prefer committed files over dirty WIP. Do not propose parashape rewrites; just describe the consumption pattern.";
    p += " Do not cite tests, markdown, or node_modules.";
    audit_jobs.push(#{
        prompt: p,
        label: "audit:" + region.id,
        capability_mode: "read-only",
        output_schema: region_schema,
    });
}
let audit_results = parallel(audit_jobs);

let collected = [];
let dropped = 0;
for r in audit_results {
    if r == () || !r.success || r.output == () {
        dropped += 1;
        continue;
    }
    let region_id = trimmed(r.output.region);
    if r.output.fits != () {
        for it in r.output.fits {
            if item_ok(it) {
                collected.push(#{
                    kind: "fit",
                    region: region_id,
                    file: it.file,
                    symbol: it.symbol,
                    claim: it.claim,
                    quote: it.quote,
                });
            } else {
                dropped += 1;
            }
        }
    }
    if r.output.friction != () {
        for it in r.output.friction {
            if item_ok(it) {
                collected.push(#{
                    kind: "friction",
                    region: region_id,
                    file: it.file,
                    symbol: it.symbol,
                    claim: it.claim,
                    quote: it.quote,
                });
            } else {
                dropped += 1;
            }
        }
    }
}
log("audit collected=" + collected.len().to_string() + " dropped=" + dropped.to_string());

if collected.len() == 0 {
    complete(#{
        summary: "No in-scope parashape UI findings after audit. Check args.root and that the tree contains @domphy imports.",
        fits: [],
        friction: [],
        options: [],
        greps: grep_rows,
    });
}

phase("Verify");
let vjobs = [];
let vi = 0;
for it in collected {
    let vp = "Adversarially verify this parashape-vs-Domphy claim by opening the cited file.";
    vp += " ROOT=" + root + ".";
    vp += " kind=" + it.kind + " region=" + it.region + ".";
    vp += " file=" + it.file + " symbol=" + it.symbol + ".";
    vp += " claim=" + json_encode(it.claim) + ".";
    vp += " quoted=" + json_encode(it.quote) + ".";
    vp += " Use read_file (and grep if needed) on ROOT/file. Set real=true ONLY if: (1) the file exists under the parashape tree, (2) the symbol is in that file, (3) the quote text actually appears, (4) the claim matches what the code does.";
    vp += " Default real=false on any mismatch, missing file, Domphy-package citation, or speculative reading.";
    vp += " evidence: path + a short verbatim line you independently saw.";
    vjobs.push(#{
        prompt: vp,
        label: "verify:" + vi.to_string() + ":" + it.kind,
        capability_mode: "read-only",
        output_schema: verdict_schema,
    });
    vi += 1;
}
let verdicts = parallel(vjobs);

let confirmed = [];
let i = 0;
for v in verdicts {
    if v != () && v.success && v.output != () && v.output.real == true {
        let ev = trimmed(v.output.evidence);
        if ev != "" { confirmed.push(collected[i]); }
    }
    i += 1;
}
log("verified " + confirmed.len().to_string() + "/" + collected.len().to_string());

let fits = [];
let friction = [];
for it in confirmed {
    if it.kind == "fit" { fits.push(it); }
    if it.kind == "friction" { friction.push(it); }
}

phase("Synthesize");
let syn_prompt = "Propose Domphy-side improvement options from CONFIRMED parashape friction. Do not rewrite parashape.";
syn_prompt += " ROOT=" + root + ".";
syn_prompt += " Confirmed friction JSON: " + json_encode(friction) + ".";
syn_prompt += " Confirmed fits JSON (context only, not to 'fix'): " + json_encode(fits) + ".";
syn_prompt += " Each option: title, layer (one of api|patch|theme|doctor|docs|runtime), addresses (must name ≥1 confirmed friction by file+symbol), proposal (what to add/change in Domphy).";
syn_prompt += " Drop any idea that is a parashape-only rewrite, has no mapped friction, or is an ungrounded wishlist.";
syn_prompt += " Max 8 options. Prefer the smallest Domphy change that removes the workaround.";
syn_prompt += " You MAY re-read cited parashape files and Domphy AGENTS.md / patch docs to name the right layer. Do not edit files.";

let synthesized = agent(syn_prompt, #{
    label: "synthesize",
    capability_mode: "read-only",
    output_schema: options_schema,
});

let options = [];
if synthesized != () && synthesized.success && synthesized.output != () && synthesized.output.options != () {
    for opt in synthesized.output.options {
        if type_of(opt.title) == "string" && type_of(opt.layer) == "string" && type_of(opt.addresses) == "string" && type_of(opt.proposal) == "string" {
            if trimmed(opt.title) != "" && trimmed(opt.addresses) != "" && trimmed(opt.proposal) != "" {
                options.push(opt);
            }
        }
    }
}

phase("Report");
let rep_prompt = "Write the final markdown report in Vietnamese (paths/symbols/quotes stay as in the source).";
rep_prompt += " Sections MUST be exactly: ## Thuận lợi, ## Khó khăn, ## Phương án cải tiến cho Domphy.";
rep_prompt += " Every thuận lợi / khó khăn item is a bullet: **symbol** (`file`) — claim. Then a quoted code span from the verified quote.";
rep_prompt += " Every phương án names the khó khăn it addresses (file+symbol). No parashape-only fixes.";
rep_prompt += " Add a short ## Phạm vi at the top: ROOT, regions, dirty files " + dirty_text + ".";
rep_prompt += " Add ## Greps with the inventory counts: " + json_encode(grep_rows) + ".";
rep_prompt += " FIT items: " + json_encode(fits) + ".";
rep_prompt += " FRICTION items: " + json_encode(friction) + ".";
rep_prompt += " OPTIONS: " + json_encode(options) + ".";
rep_prompt += " Do not invent extra items. If a section would be empty, keep the heading and write '(không có mục verified)'.";
rep_prompt += " Return { markdown } only. Do not wrap in a code fence.";

let reported = agent(rep_prompt, #{
    label: "report",
    capability_mode: "read-only",
    output_schema: report_schema,
});

let markdown = "# Parashape UI vs Domphy\n\n(report agent failed)\n";
if reported != () && reported.success && reported.output != () && type_of(reported.output.markdown) == "string" {
    let md = reported.output.markdown;
    md.trim();
    if md != "" { markdown = md; }
}

let report_path = write_scratch_file("parashape-domphy-audit.md", markdown);
let greps_path = write_scratch_file("usage-greps.txt", json_encode(grep_rows));
let result_path = write_scratch_file("workflow-result.json", json_encode(#{
    root: root,
    fits: fits,
    friction: friction,
    options: options,
    dirty: dirty_list,
    greps: grep_rows,
    report_path: report_path,
}));

complete(#{
    summary: "fits=" + fits.len().to_string() + " friction=" + friction.len().to_string() + " options=" + options.len().to_string(),
    report_path: report_path,
    greps_path: greps_path,
    result_path: result_path,
    fits: fits,
    friction: friction,
    options: options,
});
