#!/usr/bin/env node
/**
 * events-check.mjs — verify analytics events fire from real page interactions.
 *
 * Runs INSIDE the user's website project. Requires Playwright, which is an
 * OPTIONAL dependency: install it in the project with
 *   npm i -D playwright && npx playwright install chromium
 *
 * Safety:
 *   - Blocks every top-level navigation that would leave the page under test
 *     (same-origin or not) so it can keep observing that page after a click.
 *     The click's own network requests/dataLayer pushes are still captured
 *     before the navigation is aborted.
 *   - Never submits a real form unless --allow-submit is passed: a capture-
 *     phase `submit` listener calls preventDefault() by default. With
 *     --allow-submit, the next main-frame navigation after a submit event is
 *     let through regardless of HTTP method (GET or POST) — the submit
 *     listener marks the page as "expecting a submit navigation" and the
 *     route handler consumes that mark once. Without the flag, every
 *     post-initial navigation stays blocked as before.
 *
 * Usage:
 *   node scripts/qa/events-check.mjs --url http://localhost:4321/ --events events.json
 *   node scripts/qa/events-check.mjs --url http://localhost:4321/ --auto-cta
 *
 * events.json shape:
 *   [ { "name": "cta_click", "selector": "#hero-cta", "trigger": "click" },
 *     { "name": "page_view", "trigger": "load" } ]
 *
 * Exit codes: 0 all expected events observed (or --auto-cta with no --events,
 * informational only), 1 one or more expected events not observed, 2 Playwright
 * not installed, 3 unexpected runtime error, 64 usage error (unknown CLI argument).
 */

const HELP = `events-check.mjs — verify analytics events fire from real page interactions

Usage:
  node scripts/qa/events-check.mjs --url <url> (--events <file> | --auto-cta) [options]

Options:
  --url <url>        Page URL to test (default: http://localhost:4321/)
  --events <file>    JSON file: array of { name, selector?, trigger: "load"|"click" }
  --auto-cta         Click every [data-cta] element instead of/in addition to --events
  --allow-submit     Allow real form submissions (default: submits are prevented)
  --timeout <ms>     Observation window per action in ms (default: 2000)
  --out <dir>        Output directory (default: .site-builder/qa/<YYYY-MM-DD>/events)
  --help             Show this help and exit

Safety: blocks navigations away from the tested page (so external links never
really navigate) and prevents real form submission unless --allow-submit.

Exit codes: 0 ok, 1 missing expected events, 2 playwright missing, 3 runtime error,
64 usage error (unknown CLI argument).
`;

