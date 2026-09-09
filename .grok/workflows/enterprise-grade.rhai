let meta = #{
    name: "enterprise-grade",
    description: "Audit and fix every Domphy package to an enterprise bar: code, docs completeness, and real Playwright UX for UI surfaces",
    when_to_use: "When a business-ready pass is needed: all packages audited and confirmed issues fixed, UI packages exercised in real Chromium (interaction + visual), and docs checked for truth and coverage — broader than production-ready publish gates.",
    phases: [
        #{ title: "Audit", detail: "one auditor per package plus docs shards" },
        #{ title: "Verify", detail: "adversarial skeptics on code and docs findings" },
        #{ title: "Fix", detail: "one fixer per package with confirmed issues" },
        #{ title: "UX", detail: "real Playwright interaction and visual checks" },
        #{ title: "UX-verify", detail: "adversarial triage of Playwright failures" },
        #{ title: "UX-fix", detail: "fix confirmed real-browser bugs" },
        #{ title: "Content", detail: "docs, AGENTS.md, llms, CHANGELOG alignment" },
        #{ title: "Prove", detail: "machine gates plus re-run failed Playwright" },
        #{ title: "Repair", detail: "one more pass if prove failed" },
        #{ title: "Report" },
    ],
};

let findings_schema = #{
    "type": "object",
    "required": ["pkg", "findings"],
    "properties": #{
        "pkg": #{ "type": "string" },
        "findings": #{
            "type": "array",
            "maxItems": 6,
            "items": #{
                "type": "object",
                "required": ["severity", "file", "issue", "fix"],
                "properties": #{
                    "severity": #{ "type": "string" },
                    "file": #{ "type": "string" },
                    "issue": #{ "type": "string" },
                    "fix": #{ "type": "string" },
                    "lane": #{ "type": "string" },
                },
            },
        },
    },
};

let verdict_schema = #{
    "type": "object",
    "required": ["real", "severity", "reason", "evidence"],
    "properties": #{
        "real": #{ "type": "boolean" },
        "severity": #{ "type": "string" },
        "reason": #{ "type": "string" },
        "evidence": #{ "type": "string" },
    },
};

let fix_schema = #{
    "type": "object",
    "required": ["pkg", "fixed", "remaining", "tests_pass", "notes"],
    "properties": #{
        "pkg": #{ "type": "string" },
        "fixed": #{ "type": "array", "items": #{ "type": "string" } },
        "remaining": #{ "type": "array", "items": #{ "type": "string" } },
        "tests_pass": #{ "type": "boolean" },
        "notes": #{ "type": "string" },
    },
};

let ux_run_schema = #{
    "type": "object",
    "required": ["id", "passed", "failed_items", "notes"],
    "properties": #{
        "id": #{ "type": "string" },
        "passed": #{ "type": "boolean" },
        "failed_items": #{
            "type": "array",
            "maxItems": 12,
            "items": #{
                "type": "object",
                "required": ["title", "kind", "excerpt"],
                "properties": #{
                    "title": #{ "type": "string" },
                    "kind": #{ "type": "string" },
                    "excerpt": #{ "type": "string" },
                },
            },
        },
        "notes": #{ "type": "string" },
    },
};

let prove_schema = #{
    "type": "object",
    "required": ["passed", "commands", "blockers"],
    "properties": #{
        "passed": #{ "type": "boolean" },
        "commands": #{ "type": "array", "items": #{ "type": "string" } },
        "blockers": #{ "type": "array", "items": #{ "type": "string" } },
    },
};

fn starts_with(s, prefix) {
    if type_of(s) != "string" { return false; }
    if type_of(prefix) != "string" { return false; }
    if s.len() < prefix.len() { return false; }
    s.sub_string(0, prefix.len()) == prefix
}

fn trimmed(s) {
    if type_of(s) == "string" {
        s.trim();
        s
    } else {
        ""
    }
}

fn norm_sev(s) {
    if type_of(s) != "string" { return "p1"; }
    if s == "p0" || s == "P0" { return "p0"; }
    "p1"
}

fn in_catalog(dir, catalog) {
    for row in catalog {
        if row.dir == dir { return true; }
    }
    false
}

fn file_in_scope(file, dir) {
    let path = trimmed(file);
    if path == "" { return false; }
    if path == dir { return true; }
    if starts_with(path, dir + "/") { return true; }
    if starts_with(path, "packages/") { return starts_with(path, dir); }
    if starts_with(path, "apps/") { return starts_with(path, dir); }
    let extra = [
        "AGENTS.md",
        "DESIGN.md",
        "STABLE-READINESS.md",
        "ENTERPRISE.md",
        "CHANGELOG.md",
        "package.json",
        "pnpm-workspace.yaml",
        "scripts/",
        "apps/web/public/llms.txt",
        "apps/web/public/llms-full.txt",
        "apps/web/public/manifest.json",
        "apps/web/scripts/",
        "apps/web/docs/",
        "apps/web/visual/",
    ];
    for root in extra {
        if path == root { return true; }
        if starts_with(path, root) { return true; }
    }
    false
}

