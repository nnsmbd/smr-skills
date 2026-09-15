#!/usr/bin/env node
/**
 * seo-check.mjs — metadata, social tags, robots/sitemap, and JSON-LD check.
 *
 * Uses ONLY Node.js built-ins (global fetch, node:zlib, node:url) so it runs
 * anywhere with Node >= 18 and never becomes a hard dependency of a project.
 *
 * Usage:
 *   node scripts/qa/seo-check.mjs --url http://localhost:4321/ [--profile service|product]
 *                                  [--langs en,ru] [--production] [--strict]
 *                                  [--out .site-builder/qa/<date>/seo] [--help]
 *
 * Severity model:
 *   - ERROR: page unreachable, missing <title>, missing <meta name="description">,
 *     missing html[lang], JSON-LD block present but fails to parse, robots.txt
 *     disallows everything under --production, sitemap.xml missing the checked
 *     URL under --production.
 *   - WARNING: everything else (recommended-but-not-required tags, image
 *     dimensions, hreflang coverage, profile-based JSON-LD type hints, robots/
 *     sitemap reachability outside --production). Pass --strict to treat every
 *     warning as an error (useful right before a real production deploy).
 *
 * Exit codes: 0 no errors, 1 one or more errors (or warnings under --strict),
 * 2 could not fetch the page at all, 64 usage error (unknown CLI argument).
 */

const HELP = `seo-check.mjs — metadata, social tags, robots/sitemap, and JSON-LD check

Usage:
  node scripts/qa/seo-check.mjs --url <page-url> [options]

Options:
  --url <url>       Page URL to check (default: http://localhost:4321/)
  --profile <p>     service | product (default: service) — changes JSON-LD type hints
  --langs <list>    Comma-separated language codes to require hreflang alternates for
  --production      Treat robots.txt disallow-all and a sitemap missing the URL as errors
  --strict          Treat every warning as an error
  --out <dir>       Output directory (default: .site-builder/qa/<YYYY-MM-DD>/seo)
  --help            Show this help and exit

Checks: title length, meta description, canonical, html lang, hreflang (if --langs),
og:title/description/image/url, twitter:card, OG image reachability + 1200x630
dimensions (PNG/JPEG parsed from header bytes; WebP is best-effort), robots.txt,
sitemap.xml, JSON-LD parse + profile type hint.

Exit codes: 0 ok, 1 errors found (or warnings under --strict), 2 page unreachable,
64 usage error (unknown CLI argument).
`;