function parseArgs(argv) {
  const args = {
    url: "http://localhost:4321/",
    events: null,
    autoCta: false,
    allowSubmit: false,
    timeout: 2000,
    out: null,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--url") args.url = argv[++i];
    else if (a === "--events") args.events = argv[++i];
    else if (a === "--auto-cta") args.autoCta = true;
    else if (a === "--allow-submit") args.allowSubmit = true;
    else if (a === "--timeout") args.timeout = Number(argv[++i]);
    else if (a === "--out") args.out = argv[++i];
    else {
      console.error(`Unknown argument: ${a}`);
      process.exit(64);
    }
  }
  return args;
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function matches(name, requests, dataLayerEntries) {
  const needle = name.toLowerCase();
  for (const r of requests) {
    if (r.url.toLowerCase().includes(needle)) return { matchedIn: "request-url", evidence: r.url };
    if (r.postData && r.postData.toLowerCase().includes(needle))
      return { matchedIn: "request-body", evidence: r.postData.slice(0, 200) };
  }
  for (const d of dataLayerEntries) {
    const str = JSON.stringify(d).toLowerCase();
    if (str.includes(needle)) return { matchedIn: "dataLayer", evidence: JSON.stringify(d).slice(0, 200) };
  }
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    process.exit(0);
  }

  if (!args.events && !args.autoCta) {
    console.error("Pass --events <file>, --auto-cta, or both. See --help.");
    process.exit(3);
  }

  const fs = await import("node:fs/promises");
  const path = await import("node:path");

  let expectedEvents = [];
  if (args.events) {
    try {
      const raw = await fs.readFile(args.events, "utf8");
      expectedEvents = JSON.parse(raw);
      if (!Array.isArray(expectedEvents)) throw new Error("events.json must be a JSON array");
    } catch (err) {
      console.error(`Could not read --events file: ${err.message}`);
      process.exit(3);
    }
  }

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error(
      "Playwright is not installed in this project.\n" +
        "Install it with:\n" +
        "  npm i -D playwright && npx playwright install chromium\n" +
        "Then re-run this script.",
    );
    process.exit(2);
  }

  const outDir = args.out || `.site-builder/qa/${dateStamp()}/events`;
  await fs.mkdir(outDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const allRequests = [];
  const allDataLayer = [];
  let submitsAttempted = 0;
  let navigatedOnce = false;
  // Set by the page's submit listener (via __eventsCheckSubmit) when
  // --allow-submit is on; consumed by the very next main-frame navigation so
  // that exactly one post-submit navigation is let through, regardless of
  // whether the form's method is GET or POST.
  let pendingSubmitNav = false;

  page.on("request", (req) => {
    let postData = null;
    try {
      postData = req.postData();
    } catch {
      postData = null;
    }
    allRequests.push({
      t: Date.now(),
      url: req.url(),
      method: req.method(),
      postData: postData ? postData.slice(0, 500) : null,
    });
  });

  await context.exposeFunction("__eventsCheckDataLayer", (json) => {
    try {
      allDataLayer.push({ t: Date.now(), value: JSON.parse(json) });
    } catch {
      allDataLayer.push({ t: Date.now(), value: json });
    }
  });
  await context.exposeFunction("__eventsCheckSubmit", () => {
    submitsAttempted += 1;
    if (args.allowSubmit) pendingSubmitNav = true;
  });

  const allowSubmitFlag = args.allowSubmit ? "true" : "false";
  await context.addInitScript(`
    (function () {
      window.dataLayer = window.dataLayer || [];
      const origPush = window.dataLayer.push.bind(window.dataLayer);
      window.dataLayer.push = function (...items) {
        try { window.__eventsCheckDataLayer(JSON.stringify(items)); } catch (e) {}
        return origPush(...items);
      };
      document.addEventListener(
        "submit",
        function (e) {
          try { window.__eventsCheckSubmit(); } catch (err) {}
          if (!${allowSubmitFlag}) e.preventDefault();
        },
        true,
      );
    })();
  `);

  await page.route("**/*", (route) => {
    const req = route.request();
    if (req.isNavigationRequest() && req.frame() === page.mainFrame() && navigatedOnce) {
      if (args.allowSubmit && pendingSubmitNav) {
        pendingSubmitNav = false;
        route.continue();
        return;
      }
      route.abort("aborted");
      return;
    }
    route.continue();
  });

  const phases = [];
  let ok = true;

  try {
    await page.goto(args.url, { waitUntil: "networkidle", timeout: 15000 });
    navigatedOnce = true;
    await sleep(300);
    phases.push({
      label: "load",
      requests: [...allRequests],
      dataLayer: allDataLayer.map((d) => d.value),
    });

    const clickTargets = [];
    if (args.autoCta) {
      const ctaCount = await page.locator("[data-cta]").count();
      for (let i = 0; i < ctaCount; i++) clickTargets.push({ label: `auto-cta[${i}]`, index: i });
    }
    const clickEvents = expectedEvents.filter((e) => e.trigger === "click" && e.selector);
    for (const ev of clickEvents) clickTargets.push({ label: ev.selector, selector: ev.selector, forEvent: ev.name });

    for (const target of clickTargets) {
      const beforeCount = allRequests.length;
      const beforeDL = allDataLayer.length;
      try {
        const locator = target.selector
          ? page.locator(target.selector).first()
          : page.locator("[data-cta]").nth(target.index);
        await locator.click({ timeout: 3000 });
      } catch (err) {
        phases.push({ label: target.label, error: String(err.message || err), requests: [], dataLayer: [] });
        continue;
      }
      await sleep(args.timeout);
      phases.push({
        label: target.label,
        requests: allRequests.slice(beforeCount),
        dataLayer: allDataLayer.slice(beforeDL).map((d) => d.value),
      });
    }
  } catch (err) {
    console.error(`Runtime error during page interaction: ${err.message}`);
    ok = false;
  } finally {
    await browser.close();
  }

  const results = [];
  if (expectedEvents.length) {
    for (const ev of expectedEvents) {
      let phase;
      if (ev.trigger === "load") phase = phases.find((p) => p.label === "load");
      else phase = phases.find((p) => p.label === ev.selector);
      const searchPhases = phase ? [phase] : phases;
      let match = null;
      for (const p of searchPhases) {
        match = matches(ev.name, p.requests || [], p.dataLayer || []);
        if (match) break;
      }
      results.push({
        name: ev.name,
        trigger: ev.trigger,
        selector: ev.selector || null,
        matched: !!match,
        matchedIn: match ? match.matchedIn : null,
        evidence: match ? match.evidence : null,
      });
      if (!match) ok = false;
    }
  }

  const unmatched = results.filter((r) => !r.matched);

  const report = {
    generatedAt: new Date().toISOString(),
    url: args.url,
    mode: args.events ? (args.autoCta ? "events+auto-cta" : "events") : "auto-cta-only",
    allowSubmit: args.allowSubmit,
    submitsAttempted,
    totalRequestsObserved: allRequests.length,
    totalDataLayerPushes: allDataLayer.length,
    phases: phases.map((p) => ({
      label: p.label,
      requestCount: (p.requests || []).length,
      dataLayerCount: (p.dataLayer || []).length,
      error: p.error || null,
    })),
    expectedEvents: results,
    unmatchedCount: unmatched.length,
    ok: expectedEvents.length ? unmatched.length === 0 : ok,
  };

  const fsPath = await import("node:path");
  const reportPath = fsPath.join(outDir, "events-report.json");
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

  console.log(`Events check for ${args.url} (mode: ${report.mode})`);
  console.log(`Observed ${allRequests.length} requests, ${allDataLayer.length} dataLayer pushes across ${phases.length} phase(s).`);
  if (submitsAttempted > 0) {
    console.log(`Form submit attempts intercepted: ${submitsAttempted} (allow-submit: ${args.allowSubmit})`);
  }
  if (expectedEvents.length) {
    for (const r of results) {
      console.log(`  ${r.matched ? "OK  " : "MISS"} ${r.name} (${r.trigger}${r.selector ? `, ${r.selector}` : ""})${r.matched ? ` via ${r.matchedIn}` : ""}`);
    }
  } else {
    console.log("No --events file given: reporting raw observations only (informational, always exits 0).");
  }
  console.log(`Report written to ${reportPath}`);

  process.exit(report.ok ? 0 : 1);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(3);
});