fn matches_request(dir, requested) {
    if requested == () { return true; }
    if type_of(requested) != "array" { return true; }
    if requested.len() == 0 { return true; }
    for r in requested {
        if type_of(r) != "string" { continue; }
        if dir == r { return true; }
        if dir == "packages/" + r { return true; }
        if dir == "apps/" + r { return true; }
    }
    false
}

fn selected_has(selected, dir) {
    for row in selected {
        if row.dir == dir { return true; }
    }
    false
}

fn kill_note() {
    " Kill leftover node/vite/chromium/playwright before returning (Windows: taskkill /F /T /PID). PowerShell: chain with ;  — the shell does not support &&. Do not start watchers."
}

fn audit_prompt(dir, pkg_name, kind) {
    let p = "You are auditing " + dir + " (" + pkg_name + ", kind=" + kind + ") in the Domphy monorepo for ENTERPRISE-GRADE readiness.";
    p += " Workspace root is the current working directory. Do not answer from memory.";
    p += " Use read_file, list_dir, grep, and run_terminal_command. A valid empty findings list requires that you actually opened package.json, src public entry, README.md if present, CHANGELOG.md if publishable, tests/ (or noted they are missing), and the matching apps/web/docs/ folder if one exists.";
    p += " Enterprise bar (P0 = must fix this run): advertised public API that is stubbed/wrong; tests fail or it.skip/it.fails without an enforced ledger; docs or README that describe APIs the source does not implement (including removed form()/field() patches); CHANGELOG/version/STABLE-READINESS.md matrix mismatch for publishable packages; package.json exports/types that would break consumers; SSR/hydration claims with no test when the package ships SSR; security claims (sanitize/rawHtml/CSP) that the code does not keep.";
    p += " P1 (track, only fix if cheap and local): public export with no docs page; thin examples; missing keyboard coverage on an interactive patch. Do not mark visual polish or extra recipes as p0.";
    p += " For kind=private or kind=app: skip npm-publish fields. P0 is failing tests, broken scripts, or docs that lie.";
    p += " Hard rules: at most 6 findings; each must cite a file path you opened; severity is p0 or p1; lane is \"code\".";
    p += " pkg field MUST be exactly \"" + dir + "\". Do not report issues in other packages.";
    p += kill_note();
    p += " Return {pkg, findings:[{severity,file,issue,fix,lane}]}.";
    p
}

fn docs_prompt(shard_id, docs_dir, pkg_dirs_json) {
    let p = "You are auditing Domphy DOCS completeness and truth for shard " + shard_id + ".";
    p += " Docs directory: " + docs_dir + ". Owning package dirs JSON: " + pkg_dirs_json + ".";
    p += " Workspace root is cwd. Do not answer from memory. Use read_file, list_dir, grep.";
    p += " 1) List public exports from each owning package (src/index.ts and patch/factory files).";
    p += " 2) List markdown pages under " + docs_dir + " and the matching apps/web/docs/demos/ trees.";
    p += " 3) P0 (docs LIE): a page or demo imports/calls an API that does not exist in source; removed APIs still documented as current; example that contradicts types; llms.txt/AGENTS.md claiming a method the package does not export.";
    p += " 4) P1 (docs INCOMPLETE): a public export with no page; missing required-prop documentation; demo file missing for a documented factory. Do not demand a page per internal helper.";
    p += " Also read the package README if present. Compare names, do not invent APIs.";
    p += " Hard rules: at most 6 findings; file paths repo-relative; pkg MUST be the first owning package dir from the JSON (a packages/... or apps/... path); lane is \"docs\".";
    p += " A valid empty list requires that you opened the export file AND the docs directory listing.";
    p += kill_note();
    p += " Return {pkg, findings:[{severity,file,issue,fix,lane}]}.";
    p
}

