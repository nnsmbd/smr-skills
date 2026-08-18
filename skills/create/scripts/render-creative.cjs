#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");

const CLI_VERSION = 1;
const IMAGE_MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};
const FONT_MIME = {
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};
const ALLOWED_LAYER_TYPES = new Set(["raster", "svg", "text", "shape"]);
const ALLOWED_RENDERERS = new Set(["html", "imagegen"]);
const ALLOWED_FITS = new Set(["cover", "contain", "fill", "none", "scale-down"]);
const ALLOWED_TEXT_ALIGN = new Set(["left", "center", "right", "justify"]);
const ALLOWED_WHITE_SPACE = new Set(["pre", "pre-wrap", "normal", "nowrap"]);
const ALLOWED_OVERFLOW = new Set(["hidden", "visible"]);
const ALLOWED_SHAPES = new Set(["rectangle", "ellipse", "line"]);

function fail(message, code = 1) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

function usage() {
  process.stdout.write(`Usage:
  render-creative.cjs route <layer-plan.json>
  render-creative.cjs validate <layer-plan.json>
  render-creative.cjs render <layer-plan.json> --out-dir <directory> [options]

Render options:
  --browser-executable <path>  Explicit Chromium-compatible executable
  --allow-qa-fail             Write artifacts and exit zero on deterministic QA failure
  --force                     Replace existing renderer artifacts in the output directory
  --help                      Show this help

Environment:
  CREATE_BROWSER_EXECUTABLE   Chromium-compatible executable path
  NODE_PATH                   Must resolve the playwright package when it is not local
`);
}

function parseCli(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    usage();
    process.exit(0);
  }
  const command = argv[0];
  const planPath = argv[1];
  if (!new Set(["route", "validate", "render"]).has(command) || !planPath) {
    usage();
    process.exit(2);
  }
  const options = { allowQaFail: false, force: false };
  for (let index = 2; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--allow-qa-fail") {
      options.allowQaFail = true;
    } else if (argument === "--force") {
      options.force = true;
    } else if (argument === "--out-dir") {
      options.outDir = argv[index + 1];
      index += 1;
    } else if (argument === "--browser-executable") {
      options.browserExecutable = argv[index + 1];
      index += 1;
    } else {
      fail(`Unknown argument: ${argument}`, 2);
    }
  }
  if (command === "render" && !options.outDir) {
    fail("render requires --out-dir", 2);
  }
  return { command, planPath: path.resolve(planPath), options };
}

