let meta = #{
    name: "blocks-e2e",
    description: "Run Playwright e2e against every @domphy/blocks factory, triage failures, report",
    when_to_use: "When you need real-Chromium coverage of the full blocks catalog (not the 3-block smoke, not jsdom vitest).",
    phases: [
        #{ title: "Spec", detail: "confirm all-blocks Playwright spec covers the export catalog" },
        #{ title: "Run", detail: "one Chromium worker, full mount sweep" },
        #{ title: "Triage", detail: "adversarial verify each failure" },
        #{ title: "Fix", detail: "fix confirmed mount errors" },
        #{ title: "Prove", detail: "re-run Playwright" },
        #{ title: "Report" },
    ],
};

let catalog_schema = #{
    "type": "object",
    "required": ["names", "spec_ok", "notes"],
    "properties": #{
        "names": #{ "type": "array", "items": #{ "type": "string" } },
        "spec_ok": #{ "type": "boolean" },
        "notes": #{ "type": "string" },
    },
};

let run_schema = #{
    "type": "object",
    "required": ["passed", "failed_names", "log_excerpt"],
    "properties": #{
        "passed": #{ "type": "boolean" },
        "failed_names": #{ "type": "array", "items": #{ "type": "string" } },
        "log_excerpt": #{ "type": "string" },
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

fn trimmed(s) {
    if type_of(s) == "string" {
        s.trim();
        s
    } else {
        ""
    }
}

fn spec_prompt() {
    let p = "You are in the Domphy repo. Confirm Playwright covers EVERY @domphy/blocks factory.";
    p += " Use read_file/grep. Do not answer from memory.";
    p += " 1) Read packages/blocks/src/index.ts and collect every export name (Login01 and login01 are aliases — count unique lowercase).";
    p += " 2) Read packages/blocks/e2e/all-blocks.spec.ts, e2e/helpers.ts, playwright.config.ts.";
    p += " 3) spec_ok=true only if all-blocks.spec.ts mounts the demo [data-block] catalog (or an explicit list that matches the unique exports) and reloads periodically so WebGL does not exhaust.";
    p += " 4) If the spec is missing coverage, EDIT packages/blocks/e2e/all-blocks.spec.ts so it does. Keep workers=1. Do not add this to vitest (`test` script). vitest.config.ts must exclude e2e/.";
    p += " 5) names = unique factory names you read from index.ts. Empty names is invalid unless you actually opened the file and it had no exports.";
    p += " Kill leftover vite/playwright (Windows taskkill /F /T /PID). PowerShell: use ; not &&.";
    p += " Return {names, spec_ok, notes}.";
    p
}

fn run_prompt(only_json) {
    let p = "Run the @domphy/blocks Playwright e2e channel. One Chromium worker. Do not start vitest.";
    p += " Working directory: repo root. Filter JSON (empty array = full catalog): " + only_json;
    p += " Command: pnpm --filter @domphy/blocks test:e2e";
    p += " If the filter array is non-empty, add -- --grep <first-name> only when a single name is requested; otherwise run the full all-blocks spec.";
    p += " Capture stdout/stderr. passed=true only if the process exits 0 AND there are zero failed tests.";
    p += " failed_names: block factory names that failed to mount or whose interaction spec failed. Parse from Playwright output (e.g. mounts X without a card error / factories failed JSON).";
    p += " After the run, kill leftover node/vite/chromium on port 5611 (taskkill /F /T /PID). Do not leave watchers.";
    p += " Return {passed, failed_names, log_excerpt} with a short excerpt of the summary line and any failure body.";
    p
}

fn triage_prompt(name, excerpt) {
    let p = "Adversarially verify this Playwright blocks failure. Default real=false.";
    p += " Factory: " + name;
    p += " Log excerpt: " + excerpt;
    p += " Independently read packages/blocks source for this factory (grep exportName / src path) and the e2e helper.";
    p += " real=true only if the shipped factory or demo mount path actually throws/renders .error, not a flake (timeout, vite reload, port in use).";
    p += " evidence must quote the file you opened. Empty evidence means real=false.";
    p += " Return {real, reason, evidence}.";
    p
}