fn verify_prompt(item) {
    let encoded = json_encode(item);
    let p = "Adversarially verify this enterprise-grade finding. Default real=false.";
    p += " Finding JSON: " + encoded;
    p += " Independently read the cited file with read_file/grep. Open the source of truth (implementation, test, or docs page) — do not trust the finding text.";
    p += " real=true ONLY with concrete evidence you inspected: broken advertised contract, failing/skipped tests without ledger, docs that describe a missing API, publish metadata that would break consumers, or a confirmed UX interaction bug.";
    p += " Style nits, 'could be nicer', extra examples, and snapshot-only visual noise are real=false.";
    p += " If the file does not exist or the issue is already fixed, real=false.";
    p += " evidence must quote or paraphrase the exact lines you read. Empty evidence means real=false.";
    p += " Return {real, severity, reason, evidence}.";
    p
}

fn fix_prompt(dir, pkg_name, items) {
    let encoded = json_encode(items);
    let p = "Fix confirmed enterprise-grade issues in " + dir + " (" + pkg_name + ").";
    p += " Confirmed findings JSON: " + encoded;
    p += " Scope: prefer files under " + dir + "/. You MAY edit matching docs under apps/web/docs/ for this package only when the finding lane is docs and the lie/gap is in that page. Do not bump versions. Do not commit or push.";
    p += " Do the real fix, not a skip/stub/it.todo. English comments only. Do not invent APIs.";
    p += " After edits, run the package test script if it has one: pnpm --filter " + pkg_name + " test";
    p += kill_note();
    p += " If a finding cannot be fixed without a shared root file, put it in remaining and explain.";
    p += " Return {pkg:\"" + dir + "\", fixed:[...], remaining:[...], tests_pass:bool, notes}.";
    p
}

fn ux_run_prompt(id, cmd, port, pkgs_json) {
    let p = "Run a REAL Chromium Playwright (or listed) UX gate for Domphy surface " + id + ".";
    p += " Command (from repo root): " + cmd;
    p += " Expected port: " + port + ". Packages in scope JSON: " + pkgs_json + ".";
    p += " This is interaction + visual QA, not jsdom. Do not start vitest. Do not pass --update-snapshots.";
    p += " Capture stdout/stderr. passed=true only if the process exits 0 AND there are zero failed tests.";
    p += " failed_items: parse Playwright failures. title = test title. kind is one of: interaction, crash, overflow, snapshot, a11y, other.";
    p += " Snapshot-only pixel diffs (no interaction failure) still go in failed_items with kind=snapshot.";
    p += " excerpt: short failure body (assertion + locator), not a full trace.";
    p += " After the run, kill leftover node/vite/chromium on port " + port + " (taskkill /F /T /PID). Do not leave webServer processes.";
    p += kill_note();
    p += " Return {id:\"" + id + "\", passed:bool, failed_items:[{title,kind,excerpt}], notes}.";
    p
}

fn ux_seq_prompt() {
    let p = "Run TWO real Chromium Playwright suites SEQUENTIALLY because they share port 4183.";
    p += " 1) pnpm --filter domphy-web visual:editor";
    p += " 2) After editor fully exits and port 4183 is free: pnpm --filter domphy-web visual:three";
    p += " Do not run them in parallel. Do not --update-snapshots. Do not start vitest.";
    p += " passed=true only if BOTH exit 0 with zero failed tests.";
    p += " failed_items: combine failures from both, prefix title with editor: or three:.";
    p += " kind: interaction, crash, overflow, snapshot, a11y, other.";
    p += " Kill leftover node/vite/chromium on 4183 when done.";
    p += kill_note();
    p += " Return {id:\"editor-three\", passed:bool, failed_items:[{title,kind,excerpt}], notes}.";
    p
}

fn ux_verify_prompt(item) {
    let encoded = json_encode(item);
    let p = "Adversarially triage this Playwright UX failure. Default real=false.";
    p += " Failure JSON: " + encoded;
    p += " Read the spec (apps/web/visual/*.spec.ts or packages/blocks/e2e/*.spec.ts) and the implementation it mounts. Use read_file/grep.";
    p += " real=true only if this is a product bug (broken interaction, crash, overflow, focus trap, missing paint, tooltip off-screen, axe critical/serious).";
    p += " real=false for snapshot pixel drift from fonts/OS, flake from timing without a product bug, or an already-fixed issue.";
    p += " evidence must cite the spec assertion and the source you opened. Empty evidence means real=false.";
    p += " Return {real, severity, reason, evidence}. Use severity p0 for interaction/crash/overflow/a11y, p1 for snapshot-only if you still mark real.";
    p
}

fn ux_fix_prompt(items_json) {
    let p = "Fix confirmed REAL-BROWSER UX bugs from Playwright. Confirmed JSON: " + items_json;
    p += " Edit the implementation (packages/ui, packages/blocks, packages/chart, packages/editor, packages/three, or the spec only if the spec is wrong).";
    p += " Do not update screenshot baselines to hide a bug. Do not skip the test. English comments only. Do not commit.";
    p += " After edits, re-run ONLY the failing command from the finding (the same pnpm visual:* or test:e2e). Kill leftover browsers.";
    p += kill_note();
    p += " Return {pkg:\"ux\", fixed:[...], remaining:[...], tests_pass:bool, notes}.";
    p
}