function readPlan(planPath) {
  let source;
  try {
    source = fs.readFileSync(planPath, "utf8");
  } catch (error) {
    fail(`Cannot read LayerPlan: ${error.message}`);
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    fail(`LayerPlan must be valid JSON: ${error.message}`);
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function validId(value) {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value);
}

function validHex(value) {
  return typeof value === "string" && /^#[0-9a-fA-F]{3,8}$/.test(value) && [4, 5, 7, 9].includes(value.length);
}

function safeTextValue(value, field, errors, maxLength = 50_000) {
  if (typeof value !== "string") {
    errors.push(`${field} must be a string`);
    return;
  }
  if (value.length > maxLength) errors.push(`${field} exceeds ${maxLength} characters`);
  if (value.includes("\u0000")) errors.push(`${field} contains a null byte`);
}

function validateBox(target, field, errors, options = {}) {
  const { positiveSize = true } = options;
  for (const key of ["x", "y", "width", "height"]) {
    if (!isFiniteNumber(target?.[key])) errors.push(`${field}.${key} must be a finite number`);
  }
  if (positiveSize && isFiniteNumber(target?.width) && target.width <= 0) {
    errors.push(`${field}.width must be greater than zero`);
  }
  if (positiveSize && isFiniteNumber(target?.height) && target.height <= 0) {
    errors.push(`${field}.height must be greater than zero`);
  }
}

function validateLayerPlan(plan, planPath, phase = "plan") {
  const errors = [];
  const warnings = [];
  const baseDir = path.dirname(planPath);
  if (!isObject(plan)) return { errors: ["LayerPlan root must be an object"], warnings, baseDir };
  if (plan.version !== 1) errors.push("LayerPlan version must be 1");
  if (!validId(plan.id)) errors.push("LayerPlan id must use letters, digits, underscores, or hyphens");
  if (!isObject(plan.canvas)) errors.push("canvas must be an object");
  const canvas = plan.canvas || {};
  if (!Number.isInteger(canvas.width) || canvas.width < 1 || canvas.width > 16_384) {
    errors.push("canvas.width must be an integer between 1 and 16384");
  }
  if (!Number.isInteger(canvas.height) || canvas.height < 1 || canvas.height > 16_384) {
    errors.push("canvas.height must be an integer between 1 and 16384");
  }
  if (canvas.background !== undefined && !validHex(canvas.background)) {
    errors.push("canvas.background must be a hexadecimal CSS color");
  }
  const pixelRatio = canvas.pixelRatio ?? 1;
  if (!isFiniteNumber(pixelRatio) || pixelRatio < 1 || pixelRatio > 4) {
    errors.push("canvas.pixelRatio must be between 1 and 4");
  }
  if (Number.isInteger(canvas.width) && Number.isInteger(canvas.height) && isFiniteNumber(pixelRatio)) {
    const outputPixels = canvas.width * canvas.height * pixelRatio * pixelRatio;
    if (outputPixels > 64_000_000) errors.push("rendered canvas cannot exceed 64 million pixels");
  }

  const ids = new Set();
  if (!Array.isArray(plan.layers) || plan.layers.length === 0) {
    errors.push("layers must be a non-empty array");
  } else if (plan.layers.length > 500) {
    errors.push("layers cannot exceed 500 entries");
  }

  if (plan.zones !== undefined && !Array.isArray(plan.zones)) {
    errors.push("zones must be an array");
  }
  if (plan.constraints !== undefined && !isObject(plan.constraints)) {
    errors.push("constraints must be an object");
  }
  const zones = Array.isArray(plan.zones) ? plan.zones : [];
  const zoneIds = new Set();
  zones.forEach((zone, index) => {
    const field = `zones[${index}]`;
    if (!isObject(zone)) {
      errors.push(`${field} must be an object`);
      return;
    }
    if (!validId(zone.id)) errors.push(`${field}.id is invalid`);
    if (zoneIds.has(zone.id)) errors.push(`${field}.id duplicates another zone`);
    zoneIds.add(zone.id);
    validateBox(zone, field, errors);
  });

  const resolvedAssets = [];
  const resolvedFonts = [];
  (plan.layers || []).forEach((layer, index) => {
    const field = `layers[${index}]`;
    if (!isObject(layer)) {
      errors.push(`${field} must be an object`);
      return;
    }
    if (!validId(layer.id)) errors.push(`${field}.id is invalid`);
    if (ids.has(layer.id)) errors.push(`${field}.id duplicates another layer`);
    ids.add(layer.id);
    if (!ALLOWED_LAYER_TYPES.has(layer.type)) errors.push(`${field}.type is unsupported`);
    if (!ALLOWED_RENDERERS.has(layer.renderer)) errors.push(`${field}.renderer is unsupported`);
    validateBox(layer, field, errors);
    if (layer.zIndex !== undefined && !Number.isInteger(layer.zIndex)) {
      errors.push(`${field}.zIndex must be an integer`);
    }
    for (const numeric of ["rotation", "opacity", "scaleX", "scaleY", "borderRadius"]) {
      if (layer[numeric] !== undefined && !isFiniteNumber(layer[numeric])) {
        errors.push(`${field}.${numeric} must be a finite number`);
      }
    }
    if (isFiniteNumber(layer.opacity) && (layer.opacity < 0 || layer.opacity > 1)) {
      errors.push(`${field}.opacity must be between 0 and 1`);
    }
    for (const scaling of ["scaleX", "scaleY"]) {
      if (isFiniteNumber(layer[scaling]) && (layer[scaling] <= 0 || layer[scaling] > 10)) {
        errors.push(`${field}.${scaling} must be greater than zero and at most 10`);
      }
    }
    if (layer.overflow !== undefined && !ALLOWED_OVERFLOW.has(layer.overflow)) {
      errors.push(`${field}.overflow must be hidden or visible`);
    }
    if (layer.avoidZones !== undefined) {
      if (!Array.isArray(layer.avoidZones) || layer.avoidZones.some((id) => !validId(id))) {
        errors.push(`${field}.avoidZones must be an array of zone ids`);
      }
    }

    if (layer.type === "raster" || layer.type === "svg") {
      const ready = layer.status !== "pending";
      if (ready && (!isObject(layer.asset) || typeof layer.asset.path !== "string")) {
        errors.push(`${field}.asset.path is required unless status is pending`);
      }
      if (layer.status === "pending") {
        warnings.push(`${field} is pending and cannot be rendered yet`);
      }
      if (typeof layer.asset?.path === "string") {
        if (/^[a-z]+:\/\//i.test(layer.asset.path)) {
          errors.push(`${field}.asset.path must be local, not a URL`);
        } else {
          const resolved = path.resolve(baseDir, layer.asset.path);
          const extension = path.extname(resolved).toLowerCase();
          const allowed = layer.type === "svg" ? extension === ".svg" : extension !== ".svg" && IMAGE_MIME[extension];
          if (!allowed) errors.push(`${field}.asset.path has an unsupported extension`);
          if (!fs.existsSync(resolved)) {
            const message = `${field}.asset.path does not exist: ${layer.asset.path}`;
            if (phase !== "route") errors.push(message);
            else warnings.push(message);
          } else if (fs.statSync(resolved).size > 100_000_000) {
            errors.push(`${field}.asset.path exceeds 100 MB`);
          }
          resolvedAssets.push({ layerId: layer.id, path: resolved, mime: IMAGE_MIME[extension] });
        }
      }
      if (layer.fit !== undefined && !ALLOWED_FITS.has(layer.fit)) {
        errors.push(`${field}.fit is unsupported`);
      }
      if (layer.position !== undefined) safeTextValue(layer.position, `${field}.position`, errors, 100);
    }

    if (layer.type === "text") {
      if (layer.renderer !== "html") errors.push(`${field}: text layers must use renderer html`);
      safeTextValue(layer.text, `${field}.text`, errors);
      if (!isObject(layer.font)) errors.push(`${field}.font must be an object`);
      safeTextValue(layer.font?.family, `${field}.font.family`, errors, 128);
      if (!isFiniteNumber(layer.fontSize) || layer.fontSize <= 0 || layer.fontSize > 2_000) {
        errors.push(`${field}.fontSize must be greater than zero and at most 2000`);
      }
      if (layer.font?.weight !== undefined && (!Number.isInteger(layer.font.weight) || layer.font.weight < 1 || layer.font.weight > 1000)) {
        errors.push(`${field}.font.weight must be an integer from 1 to 1000`);
      }
      if (layer.font?.style !== undefined && !new Set(["normal", "italic", "oblique"]).has(layer.font.style)) {
        errors.push(`${field}.font.style is unsupported`);
      }
      if (layer.font?.path !== undefined) {
        if (typeof layer.font.path !== "string" || /^[a-z]+:\/\//i.test(layer.font.path)) {
          errors.push(`${field}.font.path must be a local path`);
        } else {
          const resolved = path.resolve(baseDir, layer.font.path);
          const extension = path.extname(resolved).toLowerCase();
          if (!FONT_MIME[extension]) errors.push(`${field}.font.path has an unsupported extension`);
          if (!fs.existsSync(resolved)) {
            const message = `${field}.font.path does not exist: ${layer.font.path}`;
            if (phase !== "route") errors.push(message);
            else warnings.push(message);
          } else if (fs.statSync(resolved).size > 20_000_000) {
            errors.push(`${field}.font.path exceeds 20 MB`);
          }
          resolvedFonts.push({
            layerId: layer.id,
            path: resolved,
            family: layer.font.family,
            weight: layer.font.weight ?? 400,
            style: layer.font.style ?? "normal",
            mime: FONT_MIME[extension],
          });
        }
      } else if (layer.font?.required !== false) {
        errors.push(`${field}.font.path is required unless font.required is false`);
      }
      if (!validHex(layer.fill)) errors.push(`${field}.fill must be a hexadecimal CSS color`);
      if (layer.lineHeight !== undefined && (!isFiniteNumber(layer.lineHeight) || layer.lineHeight <= 0)) {
        errors.push(`${field}.lineHeight must be greater than zero`);
      }
      if (layer.letterSpacing !== undefined && !isFiniteNumber(layer.letterSpacing)) {
        errors.push(`${field}.letterSpacing must be a finite number`);
      }
      if (layer.textAlign !== undefined && !ALLOWED_TEXT_ALIGN.has(layer.textAlign)) {
        errors.push(`${field}.textAlign is unsupported`);
      }
      if (layer.whiteSpace !== undefined && !ALLOWED_WHITE_SPACE.has(layer.whiteSpace)) {
        errors.push(`${field}.whiteSpace is unsupported`);
      }
    }

    if (layer.type === "shape") {
      if (layer.renderer !== "html") errors.push(`${field}: shape layers must use renderer html`);
      if (!ALLOWED_SHAPES.has(layer.shape)) errors.push(`${field}.shape is unsupported`);
      if (layer.fill !== undefined && !validHex(layer.fill)) errors.push(`${field}.fill must be a hexadecimal CSS color`);
      if (layer.stroke !== undefined) {
        if (!isObject(layer.stroke) || !validHex(layer.stroke.color) || !isFiniteNumber(layer.stroke.width) || layer.stroke.width < 0) {
          errors.push(`${field}.stroke requires a hexadecimal color and non-negative width`);
        }
      }
    }
  });

  (plan.layers || []).forEach((layer, index) => {
    for (const zoneId of layer.avoidZones || []) {
      if (!zoneIds.has(zoneId)) errors.push(`layers[${index}].avoidZones references unknown zone ${zoneId}`);
    }
  });

  const avoidOverlap = plan.constraints?.avoidOverlap;
  if (avoidOverlap !== undefined) {
    if (!Array.isArray(avoidOverlap)) {
      errors.push("constraints.avoidOverlap must be an array");
    } else {
      avoidOverlap.forEach((pair, index) => {
        if (!Array.isArray(pair) || pair.length !== 2 || pair.some((id) => !validId(id))) {
          errors.push(`constraints.avoidOverlap[${index}] must contain two layer ids`);
        } else if (pair.some((id) => !ids.has(id))) {
          errors.push(`constraints.avoidOverlap[${index}] references an unknown layer`);
        }
      });
    }
  }

  return { errors, warnings, baseDir, resolvedAssets, resolvedFonts };
}

function routePlan(plan) {
  const layers = Array.isArray(plan?.layers) ? plan.layers : [];
  const renderers = new Set(layers.map((layer) => layer.renderer));
  const hasImagegen = renderers.has("imagegen");
  const pendingImagegenLayers = layers.filter((layer) => layer.renderer === "imagegen" && layer.status === "pending");
  const hasHtml = renderers.has("html");
  const mode = hasImagegen && hasHtml ? "hybrid" : hasImagegen ? "generative" : "deterministic";
  const reasons = [];
  if (layers.some((layer) => layer.type === "text")) reasons.push("native text layer");
  if (layers.some((layer) => layer.type === "shape" || layer.type === "svg")) reasons.push("deterministic graphic layer");
  if (pendingImagegenLayers.length) reasons.push("pending image generation or edit");
  else if (hasImagegen) reasons.push("approved generated or edited raster asset");
  return {
    mode,
    needsImagegen: pendingImagegenLayers.length > 0,
    usesImagegenAssets: hasImagegen,
    needsCompositor: hasHtml || hasImagegen,
    criticalTypography: layers.some((layer) => layer.type === "text"),
    pendingLayers: layers.filter((layer) => layer.status === "pending").map((layer) => layer.id),
    reasons,
  };
}

function dataUri(filePath, mime) {
  return `data:${mime};base64,${fs.readFileSync(filePath).toString("base64")}`;
}

function scriptSafeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function buildPreparedPlan(plan, validation) {
  const assetMap = new Map(validation.resolvedAssets.map((asset) => [asset.layerId, asset]));
  const fontLayerIds = new Set(validation.resolvedFonts.map((font) => font.layerId));
  const prepared = JSON.parse(JSON.stringify(plan));
  for (const layer of prepared.layers) {
    const asset = assetMap.get(layer.id);
    if (asset) {
      layer.asset.dataUri = dataUri(asset.path, asset.mime);
      delete layer.asset.path;
    }
    if (layer.type === "text") {
      layer.font.sourceEmbedded = fontLayerIds.has(layer.id);
      delete layer.font.path;
    }
  }
  return prepared;
}

function cssQuoted(value) {
  return `"${String(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\D ")
    .replace(/\n/g, "\\A ")
    .replace(/\f/g, "\\C ")
    .replace(/</g, "\\3C ")
    .replace(/>/g, "\\3E ")
    .replace(/&/g, "\\26 ")}"`;
}

function buildFontFaces(validation) {
  const seen = new Set();
  const rules = [];
  for (const font of validation.resolvedFonts) {
    const key = [font.path, font.family, font.weight, font.style].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    rules.push(`@font-face {
  font-family: ${cssQuoted(font.family)};
  src: url(${JSON.stringify(dataUri(font.path, font.mime))});
  font-weight: ${font.weight};
  font-style: ${font.style};
  font-display: block;
}`);
  }
  return rules.join("\n");
}

function buildHtml(preparedPlan, fontFaces) {
  const planJson = scriptSafeJson(preparedPlan);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${fontFaces}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: transparent; }
body { width: max-content; height: max-content; }
#creative-canvas { position: relative; overflow: hidden; isolation: isolate; }
.creative-layer { position: absolute; box-sizing: border-box; margin: 0; padding: 0; }
.creative-layer img { display: block; width: 100%; height: 100%; }
.creative-text { font-synthesis: none; }
</style>
</head>
<body>
<main id="creative-canvas" aria-label="Rendered creative"></main>
<script>
"use strict";
const plan = ${planJson};
const canvas = document.getElementById("creative-canvas");
canvas.style.width = plan.canvas.width + "px";
canvas.style.height = plan.canvas.height + "px";
canvas.style.background = plan.canvas.background || "#00000000";

function setLayerBox(element, layer) {
  element.id = "layer-" + layer.id;
  element.dataset.layerId = layer.id;
  element.dataset.layerType = layer.type;
  element.className = "creative-layer creative-" + layer.type;
  element.style.left = layer.x + "px";
  element.style.top = layer.y + "px";
  element.style.width = layer.width + "px";
  element.style.height = layer.height + "px";
  element.style.zIndex = String(layer.zIndex ?? 0);
  element.style.opacity = String(layer.opacity ?? 1);
  element.style.overflow = layer.overflow || "hidden";
  element.style.borderRadius = (layer.borderRadius || 0) + "px";
  element.style.transformOrigin = layer.transformOrigin || "center center";
  const transforms = [];
  if (layer.rotation) transforms.push("rotate(" + layer.rotation + "deg)");
  if ((layer.scaleX ?? 1) !== 1 || (layer.scaleY ?? 1) !== 1) {
    transforms.push("scale(" + (layer.scaleX ?? 1) + ", " + (layer.scaleY ?? 1) + ")");
  }
  element.style.transform = transforms.join(" ");
}

function createLayer(layer) {
  const element = document.createElement("div");
  setLayerBox(element, layer);
  if (layer.type === "raster" || layer.type === "svg") {
    const image = document.createElement("img");
    image.alt = "";
    image.draggable = false;
    image.src = layer.asset.dataUri;
    image.style.objectFit = layer.fit || "cover";
    image.style.objectPosition = layer.position || "center center";
    element.appendChild(image);
  } else if (layer.type === "text") {
    element.textContent = layer.text;
    element.style.color = layer.fill;
    element.style.fontFamily = JSON.stringify(layer.font.family);
    element.style.fontWeight = String(layer.font.weight ?? 400);
    element.style.fontStyle = layer.font.style || "normal";
    element.style.fontSize = layer.fontSize + "px";
    element.style.lineHeight = layer.lineHeight ? String(layer.lineHeight) : "normal";
    element.style.letterSpacing = (layer.letterSpacing ?? 0) + "px";
    element.style.textAlign = layer.textAlign || "left";
    element.style.whiteSpace = layer.whiteSpace || "pre";
    element.style.display = "flex";
    element.style.alignItems = layer.verticalAlign === "center" ? "center" : layer.verticalAlign === "bottom" ? "flex-end" : "flex-start";
    element.style.justifyContent = layer.textAlign === "center" ? "center" : layer.textAlign === "right" ? "flex-end" : "flex-start";
  } else if (layer.type === "shape") {
    if (layer.shape === "ellipse") element.style.borderRadius = "50%";
    if (layer.shape === "line") {
      element.style.height = "0";
      element.style.borderTop = (layer.stroke?.width ?? 1) + "px solid " + (layer.stroke?.color ?? layer.fill ?? "#000000");
    } else {
      element.style.background = layer.fill || "transparent";
      if (layer.stroke) element.style.border = layer.stroke.width + "px solid " + layer.stroke.color;
    }
  }
  return element;
}

for (const layer of [...plan.layers].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))) {
  if (layer.status === "pending") continue;
  canvas.appendChild(createLayer(layer));
}

