#!/usr/bin/env node
/**
 * screenshots.mjs — viewport screenshot matrix + horizontal-overflow check.
 *
 * Runs INSIDE the user's website project (not the skill). Requires Playwright,
 * which is an OPTIONAL dependency: install it in the project with
 *   npm i -D playwright && npx playwright install chromium
 * If Playwright is not installed, this script prints that hint and exits
 * with a non-zero, distinguishable status instead of crashing.
 *
 * Usage:
 *   node scripts/qa/screenshots.mjs [--url http://localhost:4321] [--paths /,/pricing]
 *                                    [--out .site-builder/qa/<date>/screenshots]
 *                                    [--reduced-motion] [--timeout 15000] [--help]
 *
 * Exit codes:
 *   0  all viewports captured, no horizontal overflow detected
 *   1  captured, but horizontal overflow (or a page load failure) was found
 *   2  Playwright is not installed
 *   3  unexpected runtime error
 *   64 usage error (unknown CLI argument)
 */

import { joinUrl } from "./lib/url.mjs";
import { MATRIX_VALUES, selectViewports } from "./lib/viewports.mjs";

const HELP = `screenshots.mjs — viewport screenshot matrix + horizontal-overflow check

Usage:
  node scripts/qa/screenshots.mjs [options]

Options:
  --url <base>          Base URL to test (default: http://localhost:4321)
  --paths <list>        Comma-separated paths to test (default: /)
  --out <dir>           Output directory (default: .site-builder/qa/<YYYY-MM-DD>/screenshots)
  --matrix <which>       width | height | all (default: all) — which viewport matrix to run
  --reduced-motion      Also capture a prefers-reduced-motion pass for every viewport/path;
                        this pass scrolls to the bottom and back to trigger scroll reveals,
                        then reports content that stays invisible (see "Hidden-content report"
                        below).
  --timeout <ms>        Navigation timeout per page in ms (default: 15000)
  --help                Show this help and exit

Viewport matrix (from references/responsive-motion.md):
  width (--matrix width):
    375, 390, 430           mobile widths
    768                     tablet
    1024, 1100              tablet-to-desktop transition
    1280x720, 1366x768      low desktop windows
    1440x900, 1536x864      common desktop windows
    1920x1080               large desktop
    1440x1600               tall fullscreen window
  height (--matrix height): same width at different heights, plus landscape phone
    1440x720, 1440x900, 1440x1100   fullscreen vs. windowed at one width
    390x664, 390x844                short vs. tall phone viewport
    844x390                         landscape phone (width x height)
  --matrix all (default) runs the union with no viewport captured twice.

Output:
  <out>/summary.json                 machine-readable pass/fail per viewport+path
  <out>/<path-slug>/<viewport>-first.png
  <out>/<path-slug>/<viewport>-full.png
  <out>/<path-slug>/<viewport>-first-reduced.png   (with --reduced-motion)
  <out>/<path-slug>/<viewport>-full-reduced.png    (with --reduced-motion)

Hidden-content report (with --reduced-motion):
  After scrolling through the page with prefers-reduced-motion emulation
  active, each viewport is scanned for elements that carry text or are
  img/video/svg and remain invisible (opacity < 0.05, visibility: hidden, or
  a transform that translates them fully outside their box). Elements hidden
  by design are excluded: [aria-hidden="true"], [hidden], display: none,
  inside <template>, inside an [aria-expanded="false"] off-canvas container,
  or carrying data-qa-allow-hidden. Findings are written per viewport in
  summary.json as a count plus up to 10 CSS-path samples, and any non-zero
  count fails the run — mark an intentionally-hidden element with
  data-qa-allow-hidden to exclude it.

Exit codes: 0 ok, 1 overflow/load failure/hidden-content found, 2 playwright
missing, 3 runtime error, 64 usage error (unknown CLI argument).
`;