fn content_prompt(touched_json, remaining_json, docs_confirmed_json) {
    let p = "Align repo-level docs and agent content after enterprise-grade fixes.";
    p += " Touched dirs JSON: " + touched_json;
    p += " Remaining notes JSON: " + remaining_json;
    p += " Confirmed docs findings JSON: " + docs_confirmed_json;
    p += " Read git diff (git diff -- packages apps/web AGENTS.md STABLE-READINESS.md) and grep for stale APIs.";
    p += " Update ONLY if code/docs actually drifted: AGENTS.md, apps/web/public/llms.txt, apps/web/scripts/llms-full.mjs inputs, matching apps/web/docs pages, STABLE-READINESS.md Version column if a version string is already wrong — do not bump versions yourself.";
    p += " Do not invent APIs. Do not commit.";
    p += kill_note();
    p += " Return a short notes string of files you changed, or 'no shared content drift'.";
    p
}

fn prove_prompt(payload_json) {
    let p = "Run Domphy enterprise-grade MACHINE gates. Do not claim pass without command output.";
    p += " Payload JSON: " + payload_json;
    p += " Working directory: repo root.";
    p += kill_note();
    p += " Run as many as apply; do not stop at the first failure.";
    p += " 1) node scripts/stable-readiness-check.mjs";
    p += " 2) pnpm check (biome). If it fails only on untouched files, still list it as a blocker.";
    p += " 3) For each touched package with a test script: pnpm --filter <package.json name> test. If touched is empty and full_repo is true: pnpm -r --workspace-concurrency=3 test.";
    p += " 4) Re-run any Playwright command listed in payload.ux_rerun (exact strings). Do not --update-snapshots.";
    p += " 5) If full_repo: node scripts/verify-publish.mjs --all";
    p += " passed=true only when every command you ran exited 0 AND blockers is empty.";
    p += " Return {passed, commands:[\"cmd => exit N\"], blockers:[...]}.";
    p
}

fn repair_prompt(blockers_json, payload_json) {
    let p = "Prove failed. Fix remaining enterprise-grade blockers, then re-run the failing commands.";
    p += " Blockers JSON: " + blockers_json;
    p += " Payload JSON: " + payload_json;
    p += " Fix root cause in source/tests/docs — not by skipping tests or updating snapshots to hide bugs.";
    p += " You MAY edit shared files if the blocker is matrix/changelog/docs drift.";
    p += " Do not commit. Kill leftover processes. Return the prove schema again after re-running the failing items.";
    p
}

let catalog = [
    #{ dir: "packages/app", name: "@domphy/app", kind: "publishable" },
    #{ dir: "packages/blocks", name: "@domphy/blocks", kind: "publishable" },
    #{ dir: "packages/chart", name: "@domphy/chart", kind: "publishable" },
    #{ dir: "packages/core", name: "@domphy/core", kind: "publishable" },
    #{ dir: "packages/create-domphy", name: "create-domphy", kind: "publishable" },
    #{ dir: "packages/dnd", name: "@domphy/dnd", kind: "publishable" },
    #{ dir: "packages/doctor", name: "@domphy/doctor", kind: "publishable" },
    #{ dir: "packages/editor", name: "@domphy/editor", kind: "publishable" },
    #{ dir: "packages/floating", name: "@domphy/floating", kind: "publishable" },
    #{ dir: "packages/form", name: "@domphy/form", kind: "publishable" },
    #{ dir: "packages/i18n", name: "@domphy/i18n", kind: "publishable" },
    #{ dir: "packages/mcp", name: "@domphy/mcp", kind: "publishable" },
    #{ dir: "packages/press", name: "@domphy/press", kind: "publishable" },
    #{ dir: "packages/query", name: "@domphy/query", kind: "publishable" },
    #{ dir: "packages/router", name: "@domphy/router", kind: "publishable" },
    #{ dir: "packages/table", name: "@domphy/table", kind: "publishable" },
    #{ dir: "packages/theme", name: "@domphy/theme", kind: "publishable" },
    #{ dir: "packages/three", name: "@domphy/three", kind: "publishable" },
    #{ dir: "packages/ui", name: "@domphy/ui", kind: "publishable" },
    #{ dir: "packages/virtual", name: "@domphy/virtual", kind: "publishable" },
    #{ dir: "packages/pages", name: "@domphy/pages", kind: "private" },
    #{ dir: "apps/web", name: "domphy-web", kind: "app" },
];

