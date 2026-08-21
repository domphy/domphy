let meta = #{
    name: "clear-debt",
    description: "Inventory every machine-enforced fail and leftover skip/debt, verify, fix, prove pnpm check green, then commit and push main",
    when_to_use: "When CI biome/check is red, skipped tests linger, or any machine-enforced debt must be closed in-session — not a docs-only review.",
    phases: [
        #{ title: "Inventory", detail: "biome + CI + skip/ledger grep" },
        #{ title: "Verify", detail: "adversarial skeptics per item" },
        #{ title: "Fix", detail: "one fixer per confirmed file" },
        #{ title: "Prove", detail: "pnpm check must exit 0" },
        #{ title: "Repair", detail: "one more pass if prove failed" },
        #{ title: "Ship", detail: "commit + push main when green" },
        #{ title: "Report" },
    ],
};

let inventory_schema = #{
    "type": "object",
    "required": ["items", "notes"],
    "properties": #{
        "items": #{
            "type": "array",
            "maxItems": 16,
            "items": #{
                "type": "object",
                "required": ["kind", "file", "issue", "fix"],
                "properties": #{
                    "kind": #{ "type": "string" },
                    "file": #{ "type": "string" },
                    "issue": #{ "type": "string" },
                    "fix": #{ "type": "string" },
                },
            },
        },
        "notes": #{ "type": "string" },
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

let fix_schema = #{
    "type": "object",
    "required": ["file", "fixed", "remaining", "notes"],
    "properties": #{
        "file": #{ "type": "string" },
        "fixed": #{ "type": "array", "items": #{ "type": "string" } },
        "remaining": #{ "type": "array", "items": #{ "type": "string" } },
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

let ship_schema = #{
    "type": "object",
    "required": ["committed", "pushed", "sha", "notes"],
    "properties": #{
        "committed": #{ "type": "boolean" },
        "pushed": #{ "type": "boolean" },
        "sha": #{ "type": "string" },
        "notes": #{ "type": "string" },
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

fn path_in_scope(file) {
    let path = trimmed(file);
    if path == "" { return false; }
    let roots = [
        "packages/",
        "apps/",
        "bench/",
        "bench-krausest/",
        "scripts/",
        "smoke/",
        ".github/",
        "AGENTS.md",
        "STABLE-READINESS.md",
        "package.json",
        "biome.json",
        "biome.jsonc",
    ];
    for root in roots {
        if path == root { return true; }
        if starts_with(path, root) { return true; }
    }
    false
}

fn inventory_prompt() {
    let p = "Inventory EVERY machine-enforced fail and leftover test/debt in the Domphy repo at the current working directory.";
    p += " Do not answer from memory. Use run_terminal_command, grep, and read_file.";
    p += " PowerShell: chain commands with ;  — the shell does not support &&.";
    p += " Required commands (run them, capture output):";
    p += " 1) pnpm check   (biome). Record every error, warning, and info with file:line.";
    p += " 2) gh run list --branch main --limit 1 then gh run view <id> --log-failed if red. Quote the failing step.";
    p += " 3) grep it.skip / test.skip / it.fails / describe.skip across **/*.{ts,tsx,mjs,js}.";
    p += " 4) grep KNOWN_DEBT / knownDivergence / TODO(phase in **/*.{ts,md}.";
    p += " Classify kind as one of: biome-format, biome-lint, biome-info, ci-fail, skip-dead, ledger.";
    p += " skip-dead = empty it.skip whose comment says the feature is gone — fix is DELETE the skip, not implement.";
    p += " biome-format = Formatter would have printed. Fix is biome check --write on that file.";
    p += " biome-lint / biome-info = a rule with a suggested fix. Apply the lossless fix; do not change math constants unless biome's fix is the stdlib constant (Math.SQRT2).";
    p += " At most 16 items. Each file path must be repo-relative and actually appear in the command output you ran.";
    p += " A valid empty items list requires that pnpm check exited 0 AND grep found no skip/ledger AND latest CI is green — quote those three results in notes.";
    p += " Do not start watchers. Kill leftover node/vite/playwright (Windows: taskkill /F /T /PID).";
    p += " Return {items:[{kind,file,issue,fix}], notes}.";
    p
}