function parseArgs(argv) {
  const args = {
    url: "http://localhost:4321",
    paths: ["/"],
    out: null,
    matrix: "all",
    reducedMotion: false,
    timeout: 15000,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--url") args.url = argv[++i];
    else if (a === "--paths") args.paths = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--matrix") args.matrix = argv[++i];
    else if (a === "--reduced-motion") args.reducedMotion = true;
    else if (a === "--timeout") args.timeout = Number(argv[++i]);
    else {
      console.error(`Unknown argument: ${a}`);
      process.exit(64);
    }
  }
  if (!MATRIX_VALUES.includes(args.matrix)) {
    console.error(`Invalid --matrix value: ${args.matrix} (expected one of ${MATRIX_VALUES.join(", ")})`);
    process.exit(64);
  }
  return args;
}

/**
 * Detect content that stays invisible under prefers-reduced-motion after a
 * scroll pass, excluding elements hidden by design. Runs entirely inside the
 * page (browser context) via page.evaluate — see HELP's "Hidden-content
 * report" section for the rules this implements.
 */
function detectHiddenContent() {
  function isExcluded(el) {
    if (el.closest('[aria-hidden="true"]')) return true;
    if (el.closest("[hidden]")) return true;
    if (el.closest("template")) return true;
    if (el.closest("[data-qa-allow-hidden]")) return true;
    if (el.closest('[aria-expanded="false"]')) return true;
    let node = el;
    while (node) {
      if (getComputedStyle(node).display === "none") return true;
      node = node.parentElement;
    }
    return false;
  }

  function hasMeaningfulContent(el) {
    const tag = el.tagName.toLowerCase();
    if (tag === "img" || tag === "video" || tag === "svg") return true;
    for (const child of el.childNodes) {
      if (child.nodeType === 3 && child.textContent.trim().length > 0) return true;
    }
    return false;
  }

  function cssPath(el) {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.body && parts.length < 8) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        parts.unshift(`${part}#${node.id}`);
        break;
      }
      if (node.classList && node.classList.length) {
        part += `.${Array.from(node.classList).slice(0, 2).join(".")}`;
      }
      const parent = node.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter((c) => c.tagName === node.tagName);
        if (siblings.length > 1) {
          part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
        }
      }
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(" > ");
  }

  const scrollWidth = document.documentElement.scrollWidth;
  const scrollHeight = document.documentElement.scrollHeight;
  const hits = [];
  for (const el of document.querySelectorAll("body *")) {
    if (!hasMeaningfulContent(el)) continue;
    if (isExcluded(el)) continue;
    const style = getComputedStyle(el);
    const opacity = parseFloat(style.opacity);
    const hiddenByOpacity = !Number.isNaN(opacity) && opacity < 0.05;
    const hiddenByVisibility = style.visibility === "hidden";
    const rect = el.getBoundingClientRect();
    const fullyOutside =
      rect.width > 0 &&
      rect.height > 0 &&
      (rect.right <= 0 || rect.left >= scrollWidth || rect.bottom <= 0 || rect.top >= scrollHeight);
    if (hiddenByOpacity || hiddenByVisibility || fullyOutside) {
      hits.push(cssPath(el));
    }
  }
  return hits;
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function slugPath(p) {
  if (p === "/" || p === "") return "home";
  return p.replace(/^\//, "").replace(/\/$/, "").replace(/[^a-zA-Z0-9-]+/g, "-") || "home";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    process.exit(0);
  }
  const outDir = args.out || `.site-builder/qa/${dateStamp()}/screenshots`;

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

  const fs = await import("node:fs/promises");
  const path = await import("node:path");

  await fs.mkdir(outDir, { recursive: true });

  const viewports = selectViewports(args.matrix);
  const browser = await chromium.launch();
  const results = [];
  let hadFailure = false;
  let hadHiddenContent = false;

  try {
    for (const p of args.paths) {
      const slug = slugPath(p);
      const pageDir = path.join(outDir, slug);
      await fs.mkdir(pageDir, { recursive: true });
      const targetUrl = joinUrl(args.url, p);

      for (const vp of viewports) {
        const passes = [{ reduced: false }];
        if (args.reducedMotion) passes.push({ reduced: true });

        for (const pass of passes) {
          const context = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            reducedMotion: pass.reduced ? "reduce" : "no-preference",
          });
          const page = await context.newPage();
          const suffix = pass.reduced ? "-reduced" : "";
          const entry = {
            path: p,
            viewport: vp.name,
            width: vp.width,
            height: vp.height,
            reducedMotion: pass.reduced,
            ok: true,
            overflow: false,
          };
          try {
            await page.goto(targetUrl, { waitUntil: "networkidle", timeout: args.timeout });

            if (pass.reduced) {
              // Scroll to the bottom and back to trigger scroll-driven reveals,
              // then check whether reduced motion left anything stuck invisible.
              await page.evaluate(async () => {
                window.scrollTo(0, document.documentElement.scrollHeight);
                await new Promise((resolve) => setTimeout(resolve, 300));
                window.scrollTo(0, 0);
                await new Promise((resolve) => setTimeout(resolve, 300));
              });
            }

            const firstPath = path.join(pageDir, `${vp.name}-first${suffix}.png`);
            await page.screenshot({ path: firstPath, fullPage: false });

            const fullPath = path.join(pageDir, `${vp.name}-full${suffix}.png`);
            await page.screenshot({ path: fullPath, fullPage: true });

            const overflow = await page.evaluate(() => {
              const el = document.scrollingElement || document.documentElement;
              return { scrollWidth: el.scrollWidth, innerWidth: window.innerWidth };
            });
            entry.scrollWidth = overflow.scrollWidth;
            entry.innerWidth = overflow.innerWidth;
            entry.overflow = overflow.scrollWidth > overflow.innerWidth + 1;
            entry.screenshots = { firstScreen: firstPath, fullPage: fullPath };
            if (entry.overflow) hadFailure = true;

            if (pass.reduced) {
              const hits = await page.evaluate(detectHiddenContent);
              entry.hiddenContentCount = hits.length;
              entry.hiddenContentSamples = hits.slice(0, 10);
              if (hits.length > 0) hadHiddenContent = true;
            }
          } catch (err) {
            entry.ok = false;
            entry.error = String(err && err.message ? err.message : err);
            hadFailure = true;
          } finally {
            await context.close();
          }
          results.push(entry);
        }
      }
    }
  } finally {
    await browser.close();
  }

  const hiddenContentCount = results.reduce((sum, r) => sum + (r.hiddenContentCount || 0), 0);

  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl: args.url,
    paths: args.paths,
    matrix: args.matrix,
    reducedMotionPass: args.reducedMotion,
    viewportCount: viewports.length,
    results,
    overflowCount: results.filter((r) => r.overflow).length,
    loadFailureCount: results.filter((r) => !r.ok).length,
    hiddenContentCount,
    ok: !hadFailure && !hadHiddenContent,
  };
  await fs.writeFile(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2));

  console.log(`Screenshots written to ${outDir}`);
  console.log(
    `${results.length} captures, ${summary.overflowCount} overflow, ${summary.loadFailureCount} load failures, ` +
      `${summary.hiddenContentCount} hidden-content findings.`,
  );
  if (summary.overflowCount > 0) {
    console.log("Overflow detected at:");
    for (const r of results.filter((r) => r.overflow)) {
      console.log(`  ${r.path} @ ${r.viewport} (scrollWidth ${r.scrollWidth} > innerWidth ${r.innerWidth})`);
    }
  }
  if (summary.loadFailureCount > 0) {
    console.log("Load failures at:");
    for (const r of results.filter((r) => !r.ok)) {
      console.log(`  ${r.path} @ ${r.viewport}: ${r.error}`);
    }
  }
  if (summary.hiddenContentCount > 0) {
    console.log("Hidden content detected (reduced motion left these invisible):");
    for (const r of results.filter((r) => r.hiddenContentCount > 0)) {
      console.log(`  ${r.path} @ ${r.viewport}: ${r.hiddenContentCount} element(s)`);
      for (const sample of r.hiddenContentSamples) {
        console.log(`    ${sample}`);
      }
    }
    console.log(
      "Mark an intentionally-hidden element with data-qa-allow-hidden to exclude it from this check.",
    );
  }

  process.exit(hadFailure || hadHiddenContent ? 1 : 0);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(3);
});