function intersects(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function normalizedColor(value) {
  const probe = document.createElement("span");
  probe.style.color = value;
  document.body.appendChild(probe);
  const result = getComputedStyle(probe).color;
  probe.remove();
  return result;
}

window.__collectCreativeQa = async function () {
  await document.fonts.ready;
  const canvasRect = canvas.getBoundingClientRect();
  const layerResults = [];
  for (const layer of plan.layers) {
    if (layer.status === "pending") continue;
    const element = document.getElementById("layer-" + layer.id);
    const rect = element.getBoundingClientRect();
    const relative = {
      left: rect.left - canvasRect.left,
      top: rect.top - canvasRect.top,
      right: rect.right - canvasRect.left,
      bottom: rect.bottom - canvasRect.top,
      width: rect.width,
      height: rect.height,
    };
    const result = {
      id: layer.id,
      type: layer.type,
      bounds: relative,
      insideCanvas: relative.left >= -0.01 && relative.top >= -0.01 && relative.right <= plan.canvas.width + 0.01 && relative.bottom <= plan.canvas.height + 0.01,
      overflow: element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1,
      avoidsZones: [],
    };
    for (const zoneId of layer.avoidZones || []) {
      const zone = (plan.zones || []).find((candidate) => candidate.id === zoneId);
      const zoneRect = { left: zone.x, top: zone.y, right: zone.x + zone.width, bottom: zone.y + zone.height };
      result.avoidsZones.push({ zone: zoneId, pass: !intersects(relative, zoneRect) });
    }
    if (layer.type === "text") {
      const fontSpec = (layer.font.style || "normal") + " " + (layer.font.weight ?? 400) + " " + layer.fontSize + "px " + JSON.stringify(layer.font.family);
      const loaded = await document.fonts.load(fontSpec, layer.text || "BESbswy");
      result.text = element.textContent;
      result.exactText = element.textContent === layer.text;
      result.font = {
        family: getComputedStyle(element).fontFamily,
        expectedFamily: layer.font.family,
        required: layer.font.required !== false,
        sourceEmbedded: Boolean(layer.font.sourceEmbedded),
        loaded: loaded.length > 0 && document.fonts.check(fontSpec, layer.text || "BESbswy"),
      };
      result.color = {
        computed: getComputedStyle(element).color,
        expected: normalizedColor(layer.fill),
      };
      result.exactColor = result.color.computed === result.color.expected;
    }
    if (layer.type === "raster" || layer.type === "svg") {
      const image = element.querySelector("img");
      result.assetLoaded = Boolean(image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
      result.assetNaturalSize = image ? { width: image.naturalWidth, height: image.naturalHeight } : null;
    }
    layerResults.push(result);
  }

  const overlapResults = [];
  for (const pair of plan.constraints?.avoidOverlap || []) {
    const left = layerResults.find((layer) => layer.id === pair[0]);
    const right = layerResults.find((layer) => layer.id === pair[1]);
    overlapResults.push({ layers: pair, pass: !intersects(left.bounds, right.bounds) });
  }
  return {
    canvas: { width: canvasRect.width, height: canvasRect.height },
    layers: layerResults,
    avoidOverlap: overlapResults,
  };
};
</script>
</body>
</html>
`;
}

function findExecutableRecursively(root, targetNames, maxDepth = 4) {
  if (!root || !fs.existsSync(root)) return null;
  const queue = [{ directory: root, depth: 0 }];
  while (queue.length) {
    const { directory, depth } = queue.shift();
    let entries;
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const candidate = path.join(directory, entry.name);
      if (entry.isFile() && targetNames.has(entry.name)) return candidate;
      if (entry.isDirectory() && depth < maxDepth) queue.push({ directory: candidate, depth: depth + 1 });
    }
  }
  return null;
}

function resolveBrowserExecutable(chromium, explicit) {
  const candidates = [
    explicit,
    process.env.CREATE_BROWSER_EXECUTABLE,
    chromium.executablePath(),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  const cacheRoots = [
    path.join(os.homedir(), "Library", "Caches", "ms-playwright"),
    path.join(os.homedir(), ".cache", "ms-playwright"),
  ];
  for (const root of cacheRoots) {
    const found = findExecutableRecursively(root, new Set(["chrome-headless-shell", "chrome", "headless_shell"]));
    if (found) return found;
  }
  return null;
}

function readPngDimensions(pngPath) {
  const buffer = fs.readFileSync(pngPath);
  const signature = "89504e470d0a1a0a";
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== signature) {
    throw new Error("Rendered output is not a valid PNG");
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function deterministicChecks(plan, browserQa, pngDimensions) {
  const checks = [];
  const add = (id, pass, detail) => checks.push({ id, pass: Boolean(pass), detail });
  const ratio = plan.canvas.pixelRatio ?? 1;
  add("network-isolation", browserQa.networkIsolation?.enabled === true,
    `${browserQa.networkIsolation?.blockedRequests?.length ?? 0} remote requests blocked`);
  add("canvas-css-size", browserQa.canvas.width === plan.canvas.width && browserQa.canvas.height === plan.canvas.height,
    `${browserQa.canvas.width}x${browserQa.canvas.height}`);
  add("png-pixel-size", pngDimensions.width === Math.round(plan.canvas.width * ratio) && pngDimensions.height === Math.round(plan.canvas.height * ratio),
    `${pngDimensions.width}x${pngDimensions.height}`);
  for (const layer of browserQa.layers) {
    if (!plan.layers.find((candidate) => candidate.id === layer.id)?.allowOverflow) {
      add(`bounds:${layer.id}`, layer.insideCanvas, JSON.stringify(layer.bounds));
    }
    if (layer.type === "text") {
      add(`copy:${layer.id}`, layer.exactText, layer.text);
      if (layer.font.required) {
        add(`font-source:${layer.id}`, layer.font.sourceEmbedded, layer.font.sourceEmbedded ? "embedded local source" : "missing embedded source");
        add(`font:${layer.id}`, layer.font.loaded, `${layer.font.expectedFamily} -> ${layer.font.family}`);
      } else {
        add(`font:${layer.id}`, true, `${layer.font.expectedFamily}: system fallback explicitly allowed`);
      }
      add(`color:${layer.id}`, layer.exactColor, `${layer.color.expected} -> ${layer.color.computed}`);
      if (plan.layers.find((candidate) => candidate.id === layer.id)?.overflow !== "visible") {
        add(`overflow:${layer.id}`, !layer.overflow, layer.overflow ? "content clips or overflows" : "none");
      }
    }
    if (layer.type === "raster" || layer.type === "svg") {
      add(`asset:${layer.id}`, layer.assetLoaded, JSON.stringify(layer.assetNaturalSize));
    }
    for (const result of layer.avoidsZones) {
      add(`zone:${layer.id}:${result.zone}`, result.pass, result.pass ? "no intersection" : "intersection detected");
    }
  }
  for (const result of browserQa.avoidOverlap) {
    add(`overlap:${result.layers.join(":")}`, result.pass, result.pass ? "no intersection" : "intersection detected");
  }
  return checks;
}

async function render(plan, planPath, options, validation) {
  let playwright;
  try {
    playwright = require("playwright");
  } catch (error) {
    fail(`Cannot resolve playwright. Load the Codex workspace dependencies and set NODE_PATH to their node_modules path. ${error.message}`);
  }
  const browserExecutable = resolveBrowserExecutable(playwright.chromium, options.browserExecutable);
  if (!browserExecutable) {
    fail("No Chromium-compatible executable found. Set CREATE_BROWSER_EXECUTABLE or install a Playwright Chromium browser.");
  }
  const outputDirectory = path.resolve(options.outDir);
  fs.mkdirSync(outputDirectory, { recursive: true });
  const htmlPath = path.join(outputDirectory, "creative.html");
  const pngPath = path.join(outputDirectory, "creative.png");
  const manifestPath = path.join(outputDirectory, "manifest.json");
  const existingOutputs = [htmlPath, pngPath, manifestPath].filter((candidate) => fs.existsSync(candidate));
  if (existingOutputs.length && !options.force) {
    fail(`Renderer artifacts already exist; use a new --out-dir or pass --force: ${existingOutputs.join(", ")}`);
  }
  const preparedPlan = buildPreparedPlan(plan, validation);
  fs.writeFileSync(htmlPath, buildHtml(preparedPlan, buildFontFaces(validation)), "utf8");

  const ratio = plan.canvas.pixelRatio ?? 1;
  const browser = await playwright.chromium.launch({ executablePath: browserExecutable, headless: true });
  let browserQa;
  try {
    const context = await browser.newContext({
      viewport: { width: plan.canvas.width, height: plan.canvas.height },
      deviceScaleFactor: ratio,
      colorScheme: "light",
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const blockedNetworkRequests = [];
    await page.route("**/*", async (route) => {
      const requestUrl = route.request().url();
      if (requestUrl.startsWith("file:") || requestUrl.startsWith("data:") || requestUrl.startsWith("blob:")) {
        await route.continue();
      } else {
        blockedNetworkRequests.push(requestUrl);
        await route.abort();
      }
    });
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    browserQa = await page.evaluate(() => window.__collectCreativeQa());
    browserQa.networkIsolation = {
      enabled: true,
      blockedRequests: blockedNetworkRequests,
    };
    await page.locator("#creative-canvas").screenshot({ path: pngPath, animations: "disabled" });
    await context.close();
  } finally {
    await browser.close();
  }

  const pngDimensions = readPngDimensions(pngPath);
  const checks = deterministicChecks(plan, browserQa, pngDimensions);
  const passed = checks.every((check) => check.pass);
  const manifest = {
    version: CLI_VERSION,
    planId: plan.id,
    route: routePlan(plan),
    deterministicStatus: passed ? "PASS" : "FAIL",
    visualStatus: "NOT_REVIEWED",
    canvas: plan.canvas,
    outputs: {
      html: path.basename(htmlPath),
      png: path.basename(pngPath),
      manifest: path.basename(manifestPath),
    },
    browserExecutable,
    browserQa,
    checks,
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  process.stdout.write(JSON.stringify({
    status: manifest.deterministicStatus,
    visualStatus: manifest.visualStatus,
    mode: manifest.route.mode,
    outputDirectory,
    htmlPath,
    pngPath,
    manifestPath,
  }, null, 2) + "\n");
  if (!passed && !options.allowQaFail) process.exitCode = 1;
}

async function main() {
  const { command, planPath, options } = parseCli(process.argv.slice(2));
  const plan = readPlan(planPath);
  const validation = validateLayerPlan(plan, planPath, command);
  const result = { route: routePlan(plan), errors: validation.errors, warnings: validation.warnings };
  if (command === "route") {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    if (validation.errors.length) process.exitCode = 1;
    return;
  }
  if (validation.errors.length) {
    process.stderr.write(JSON.stringify(result, null, 2) + "\n");
    process.exitCode = 1;
    return;
  }
  if (command === "validate") {
    process.stdout.write(JSON.stringify({ status: "PASS", ...result }, null, 2) + "\n");
    return;
  }
  if (result.route.pendingLayers.length) {
    fail(`Cannot render pending layers: ${result.route.pendingLayers.join(", ")}`);
  }
  await render(plan, planPath, options, validation);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
