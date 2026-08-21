let meta = #{
    name: "production-ready",
    description: "Audit every workspace package against Domphy production-ready gates, fix confirmed P0 blockers, prove with machine checks",
    when_to_use: "When you need all publishable packages (and the docs app) actually shippable: P0 gaps closed, tests/publint/attw/stable-readiness green — not a docs-only review.",
    phases: [
        #{ title: "Audit", detail: "one read-only auditor per package" },
        #{ title: "Verify", detail: "adversarial P0 skeptics" },
        #{ title: "Fix", detail: "one fixer per package with confirmed P0s" },
        #{ title: "Content", detail: "AGENTS.md / STABLE-READINESS / llms content" },
        #{ title: "Prove", detail: "CI-equivalent machine gates" },
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
            "maxItems": 5,
            "items": #{
                "type": "object",
                "required": ["severity", "file", "issue", "fix"],
                "properties": #{
                    "severity": #{ "type": "string" },
                    "file": #{ "type": "string" },
                    "issue": #{ "type": "string" },
                    "fix": #{ "type": "string" },
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

fn norm_sev(s) {
    if type_of(s) != "string" { return "p1"; }
    if s == "p0" || s == "P0" { return "p0"; }
    "p1"
}

fn trimmed(s) {
    if type_of(s) == "string" {
        s.trim();
        s
    } else {
        ""
    }
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
    if starts_with(path, dir + "/") { return true; }
    if path == dir { return true; }
    if starts_with(path, "packages/") {
        return starts_with(path, dir);
    }
    if starts_with(path, "apps/") {
        return starts_with(path, dir);
    }
    let shared_roots = [
        "AGENTS.md",
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
    ];
    for root in shared_roots {
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

fn audit_prompt(dir, pkg_name, kind) {
    let p = "You are auditing " + dir + " (" + pkg_name + ", kind=" + kind + ") in the Domphy monorepo for production-ready release.";
    p += " Workspace root is the current working directory. Do not answer from memory.";
    p += " Use read_file, list_dir, grep, and run_terminal_command. A valid empty findings list requires that you actually opened package.json, README.md (if present), CHANGELOG.md (if publishable), tests/ (or noted they are missing), tsup/vite config, and the matching STABLE-READINESS.md row.";
    p += " Production-ready in THIS repo means P0 closed + machine gates green. P1/P2 stay tracked, not fixed here.";
    p += " P0 (release blockers): missing/stale CHANGELOG vs package.json version; STABLE-READINESS.md Peer matrix missing this package or Version column mismatch;";
    p += " package.json missing license/files/exports+types/repository.directory/prepublishOnly (publishable only); files array omitting dist/README/CHANGELOG;";
    p += " tests skipped (it.skip/it.fails/test.skip) without an enforced ledger; claimed public API with zero tests; typecheck/build/test currently failing;";
    p += " publint/attw would fail (broken exports, missing types, packed workspace: protocol); private:true on a package that is listed as publishable;";
    p += " docs/README/AGENTS.md claiming an API the source does not implement; TODO/stub/placeholder in shipped src that breaks the advertised contract.";
    p += " P1 (do not mark p0): extra examples, visual polish, optional adapters, deeper docs.";
    p += " For kind=private or kind=app: skip npm-publish fields; P0 is failing tests, broken build scripts, or docs that lie about the package.";
    p += " Hard rules: at most 5 findings; each must cite a file path you opened; severity is p0 or p1;";
    p += " pkg field MUST be exactly \"" + dir + "\"; file paths repo-relative. Do not report issues in other packages.";
    p += " Do not start watchers. If you spawn a process, kill it before returning (Windows: taskkill /F /T /PID).";
    p += " Return {pkg, findings:[{severity,file,issue,fix}]}.";
    p
}

fn verify_prompt(item) {
    let encoded = json_encode(item);
    let p = "Adversarially verify this production-ready finding. Default real=false.";
    p += " Finding JSON: " + encoded;
    p += " Independently read the cited file (and package.json / tests if relevant) with read_file/grep.";
    p += " Set real=true ONLY with concrete evidence in the file you opened that this is a P0 release blocker for this repo (tests fail, publish metadata broken, docs lie, CHANGELOG/version/matrix mismatch, skipped tests without ledger, packed workspace:).";
    p += " Style nits, missing examples, P1 polish, and 'could be nicer' are real=false.";
    p += " If the file does not exist, or the issue is already fixed, real=false.";
    p += " evidence must quote or paraphrase the exact lines you read. Empty evidence means real=false.";
    p += " Return {real, severity, reason, evidence}.";
    p
}

fn fix_prompt(dir, pkg_name, items) {
    let encoded = json_encode(items);
    let p = "Fix confirmed P0 production-ready blockers in " + dir + " (" + pkg_name + ").";
    p += " Confirmed findings JSON: " + encoded;
    p += " Scope: edit ONLY files under " + dir + "/. Do not touch AGENTS.md, STABLE-READINESS.md, llms.txt, or other packages — a later Content agent handles those.";
    p += " Do the real fix, not a skip/stub/it.todo. English comments only. Do not invent APIs. Do not commit or push.";
    p += " After edits, run the package test script if it has one: pnpm --filter " + pkg_name + " test";
    p += " Use PowerShell: chain with ;  — the shell does not support &&.";
    p += " Do not start vitest watch / tsup --watch. Kill any process you spawn before returning (taskkill /F /T /PID).";
    p += " If a finding cannot be fixed without a shared root file, put it in remaining and explain.";
    p += " Return {pkg:\"" + dir + "\", fixed:[...], remaining:[...], tests_pass:bool, notes}.";
    p
}

fn content_prompt(dirs_json, remaining_json) {
    let p = "Align repo-level production-ready content after package-local P0 fixes.";
    p += " Packages touched (JSON): " + dirs_json;
    p += " Remaining package-local notes (JSON): " + remaining_json;
    p += " Read git status/diff with run_terminal_command (git diff -- packages apps/web AGENTS.md STABLE-READINESS.md) and grep for stale versions/APIs.";
    p += " Update ONLY if the code change actually requires it: STABLE-READINESS.md Peer matrix Version column, AGENTS.md, apps/web/public/llms.txt, apps/web/scripts/llms-full.mjs inputs, CHANGELOG headings already in the package — do not bump versions yourself.";
    p += " Do not invent APIs. Do not commit. Kill leftover processes. Return a short notes string of files you changed, or 'no shared content drift'.";
    p
}

fn prove_prompt(touched_json) {
    let p = "Run Domphy production-ready MACHINE gates and report blockers. Do not claim pass without command output.";
    p += " Touched packages JSON (may be empty): " + touched_json;
    p += " Working directory: repo root. PowerShell: use ; not &&. No watchers.";
    p += " Run as many of these as apply, and collect stdout/stderr. Do not stop at the first failure — run the rest.";
    p += " 1) node scripts/stable-readiness-check.mjs";
    p += " 2) If any publishable package was touched, or touched is empty (full-repo run): node scripts/lint-pkg.mjs  (add --filter <substr> when only one package was touched).";
    p += " 3) For each touched package with a test script: pnpm --filter <package.json name> test. If touched is empty, run pnpm -r --workspace-concurrency=3 test.";
    p += " 4) If publishable packages in scope: node scripts/verify-publish.mjs with those dirs, or --all when this is a full-repo run.";
    p += " 5) node --test scripts/scripts.test.mjs if you edited scripts/ or if this is a full-repo run.";
    p += " 6) pnpm check (biome) on the repo; if it fails only on files you did not touch, still list it as a blocker with the file list.";
    p += " Kill every process you started before returning (Windows taskkill /F /T /PID). Do not leave vitest/node/esbuild running.";
    p += " passed=true only when every command you ran exited 0 AND there are zero blockers. blockers are concrete command+reason strings.";
    p += " Return {passed, commands:[\"cmd => exit N\"], blockers:[...]}.";
    p
}

fn repair_prompt(blockers_json, touched_json) {
    let p = "Prove failed. Fix these remaining production-ready blockers, then re-run the failing commands.";
    p += " Blockers JSON: " + blockers_json;
    p += " Previously touched JSON: " + touched_json;
    p += " Read the failing command output by re-running the specific failing command. Fix root cause in source/tests/package.json/STABLE-READINESS.md — not by skipping tests.";
    p += " You MAY edit shared files if the blocker is a matrix/version/changelog mismatch.";
    p += " Do not commit. Kill leftover processes. Return the prove schema again after re-running gates for the failing items.";
    p
}

// Catalog is the work-list. Agents do not discover scope.
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

let requested = ();
if args != () {
    requested = args.packages;
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

log("auditing " + selected.len().to_string() + " packages");

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
let audit_results = parallel(audit_jobs);

let p0s = [];
let p1s = [];
let dropped_scope = 0;
let dropped_cap = 0;
const MAX_VERIFY = 24;

let audit_index = 0;
for r in audit_results {
    let row = selected[audit_index];
    audit_index += 1;
    if r == () || !r.success || r.output == () { continue; }
    if type_of(r.output) != "map" { continue; }
    if r.output.findings == () { continue; }
    for f in r.output.findings {
        if type_of(f) != "map" { continue; }
        let pkg = trimmed(f.pkg);
        if pkg == "" { pkg = row.dir; }
        if !in_catalog(pkg, selected) {
            dropped_scope += 1;
            continue;
        }
        let file = trimmed(f.file);
        if !file_in_scope(file, pkg) {
            dropped_scope += 1;
            continue;
        }
        let item = #{
            pkg: pkg,
            severity: norm_sev(f.severity),
            file: file,
            issue: trimmed(f.issue),
            fix: trimmed(f.fix),
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
if dropped_cap > 0 {
    log("capped verify list, dropped " + dropped_cap.to_string() + " extra p0s");
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
                if ev != "" && norm_sev(v.output.severity) == "p0" {
                    confirmed.push(to_verify[vi]);
                }
            }
        }
        vi += 1;
    }
    log(confirmed.len().to_string() + "/" + to_verify.len().to_string() + " p0s confirmed");
}

let groups = [];
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

let fix_outputs = [];
let remaining_notes = [];
if groups.len() > 0 {
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

if groups.len() > 0 {
    phase("Content");
    let content_r = agent(content_prompt(json_encode(touched_dirs), json_encode(remaining_notes)), #{
        label: "content-align",
        capability_mode: "all",
    });
    if content_r == () || !content_r.success {
        log("content align failed or returned nothing");
    }
}

phase("Prove");
let full_repo = requested == () || type_of(requested) != "array" || requested.len() == 0;
let prove_payload = #{
    touched: touched_dirs,
    full_repo: full_repo,
    remaining: remaining_notes,
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
let report = "# Production-ready audit\n\n";
report += "Packages audited: " + selected.len().to_string() + "\n";
report += "P0 reported: " + p0s.len().to_string() + " | verified: " + to_verify.len().to_string() + " | confirmed: " + confirmed.len().to_string() + "\n";
report += "P1 (not fixed): " + p1s.len().to_string() + "\n";
report += "Dropped out of scope: " + dropped_scope.to_string() + " | dropped by verify cap: " + dropped_cap.to_string() + "\n";
if prove_passed {
    report += "Prove: PASSED\n\n";
} else {
    report += "Prove: FAILED\n\n";
}

report += "## Confirmed P0 (fixed or attempted)\n";
if confirmed.len() == 0 {
    report += "(none)\n";
} else {
    for f in confirmed {
        report += "- **" + f.pkg + "** `" + f.file + "`: " + f.issue + "\n";
    }
}

report += "\n## Fix results\n";
if fix_outputs.len() == 0 {
    report += "(no package-local fixes)\n";
} else {
    for out in fix_outputs {
        let pkg = trimmed(out.pkg);
        let pass = "tests unknown";
        if out.tests_pass == true { pass = "tests pass"; }
        if out.tests_pass == false { pass = "tests fail"; }
        report += "- " + pkg + " — " + pass + " — " + trimmed(out.notes) + "\n";
    }
}

report += "\n## P1 (tracked, not fixed)\n";
if p1s.len() == 0 {
    report += "(none)\n";
} else {
    let shown = 0;
    for f in p1s {
        if shown >= 20 { break; }
        report += "- " + f.pkg + " `" + f.file + "`: " + f.issue + "\n";
        shown += 1;
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
    summary: selected.len().to_string() + " packages, " + confirmed.len().to_string() + " confirmed P0, prove_passed=" + prove_passed.to_string(),
    pkg_count: selected.len(),
    confirmed_p0: confirmed.len(),
    p1: p1s.len(),
    prove_passed: prove_passed,
    blockers: prove_blockers,
});