fn fix_prompt(items_json) {
    let p = "Fix confirmed Playwright mount/interaction failures in @domphy/blocks.";
    p += " Confirmed JSON: " + items_json;
    p += " Edit only packages/blocks/** (factory src or e2e helpers if the test is wrong). Do not skip tests. English comments only.";
    p += " After edits, do NOT start the full e2e yourself — a later Prove agent re-runs it.";
    p += " Kill leftover processes. Do not commit.";
    p += " Return a short notes string of files changed.";
    p
}

let only = ();
if args != () {
    only = args.only;
}
if only == () { only = []; }

phase("Spec");
let spec_r = agent(spec_prompt(), #{
    label: "confirm-spec",
    capability_mode: "all",
    output_schema: catalog_schema,
});
let catalog_names = [];
if spec_r != () && spec_r.success && spec_r.output != () && type_of(spec_r.output) == "map" {
    if spec_r.output.names != () { catalog_names = spec_r.output.names; }
}
log("catalog unique factories=" + catalog_names.len().to_string());

phase("Run");
let run_r = agent(run_prompt(json_encode(only)), #{
    label: "playwright-run",
    capability_mode: "all",
    output_schema: run_schema,
});

let run_passed = false;
let failed_names = [];
let log_excerpt = "";
if run_r != () && run_r.success && run_r.output != () && type_of(run_r.output) == "map" {
    if run_r.output.passed == true { run_passed = true; }
    if run_r.output.failed_names != () { failed_names = run_r.output.failed_names; }
    if run_r.output.log_excerpt != () { log_excerpt = trimmed(run_r.output.log_excerpt); }
}

const MAX_TRIAGE = 12;
let to_triage = [];
for n in failed_names {
    if to_triage.len() >= MAX_TRIAGE {
        log("dropped extra failure " + n);
        continue;
    }
    to_triage.push(n);
}

let confirmed = [];
if to_triage.len() > 0 {
    phase("Triage");
    let tjobs = [];
    for n in to_triage {
        tjobs.push(#{
            prompt: triage_prompt(n, log_excerpt),
            label: "triage:" + n,
            capability_mode: "read-only",
            output_schema: verdict_schema,
        });
    }
    let verdicts = parallel(tjobs);
    let ti = 0;
    for v in verdicts {
        if v != () && v.success && v.output != () && type_of(v.output) == "map" {
            if v.output.real == true && v.output.evidence != () {
                let ev = trimmed(v.output.evidence);
                if ev != "" { confirmed.push(to_triage[ti]); }
            }
        }
        ti += 1;
    }
    log(confirmed.len().to_string() + "/" + to_triage.len().to_string() + " failures confirmed");
}

if confirmed.len() > 0 {
    phase("Fix");
    let fix_r = agent(fix_prompt(json_encode(confirmed)), #{
        label: "fix-blocks",
        capability_mode: "all",
    });
    if fix_r == () || !fix_r.success {
        log("fix agent failed");
    }
    phase("Prove");
    let prove_r = agent(run_prompt(json_encode(only)), #{
        label: "playwright-prove",
        capability_mode: "all",
        output_schema: run_schema,
    });
    if prove_r != () && prove_r.success && prove_r.output != () && type_of(prove_r.output) == "map" {
        run_passed = prove_r.output.passed == true;
        if prove_r.output.failed_names != () { failed_names = prove_r.output.failed_names; }
        if prove_r.output.log_excerpt != () { log_excerpt = trimmed(prove_r.output.log_excerpt); }
    }
}

phase("Report");
let report = "# Blocks Playwright e2e\n\n";
report += "Catalog unique factories (from Spec): " + catalog_names.len().to_string() + "\n";
if run_passed {
    report += "Playwright: PASSED\n\n";
} else {
    report += "Playwright: FAILED\n\n";
}
report += "## Failed names\n";
if failed_names.len() == 0 {
    report += "(none)\n";
} else {
    for n in failed_names {
        report += "- " + n + "\n";
    }
}
report += "\n## Confirmed (after triage)\n";
if confirmed.len() == 0 {
    report += "(none)\n";
} else {
    for n in confirmed {
        report += "- " + n + "\n";
    }
}
report += "\n## Log excerpt\n\n";
report += log_excerpt;
report += "\n";

let report_path = write_scratch_file("report.md", report);
complete(#{
    path: report_path,
    summary: "factories=" + catalog_names.len().to_string() + " passed=" + run_passed.to_string() + " failed=" + failed_names.len().to_string(),
    factory_count: catalog_names.len(),
    passed: run_passed,
    failed_names: failed_names,
    confirmed: confirmed,
});