let docs_shards = [
    #{ id: "ui-patches", docs_dir: "apps/web/docs/ui", dirs: ["packages/ui"] },
    #{ id: "blocks", docs_dir: "apps/web/docs/blocks", dirs: ["packages/blocks"] },
    #{ id: "core-theme", docs_dir: "apps/web/docs/core", dirs: ["packages/core", "packages/theme"] },
    #{ id: "app-press-i18n", docs_dir: "apps/web/docs/app", dirs: ["packages/app", "packages/press", "packages/i18n"] },
    #{ id: "data-layer", docs_dir: "apps/web/docs/query", dirs: ["packages/query", "packages/table", "packages/form", "packages/virtual", "packages/router"] },
    #{ id: "viz", docs_dir: "apps/web/docs/chart", dirs: ["packages/chart", "packages/three", "packages/editor"] },
    #{ id: "tooling", docs_dir: "apps/web/docs/doctor", dirs: ["packages/doctor", "packages/mcp", "packages/dnd", "packages/floating", "packages/create-domphy"] },
    #{ id: "agent-surface", docs_dir: "apps/web/docs", dirs: ["apps/web"] },
];

let ux_wave1 = [
    #{ id: "ui-overlays", cmd: "pnpm --filter domphy-web visual:ui-overlays", port: "4180", dirs: ["packages/ui"] },
    #{ id: "ui-patches", cmd: "pnpm --filter domphy-web visual:patches", port: "4177", dirs: ["packages/ui"] },
    #{ id: "blocks-e2e", cmd: "pnpm --filter @domphy/blocks test:e2e", port: "5611", dirs: ["packages/blocks"] },
    #{ id: "blocks-responsive", cmd: "pnpm --filter domphy-web visual:blocks-responsive", port: "4179", dirs: ["packages/blocks"] },
    #{ id: "chart", cmd: "pnpm --filter domphy-web visual:chart", port: "4184", dirs: ["packages/chart"] },
];

let requested = ();
let skip_pw = false;
let do_fix = true;
if args != () {
    requested = args.packages;
    if args.skip_playwright == true { skip_pw = true; }
    if args.fix == false { do_fix = false; }
}

let selected = [];
for row in catalog {
    if matches_request(row.dir, requested) {
        selected.push(row);
    }
}
if selected.len() == 0 {
    for row in catalog { selected.push(row); }
}

let active_shards = [];
for shard in docs_shards {
    let hit = false;
    for d in shard.dirs {
        if selected_has(selected, d) { hit = true; }
    }
    if hit { active_shards.push(shard); }
}

log("enterprise-grade: " + selected.len().to_string() + " packages, " + active_shards.len().to_string() + " docs shards, skip_playwright=" + skip_pw.to_string() + " fix=" + do_fix.to_string());

phase("Audit");
let audit_jobs = [];
for row in selected {
    audit_jobs.push(#{
        prompt: audit_prompt(row.dir, row.name, row.kind),
        label: "audit:" + row.dir,
        capability_mode: "read-only",
        output_schema: findings_schema,
    });
}
for shard in active_shards {
    audit_jobs.push(#{
        prompt: docs_prompt(shard.id, shard.docs_dir, json_encode(shard.dirs)),
        label: "docs:" + shard.id,
        capability_mode: "read-only",
        output_schema: findings_schema,
    });
}
let audit_results = parallel(audit_jobs);

let p0s = [];
let p1s = [];
let dropped_scope = 0;
let dropped_cap = 0;
const MAX_VERIFY = 28;

let audit_index = 0;
for r in audit_results {
    let fallback_pkg = "";
    if audit_index < selected.len() {
        fallback_pkg = selected[audit_index].dir;
    } else {
        let shard_i = audit_index - selected.len();
        if shard_i < active_shards.len() && active_shards[shard_i].dirs.len() > 0 {
            fallback_pkg = active_shards[shard_i].dirs[0];
        }
    }
    audit_index += 1;
    if r == () || !r.success || r.output == () { continue; }
    if type_of(r.output) != "map" { continue; }
    if r.output.findings == () { continue; }
    for f in r.output.findings {
        if type_of(f) != "map" { continue; }
        let pkg = trimmed(f.pkg);
        if pkg == "" { pkg = fallback_pkg; }
        if !in_catalog(pkg, selected) && !starts_with(pkg, "apps/") && !starts_with(pkg, "packages/") {
            dropped_scope += 1;
            continue;
        }
        let file = trimmed(f.file);
        if !file_in_scope(file, pkg) {
            dropped_scope += 1;
            continue;
        }
        let lane = trimmed(f.lane);
        if lane == "" { lane = "code"; }
        let item = #{
            pkg: pkg,
            severity: norm_sev(f.severity),
            file: file,
            issue: trimmed(f.issue),
            fix: trimmed(f.fix),
            lane: lane,
        };
        if item.issue == "" { continue; }
        if item.severity == "p0" {
            p0s.push(item);
        } else {
            p1s.push(item);
        }
    }
}
log("raw p0=" + p0s.len().to_string() + " p1=" + p1s.len().to_string() + " dropped_scope=" + dropped_scope.to_string());