function parseArgs(argv) {
  const args = {
    url: "http://localhost:4321/",
    profile: "service",
    langs: [],
    production: false,
    strict: false,
    out: null,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--url") args.url = argv[++i];
    else if (a === "--profile") args.profile = argv[++i];
    else if (a === "--langs") args.langs = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--production") args.production = true;
    else if (a === "--strict") args.strict = true;
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

// --- tiny HTML attribute parsing (built-ins only, tolerant of attribute order) ---

function parseAttrs(tag) {
  const attrs = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let m;
  while ((m = re.exec(tag))) {
    attrs[m[1].toLowerCase()] = m[2] !== undefined ? m[2] : m[3];
  }
  return attrs;
}

function findTags(html, tagName) {
  const re = new RegExp(`<${tagName}\\b[^>]*>`, "gi");
  const out = [];
  let m;
  while ((m = re.exec(html))) out.push(parseAttrs(m[0]));
  return out;
}

function getTitle(html) {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? m[1].trim() : null;
}

function getHtmlLang(html) {
  const m = /<html\b[^>]*>/i.exec(html);
  if (!m) return null;
  const attrs = parseAttrs(m[0]);
  return attrs.lang || null;
}

function getMeta(metas, key, keyAttr = "name") {
  const found = metas.find((a) => a[keyAttr] && a[keyAttr].toLowerCase() === key.toLowerCase());
  return found ? found.content ?? null : null;
}

function getAllMeta(metas, key, keyAttr = "property") {
  return metas.filter((a) => a[keyAttr] && a[keyAttr].toLowerCase() === key.toLowerCase()).map((a) => a.content);
}

function getLinks(html) {
  return findTags(html, "link");
}

function getJsonLd(html) {
  const re = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const blocks = [];
  let m;
  while ((m = re.exec(html))) blocks.push(m[1].trim());
  return blocks;
}

function collectTypes(node, acc) {
  if (Array.isArray(node)) {
    for (const n of node) collectTypes(n, acc);
    return;
  }
  if (node && typeof node === "object") {
    if (node["@type"]) {
      const t = node["@type"];
      if (Array.isArray(t)) t.forEach((x) => acc.add(x));
      else acc.add(t);
    }
    if (Array.isArray(node["@graph"])) collectTypes(node["@graph"], acc);
  }
}

// --- image header parsing (built-ins only) ---

function pngDimensions(buf) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length < 24 || !buf.subarray(0, 8).equals(sig)) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function jpegDimensions(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let offset = 2;
  while (offset < buf.length) {
    if (buf[offset] !== 0xff) return null;
    const marker = buf[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const len = buf.readUInt16BE(offset + 2);
    const isSOF =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isSOF) {
      const height = buf.readUInt16BE(offset + 5);
      const width = buf.readUInt16BE(offset + 7);
      return { width, height };
    }
    offset += 2 + len;
  }
  return null;
}

function webpDimensions(buf) {
  if (buf.length < 30 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return null;
  const fourcc = buf.toString("ascii", 12, 16);
  if (fourcc === "VP8X") {
    const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
    const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
    return { width, height, bestEffort: false };
  }
  if (fourcc === "VP8 ") {
    // Simple lossy WebP: 3-byte sync code at offset 23, then 2 bytes width (14 bits) + 2 bytes height (14 bits)
    const w = buf.readUInt16LE(26) & 0x3fff;
    const h = buf.readUInt16LE(28) & 0x3fff;
    if (w && h) return { width: w, height: h, bestEffort: true };
    return null;
  }
  // VP8L or unrecognized subtype: not parsed without a decompressor.
  return null;
}

// --- robots.txt parsing (group-aware: only a `User-agent: *` group's own
// `Disallow: /` counts, never an unrelated bot's) ---

function robotsDisallowsAll(text) {
  const lines = text.split(/\r?\n/);
  const groups = [];
  let current = null;

  for (const rawLine of lines) {
    const withoutComment = rawLine.replace(/#.*$/, "");
    const trimmed = withoutComment.trim();
    if (trimmed === "") continue;

    const uaMatch = /^user-agent:\s*(.*)$/i.exec(trimmed);
    if (uaMatch) {
      if (!current || current.hasRules) {
        current = { agents: [], hasRules: false, disallowAll: false };
        groups.push(current);
      }
      current.agents.push(uaMatch[1].trim());
      continue;
    }

    if (!current) continue; // stray rule before any User-agent line: ignore

    const disallowMatch = /^disallow:\s*(.*)$/i.exec(trimmed);
    if (disallowMatch) {
      current.hasRules = true;
      if (disallowMatch[1].trim() === "/") current.disallowAll = true;
      continue;
    }

    // Any other directive (Allow, Crawl-delay, Sitemap, ...) still ends the
    // run of consecutive User-agent lines for this group.
    current.hasRules = true;
  }

  return groups.some((g) => g.disallowAll && g.agents.some((a) => a === "*"));
}

function imageDimensions(buf, contentType) {
  if (contentType?.includes("png") || pngDimensions(buf)) return { kind: "png", ...pngDimensions(buf) };
  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) {
    const d = jpegDimensions(buf);
    return d ? { kind: "jpeg", ...d } : null;
  }
  if (contentType?.includes("webp")) {
    const d = webpDimensions(buf);
    return d ? { kind: "webp", ...d } : null;
  }
  // Fallback: sniff by magic bytes regardless of content-type header correctness.
  const png = pngDimensions(buf);
  if (png) return { kind: "png", ...png };
  const jpeg = jpegDimensions(buf);
  if (jpeg) return { kind: "jpeg", ...jpeg };
  const webp = webpDimensions(buf);
  if (webp) return { kind: "webp", ...webp };
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    process.exit(0);
  }

  const fs = await import("node:fs/promises");
  const path = await import("node:path");

  const outDir = args.out || `.site-builder/qa/${dateStamp()}/seo`;
  await fs.mkdir(outDir, { recursive: true });

  const errors = [];
  const warnings = [];
  const addErr = (msg) => errors.push(msg);
  const addWarn = (msg) => warnings.push(msg);

  let html;
  let baseUrl;
  try {
    baseUrl = new URL(args.url);
    const res = await fetch(baseUrl.toString());
    if (!res.ok) {
      console.error(`Page fetch failed: HTTP ${res.status} ${baseUrl}`);
      process.exit(2);
    }
    html = await res.text();
  } catch (err) {
    console.error(`Could not fetch ${args.url}: ${err.message}`);
    process.exit(2);
  }

  const metaTags = findTags(html, "meta");
  const links = getLinks(html);

  // Title
  const title = getTitle(html);
  if (!title) addErr("Missing <title>.");
  else if (title.length < 10 || title.length > 60)
    addWarn(`Title length is ${title.length} chars (recommended ~10-60): "${title}"`);

  // Meta description
  const description = getMeta(metaTags, "description");
  if (!description) addErr("Missing <meta name=\"description\">.");
  else if (description.length < 50 || description.length > 160)
    addWarn(`Meta description length is ${description.length} chars (recommended ~50-160).`);

  // Canonical
  const canonical = links.find((l) => l.rel && l.rel.toLowerCase() === "canonical");
  if (!canonical || !canonical.href) addWarn("Missing <link rel=\"canonical\">.");

  // html lang
  const lang = getHtmlLang(html);
  if (!lang) addErr('Missing lang attribute on <html>.');

  // hreflang
  if (args.langs.length) {
    const alternates = links.filter((l) => l.rel && l.rel.toLowerCase() === "alternate" && l.hreflang);
    const have = new Set(alternates.map((a) => a.hreflang.toLowerCase()));
    for (const wanted of args.langs) {
      if (!have.has(wanted.toLowerCase())) addWarn(`No hreflang alternate found for "${wanted}".`);
    }
  }

  // Open Graph
  const ogTitle = getAllMeta(metaTags, "og:title")[0];
  const ogDescription = getAllMeta(metaTags, "og:description")[0];
  const ogImage = getAllMeta(metaTags, "og:image")[0];
  const ogUrl = getAllMeta(metaTags, "og:url")[0];
  if (!ogTitle) addWarn("Missing og:title.");
  if (!ogDescription) addWarn("Missing og:description.");
  if (!ogUrl) addWarn("Missing og:url.");
  if (!ogImage) {
    addWarn("Missing og:image.");
  } else {
    try {
      const imageUrl = new URL(ogImage, baseUrl);
      const res = await fetch(imageUrl.toString());
      if (!res.ok) {
        addWarn(`og:image not reachable: HTTP ${res.status} ${imageUrl}`);
      } else {
        const buf = Buffer.from(await res.arrayBuffer());
        const contentType = res.headers.get("content-type") || "";
        const dims = imageDimensions(buf, contentType);
        if (!dims) {
          addWarn(`Could not determine og:image dimensions (content-type: ${contentType || "unknown"}).`);
        } else if (dims.bestEffort) {
          addWarn(`og:image is WebP; dimensions parsed best-effort as ${dims.width}x${dims.height} (verify manually).`);
        } else if (dims.width !== 1200 || dims.height !== 630) {
          addWarn(`og:image is ${dims.width}x${dims.height}, expected 1200x630.`);
        }
      }
    } catch (err) {
      addWarn(`Could not fetch og:image: ${err.message}`);
    }
  }

  // Twitter card
  const twitterCard = getMeta(metaTags, "twitter:card");
  if (!twitterCard) addWarn("Missing twitter:card.");

  // robots.txt
  try {
    const robotsUrl = new URL("/robots.txt", baseUrl);
    const res = await fetch(robotsUrl.toString());
    if (!res.ok) {
      addWarn(`robots.txt not reachable: HTTP ${res.status}`);
    } else {
      const text = await res.text();
      const disallowsAll = robotsDisallowsAll(text);
      if (disallowsAll) {
        const msg = "robots.txt disallows all crawling under User-agent: *.";
        if (args.production) addErr(msg);
        else addWarn(`${msg} (not treated as an error outside --production)`);
      }
    }
  } catch (err) {
    addWarn(`Could not fetch robots.txt: ${err.message}`);
  }

  // sitemap.xml
  try {
    const sitemapUrl = new URL("/sitemap.xml", baseUrl);
    const res = await fetch(sitemapUrl.toString());
    if (!res.ok) {
      addWarn(`sitemap.xml not reachable: HTTP ${res.status}`);
    } else {
      const text = await res.text();
      const normalizedTarget = baseUrl.toString().replace(/\/$/, "");
      const containsUrl =
        text.includes(baseUrl.toString()) ||
        text.includes(normalizedTarget) ||
        text.includes(baseUrl.pathname);
      if (!containsUrl) {
        const msg = "sitemap.xml does not appear to contain the checked URL.";
        if (args.production) addErr(msg);
        else addWarn(`${msg} (not treated as an error outside --production)`);
      }
    }
  } catch (err) {
    addWarn(`Could not fetch sitemap.xml: ${err.message}`);
  }

  // JSON-LD
  const jsonLdBlocks = getJsonLd(html);
  const types = new Set();
  if (jsonLdBlocks.length === 0) {
    addWarn("No JSON-LD structured data found.");
  } else {
    for (const block of jsonLdBlocks) {
      try {
        const parsed = JSON.parse(block);
        collectTypes(parsed, types);
      } catch (err) {
        addErr(`JSON-LD block failed to parse: ${err.message}`);
      }
    }
    const expected =
      args.profile === "product"
        ? ["SoftwareApplication", "Product", "Organization"]
        : ["Organization", "LocalBusiness", "ProfessionalService"];
    const haveExpected = expected.some((t) => types.has(t));
    if (!haveExpected) {
      addWarn(
        `No JSON-LD type matching the "${args.profile}" profile hint (${expected.join(
          " / ",
        )}). Found: ${types.size ? [...types].join(", ") : "none"}.`,
      );
    }
  }

  if (args.strict) {
    errors.push(...warnings.splice(0));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    url: args.url,
    profile: args.profile,
    production: args.production,
    strict: args.strict,
    title,
    description,
    canonical: canonical ? canonical.href : null,
    lang,
    jsonLdTypes: [...types],
    errors,
    warnings,
    ok: errors.length === 0,
  };

  await fs.mkdir(outDir, { recursive: true });
  const reportPath = path.join(outDir, "seo-report.json");
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

  console.log(`SEO check for ${args.url} (profile: ${args.profile})`);
  console.log(`Title: ${title ? `"${title}" (${title.length} chars)` : "MISSING"}`);
  console.log(`Description: ${description ? `${description.length} chars` : "MISSING"}`);
  console.log(`html lang: ${lang || "MISSING"}`);
  console.log(`JSON-LD types found: ${types.size ? [...types].join(", ") : "none"}`);
  console.log(`Errors: ${errors.length}, Warnings: ${warnings.length}`);
  for (const e of errors) console.log(`  ERROR: ${e}`);
  for (const w of warnings) console.log(`  WARN:  ${w}`);
  console.log(`Report written to ${reportPath}`);

  process.exit(report.ok ? 0 : 1);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(2);
});