fn verify_prompt(item) {
    let encoded = json_encode(item);
    let p = "Adversarially verify this debt item. Default real=false.";
    p += " Item JSON: " + encoded;
    p += " Independently open the cited file with read_file (and re-run pnpm exec biome check <file> if kind starts with biome).";
    p += " Set real=true ONLY with evidence in that file matching the issue. If already fixed, file missing, or issue is taste not a machine fail, real=false.";
    p += " evidence must quote the lines you read. Empty evidence means real=false.";
    p += " Return {real, reason, evidence}.";
    p
}

fn fix_prompt(item) {
    let encoded = json_encode(item);
    let p = "Fix this confirmed machine-enforced debt. Do the real fix, not a skip/stub.";
    p += " Item JSON: " + encoded;
    p += " Scope: edit ONLY the cited file unless biome --write on that file is enough.";
    p += " biome-format: pnpm exec biome check --write <file>";
    p += " biome-lint / biome-info: apply biome's suggested lossless fix (indexOf, remove unused private, Math.SQRT2, template literals).";
    p += " skip-dead: delete the empty it.skip/test.skip block and its obsolete comment. Do not add a new test unless the comment is wrong and the feature still exists — then grep callers first.";
    p += " English comments only. Do not commit or push. Do not bump versions.";
    p += " PowerShell: no &&. Do not start watchers. Kill leftover processes (taskkill /F /T /PID) before returning.";
    p += " Return {file, fixed:[...], remaining:[...], notes}.";
    p
}

fn prove_prompt() {
    let p = "Prove the repo's machine gates that currently fail CI. Do not answer from memory.";
    p += " Run: pnpm check";
    p += " PowerShell: no &&. Capture exit code and the full biome summary (errors/warnings/infos).";
    p += " passed=true ONLY if pnpm check exits 0.";
    p += " If it fails, blockers must list every remaining file:rule from the output (not a paraphrase).";
    p += " Do not start watchers. Kill leftover processes.";
    p += " Return {passed, commands, blockers}.";
    p
}

fn repair_prompt(blockers_json) {
    let p = "pnpm check is still failing. Fix every remaining blocker in this list, then re-run pnpm check.";
    p += " Blockers JSON: " + blockers_json;
    p += " Use biome check --write on format files. Apply lossless lint fixes. Do not skip tests to go green.";
    p += " PowerShell: no &&. Kill leftover processes. Do not commit.";
    p += " Return {passed, commands, blockers} after the re-run.";
    p
}

fn ship_prompt(summary) {
    let p = "Ship the debt-clearing fixes to main if the working tree has related changes AND pnpm check is green.";
    p += " Context: " + summary;
    p += " Run: git status --short ; git diff --stat ; pnpm check";
    p += " If pnpm check is not exit 0, do not commit. Return committed=false pushed=false.";
    p += " If the tree is clean, committed=false pushed=false sha=HEAD notes=clean.";
    p += " If dirty: git add only the files you changed for this debt (biome/skip). Do not git add -A.";
    p += " Commit on main with conventional message: chore: clear biome CI debt and dead skips";
    p += " Then git pull --rebase origin main ; git push origin main. No --force. No --no-verify.";
    p += " Return {committed, pushed, sha, notes} with the actual SHA from git rev-parse HEAD.";
    p += " Kill leftover processes. PowerShell: no &&.";
    p
}

const MAX_VERIFY = 12;
const MAX_FIX = 8;

phase("Inventory");
let inv = agent(inventory_prompt(), #{
    label: "inventory",
    capability_mode: "all",
    output_schema: inventory_schema,
});

let raw_items = [];
let inv_notes = "";
if inv != () && inv.success && inv.output != () {
    if inv.output.notes != () { inv_notes = trimmed(inv.output.notes); }
    if inv.output.items != () {
        for it in inv.output.items {
            if it == () { continue; }
            let f = trimmed(it.file);
            if !path_in_scope(f) {
                log("drop out-of-scope inventory path: " + f);
                continue;
            }
            raw_items.push(it);
        }
    }
}

log("inventory kept " + raw_items.len().to_string() + " in-scope items");

if raw_items.len() == 0 {
    phase("Prove");
    let empty_prove = agent(prove_prompt(), #{
        label: "prove-empty",
        capability_mode: "all",
        output_schema: prove_schema,
    });
    let empty_ok = empty_prove != () && empty_prove.success && empty_prove.output.passed == true;
    let report = "No in-scope inventory items. pnpm check passed=" + empty_ok.to_string() + ". " + inv_notes;
    let path = write_scratch_file("report.md", report);
    complete(#{ summary: report, path: path, remaining: 0 });
}