let to_verify = [];
for f in p0s {
    if to_verify.len() >= MAX_VERIFY {
        dropped_cap += 1;
        continue;
    }
    to_verify.push(f);
}
if to_verify.len() < MAX_VERIFY {
    for f in p1s {
        if to_verify.len() >= MAX_VERIFY {
            dropped_cap += 1;
            continue;
        }
        if f.lane == "docs" {
            to_verify.push(f);
        }
    }
}
if dropped_cap > 0 {
    log("capped verify list, dropped " + dropped_cap.to_string());
}

let confirmed = [];
if to_verify.len() > 0 {
    phase("Verify");
    let vjobs = [];
    for f in to_verify {
        vjobs.push(#{
            prompt: verify_prompt(f),
            label: "verify:" + f.pkg,
            capability_mode: "read-only",
            output_schema: verdict_schema,
        });
    }
    let verdicts = parallel(vjobs);
    let vi = 0;
    for v in verdicts {
        if v != () && v.success && v.output != () && type_of(v.output) == "map" {
            if v.output.real == true && v.output.evidence != () {
                let ev = trimmed(v.output.evidence);
                if ev != "" {
                    let item = to_verify[vi];
                    if norm_sev(v.output.severity) == "p0" {
                        item.severity = "p0";
                    }
                    confirmed.push(item);
                }
            }
        }
        vi += 1;
    }
    log(confirmed.len().to_string() + "/" + to_verify.len().to_string() + " findings confirmed");
}

let groups = [];
if do_fix {
    for f in confirmed {
        let found_idx = -1;
        let gi = 0;
        for g in groups {
            if g.dir == f.pkg { found_idx = gi; }
            gi += 1;
        }
        if found_idx == -1 {
            groups.push(#{ dir: f.pkg, name: f.pkg, items: [f] });
        } else {
            groups[found_idx].items.push(f);
        }
    }
    for g in groups {
        for row in selected {
            if row.dir == g.dir { g.name = row.name; }
        }
    }
}

let fix_outputs = [];
let remaining_notes = [];
if do_fix && groups.len() > 0 {
    phase("Fix");
    let fjobs = [];
    for g in groups {
        fjobs.push(#{
            prompt: fix_prompt(g.dir, g.name, g.items),
            label: "fix-pkg:" + g.dir,
            capability_mode: "all",
            output_schema: fix_schema,
        });
    }
    let fresults = parallel(fjobs);
    for r in fresults {
        if r == () || !r.success || r.output == () { continue; }
        if type_of(r.output) != "map" { continue; }
        fix_outputs.push(r.output);
        if r.output.remaining != () {
            for note in r.output.remaining { remaining_notes.push(note); }
        }
    }
}

let touched_dirs = [];
for g in groups { touched_dirs.push(g.dir); }

let ux_failures = [];
let ux_runs = [];
let ux_rerun = [];
if !skip_pw {
    let wave1 = [];
    for surf in ux_wave1 {
        let hit = false;
        for d in surf.dirs {
            if selected_has(selected, d) { hit = true; }
        }
        if hit { wave1.push(surf); }
    }
    let need_editor = selected_has(selected, "packages/editor");
    let need_three = selected_has(selected, "packages/three");

    if wave1.len() > 0 || need_editor || need_three {
        phase("UX");
    }

    if wave1.len() > 0 {
        let ujobs = [];
        for surf in wave1 {
            ujobs.push(#{
                prompt: ux_run_prompt(surf.id, surf.cmd, surf.port, json_encode(surf.dirs)),
                label: "ux:" + surf.id,
                capability_mode: "all",
                output_schema: ux_run_schema,
            });
        }
        let uresults = parallel(ujobs);
        let ui = 0;
        for r in uresults {
            let surf = wave1[ui];
            ui += 1;
            if r == () || !r.success || r.output == () || type_of(r.output) != "map" {
                ux_failures.push(#{
                    id: surf.id,
                    cmd: surf.cmd,
                    title: surf.id + " runner failed",
                    kind: "other",
                    excerpt: "agent success=false or empty output",
                    dirs: surf.dirs,
                });
                continue;
            }
            ux_runs.push(r.output);
            if r.output.passed != true {
                ux_rerun.push(surf.cmd);
            }
            if r.output.failed_items != () {
                for item in r.output.failed_items {
                    if type_of(item) != "map" { continue; }
                    let title = trimmed(item.title);
                    if title == "" { continue; }
                    ux_failures.push(#{
                        id: surf.id,
                        cmd: surf.cmd,
                        title: title,
                        kind: trimmed(item.kind),
                        excerpt: trimmed(item.excerpt),
                        dirs: surf.dirs,
                    });
                }
            }
        }
    }

    if need_editor || need_three {
        let seq = agent(ux_seq_prompt(), #{
            label: "ux:editor-three",
            capability_mode: "all",
            output_schema: ux_run_schema,
        });
        let seq_dirs = [];
        if need_editor { seq_dirs.push("packages/editor"); }
        if need_three { seq_dirs.push("packages/three"); }
        if seq == () || !seq.success || seq.output == () || type_of(seq.output) != "map" {
            ux_failures.push(#{
                id: "editor-three",
                cmd: "pnpm --filter domphy-web visual:editor ; pnpm --filter domphy-web visual:three",
                title: "editor-three runner failed",
                kind: "other",
                excerpt: "agent success=false or empty output",
                dirs: seq_dirs,
            });
        } else {
            ux_runs.push(seq.output);
            if seq.output.passed != true {
                if need_editor { ux_rerun.push("pnpm --filter domphy-web visual:editor"); }
                if need_three { ux_rerun.push("pnpm --filter domphy-web visual:three"); }
            }
            if seq.output.failed_items != () {
                for item in seq.output.failed_items {
                    if type_of(item) != "map" { continue; }
                    let title = trimmed(item.title);
                    if title == "" { continue; }
                    ux_failures.push(#{
                        id: "editor-three",
                        cmd: "pnpm --filter domphy-web visual:editor",
                        title: title,
                        kind: trimmed(item.kind),
                        excerpt: trimmed(item.excerpt),
                        dirs: seq_dirs,
                    });
                }
            }
        }
    }
    log("ux failures=" + ux_failures.len().to_string());
}

let ux_confirmed = [];
const MAX_UX_VERIFY = 12;
if ux_failures.len() > 0 {
    phase("UX-verify");
    let slice = [];
    let ux_dropped = 0;
    for f in ux_failures {
        if slice.len() >= MAX_UX_VERIFY {
            ux_dropped += 1;
            continue;
        }
        slice.push(f);
    }
    if ux_dropped > 0 {
        log("capped ux verify, dropped " + ux_dropped.to_string());
    }
    let uvjobs = [];
    for f in slice {
        uvjobs.push(#{
            prompt: ux_verify_prompt(f),
            label: "ux-verify:" + f.id,
            capability_mode: "read-only",
            output_schema: verdict_schema,
        });
    }
    let uv = parallel(uvjobs);
    let uvi = 0;
    for v in uv {
        if v != () && v.success && v.output != () && type_of(v.output) == "map" {
            if v.output.real == true && v.output.evidence != () {
                let ev = trimmed(v.output.evidence);
                if ev != "" {
                    ux_confirmed.push(slice[uvi]);
                }
            }
        }
        uvi += 1;
    }
    log(ux_confirmed.len().to_string() + "/" + slice.len().to_string() + " ux failures confirmed");
}

if do_fix && ux_confirmed.len() > 0 {
    phase("UX-fix");
    let ux_fix = agent(ux_fix_prompt(json_encode(ux_confirmed)), #{
        label: "ux-fix",
        capability_mode: "all",
        output_schema: fix_schema,
    });
    if ux_fix != () && ux_fix.success && ux_fix.output != () && type_of(ux_fix.output) == "map" {
        fix_outputs.push(ux_fix.output);
        if ux_fix.output.remaining != () {
            for note in ux_fix.output.remaining { remaining_notes.push(note); }
        }
    }
}

let docs_confirmed = [];
for f in confirmed {
    if f.lane == "docs" { docs_confirmed.push(f); }
}

phase("Content");
let content_r = agent(content_prompt(json_encode(touched_dirs), json_encode(remaining_notes), json_encode(docs_confirmed)), #{
    label: "content-align",
    capability_mode: "all",
});
if content_r == () || !content_r.success {
    log("content align failed or returned nothing");
}