phase("Verify");
let to_verify = [];
let vi = 0;
for it in raw_items {
    if vi >= MAX_VERIFY {
        log("verify cap dropped item " + trimmed(it.file));
        break;
    }
    to_verify.push(it);
    vi += 1;
}

let vjobs = [];
for it in to_verify {
    vjobs.push(#{
        prompt: verify_prompt(it),
        label: "verify:" + trimmed(it.file),
        capability_mode: "read-only",
        output_schema: verdict_schema,
    });
}
let verdicts = parallel(vjobs);

let confirmed = [];
let vidx = 0;
for v in verdicts {
    if v != () && v.success && v.output != () && v.output.real == true
        && v.output.evidence != () && trimmed(v.output.evidence) != "" {
        confirmed.push(to_verify[vidx]);
    }
    vidx += 1;
}
log(confirmed.len().to_string() + "/" + to_verify.len().to_string() + " items confirmed");

if confirmed.len() == 0 {
    phase("Prove");
    let none_prove = agent(prove_prompt(), #{
        label: "prove-none-confirmed",
        capability_mode: "all",
        output_schema: prove_schema,
    });
    let none_ok = none_prove != () && none_prove.success && none_prove.output.passed == true;
    let report = "Inventory had items but none survived verification. pnpm check passed=" + none_ok.to_string();
    let path = write_scratch_file("report.md", report);
    complete(#{ summary: report, path: path, remaining: 0 });
}

phase("Fix");
let to_fix = [];
let fi = 0;
for it in confirmed {
    if fi >= MAX_FIX {
        log("fix cap dropped " + trimmed(it.file));
        break;
    }
    to_fix.push(it);
    fi += 1;
}

let fjobs = [];
for it in to_fix {
    fjobs.push(#{
        prompt: fix_prompt(it),
        label: "fix:" + trimmed(it.file),
        capability_mode: "all",
        output_schema: fix_schema,
    });
}
let fixes = parallel(fjobs);

let leftover = [];
for fx in fixes {
    if fx == () || !fx.success || fx.output == () {
        leftover.push("fixer failed");
        continue;
    }
    if fx.output.remaining != () {
        for rem in fx.output.remaining {
            leftover.push(trimmed(rem));
        }
    }
}

phase("Prove");
let prove = agent(prove_prompt(), #{
    label: "prove",
    capability_mode: "all",
    output_schema: prove_schema,
});
let prove_ok = prove != () && prove.success && prove.output != () && prove.output.passed == true;
let blockers = [];
if prove != () && prove.success && prove.output != () && prove.output.blockers != () {
    blockers = prove.output.blockers;
}

if !prove_ok {
    phase("Repair");
    let repair = agent(repair_prompt(json_encode(blockers)), #{
        label: "repair",
        capability_mode: "all",
        output_schema: prove_schema,
    });
    prove_ok = repair != () && repair.success && repair.output != () && repair.output.passed == true;
    if repair != () && repair.success && repair.output != () && repair.output.blockers != () {
        blockers = repair.output.blockers;
    }
}

phase("Ship");
let ship_ok = false;
let ship_sha = "";
if prove_ok {
    let ship = agent(ship_prompt("prove passed; leftover=" + json_encode(leftover)), #{
        label: "ship",
        capability_mode: "all",
        output_schema: ship_schema,
    });
    if ship != () && ship.success && ship.output != () {
        ship_ok = ship.output.pushed == true;
        if ship.output.sha != () { ship_sha = trimmed(ship.output.sha); }
    }
}

phase("Report");
let summary = "confirmed=" + confirmed.len().to_string();
summary += " leftover=" + leftover.len().to_string();
summary += " prove_ok=" + prove_ok.to_string();
summary += " pushed=" + ship_ok.to_string();
summary += " sha=" + ship_sha;
if !prove_ok {
    summary += " blockers=" + json_encode(blockers);
}
let path = write_scratch_file("report.md", summary);
complete(#{
    summary: summary,
    path: path,
    remaining: leftover.len(),
    prove_ok: prove_ok,
    pushed: ship_ok,
});