phase("Prove");
let full_repo = requested == () || type_of(requested) != "array" || requested.len() == 0;
let prove_payload = #{
    touched: touched_dirs,
    full_repo: full_repo,
    remaining: remaining_notes,
    ux_rerun: ux_rerun,
};
let prove = agent(prove_prompt(json_encode(prove_payload)), #{
    label: "prove-gates",
    capability_mode: "all",
    output_schema: prove_schema,
});

let prove_passed = false;
let prove_blockers = [];
let prove_commands = [];
if prove != () && prove.success && prove.output != () && type_of(prove.output) == "map" {
    if prove.output.passed == true { prove_passed = true; }
    if prove.output.blockers != () { prove_blockers = prove.output.blockers; }
    if prove.output.commands != () { prove_commands = prove.output.commands; }
}

if !prove_passed {
    phase("Repair");
    let repair = agent(repair_prompt(json_encode(prove_blockers), json_encode(prove_payload)), #{
        label: "repair-blockers",
        capability_mode: "all",
        output_schema: prove_schema,
    });
    if repair != () && repair.success && repair.output != () && type_of(repair.output) == "map" {
        prove_passed = repair.output.passed == true;
        if repair.output.blockers != () { prove_blockers = repair.output.blockers; }
        if repair.output.commands != () { prove_commands = repair.output.commands; }
    }
}

phase("Report");
let report = "# Enterprise-grade audit\n\n";
report += "Packages audited: " + selected.len().to_string() + "\n";
report += "Docs shards: " + active_shards.len().to_string() + "\n";
report += "P0 reported: " + p0s.len().to_string() + " | verified: " + to_verify.len().to_string() + " | confirmed: " + confirmed.len().to_string() + "\n";
report += "P1 tracked: " + p1s.len().to_string() + "\n";
report += "Dropped out of scope: " + dropped_scope.to_string() + " | dropped by verify cap: " + dropped_cap.to_string() + "\n";
report += "Playwright skipped: " + skip_pw.to_string() + " | ux failures: " + ux_failures.len().to_string() + " | ux confirmed: " + ux_confirmed.len().to_string() + "\n";
if prove_passed {
    report += "Prove: PASSED\n\n";
} else {
    report += "Prove: FAILED\n\n";
}

report += "## Confirmed code/docs issues\n";
if confirmed.len() == 0 {
    report += "(none)\n";
} else {
    for f in confirmed {
        report += "- **" + f.pkg + "** `" + f.file + "` (" + f.lane + "/" + f.severity + "): " + f.issue + "\n";
    }
}

report += "\n## Confirmed UX (real browser)\n";
if ux_confirmed.len() == 0 {
    report += "(none)\n";
} else {
    for f in ux_confirmed {
        report += "- **" + f.id + "** `" + f.title + "` (" + f.kind + "): " + f.excerpt + "\n";
    }
}

report += "\n## Fix results\n";
if fix_outputs.len() == 0 {
    report += "(no fixes this run)\n";
} else {
    for out in fix_outputs {
        let pkg = trimmed(out.pkg);
        let pass = "tests unknown";
        if out.tests_pass == true { pass = "tests pass"; }
        if out.tests_pass == false { pass = "tests fail"; }
        report += "- " + pkg + " — " + pass + " — " + trimmed(out.notes) + "\n";
    }
}

report += "\n## P1 (tracked)\n";
if p1s.len() == 0 {
    report += "(none)\n";
} else {
    let shown = 0;
    for f in p1s {
        if shown >= 24 { break; }
        report += "- " + f.pkg + " `" + f.file + "`: " + f.issue + "\n";
        shown += 1;
    }
}

report += "\n## Playwright commands re-run at prove\n";
if ux_rerun.len() == 0 {
    report += "(none)\n";
} else {
    for c in ux_rerun {
        report += "- " + c + "\n";
    }
}

report += "\n## Prove commands\n";
if prove_commands.len() == 0 {
    report += "(none recorded)\n";
} else {
    for c in prove_commands {
        report += "- " + c + "\n";
    }
}

report += "\n## Remaining blockers\n";
if prove_blockers.len() == 0 {
    report += "(none)\n";
} else {
    for b in prove_blockers {
        report += "- " + b + "\n";
    }
}

let report_path = write_scratch_file("report.md", report);
complete(#{
    path: report_path,
    summary: selected.len().to_string() + " packages, " + confirmed.len().to_string() + " confirmed, ux_confirmed=" + ux_confirmed.len().to_string() + ", prove_passed=" + prove_passed.to_string(),
    pkg_count: selected.len(),
    confirmed: confirmed.len(),
    ux_confirmed: ux_confirmed.len(),
    p1: p1s.len(),
    prove_passed: prove_passed,
    blockers: prove_blockers,
});
