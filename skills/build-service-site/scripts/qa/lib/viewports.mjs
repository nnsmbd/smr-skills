// viewports.mjs — the shared viewport matrix and matrix-selection logic for
// screenshots.mjs, pulled out into its own module so the pure selection logic
// can be unit-tested with plain `node -e` (Playwright itself cannot be
// exercised without installing it in a project).
//
// Each entry's `categories` says which matrix view(s) it belongs to:
//   "width"  — the width-transition matrix (mobile/tablet/desktop widths).
//   "height" — the "same width, different heights" matrix from
//              references/responsive-motion.md (fullscreen-vs-windowed,
//              short/tall phone viewport, landscape phone).
// An entry that already satisfies both (for example a mobile width that
// happens to match a requested height-matrix pairing) lists both categories
// once instead of being duplicated as a second entry — the same viewport
// should never be captured twice in a single run.

export const VIEWPORTS = [
  { name: "mobile-375", width: 375, height: 812, categories: ["width"] },
  { name: "mobile-390", width: 390, height: 844, categories: ["width", "height"] },
  { name: "mobile-430", width: 430, height: 932, categories: ["width"] },
  { name: "tablet-768", width: 768, height: 1024, categories: ["width"] },
  { name: "transition-1024", width: 1024, height: 768, categories: ["width"] },
  { name: "transition-1100", width: 1100, height: 800, categories: ["width"] },
  { name: "desktop-1280x720", width: 1280, height: 720, categories: ["width"] },
  { name: "desktop-1366x768", width: 1366, height: 768, categories: ["width"] },
  { name: "desktop-1440x900", width: 1440, height: 900, categories: ["width"] },
  { name: "desktop-1536x864", width: 1536, height: 864, categories: ["width"] },
  { name: "desktop-1920x1080", width: 1920, height: 1080, categories: ["width"] },
  { name: "tall-1440x1600", width: 1440, height: 1600, categories: ["width"] },
  // Height matrix: same width at different heights (fullscreen vs windowed),
  // plus a landscape-phone case, per references/responsive-motion.md.
  { name: "height-1440x720", width: 1440, height: 720, categories: ["height"] },
  { name: "height-1440x1100", width: 1440, height: 1100, categories: ["height"] },
  { name: "height-390x664", width: 390, height: 664, categories: ["height"] },
  { name: "landscape-844x390", width: 844, height: 390, categories: ["height"] },
];

export const MATRIX_VALUES = ["width", "height", "all"];

/**
 * Select the viewports for a given `--matrix` value.
 * @param {string} matrix - "width", "height", or "all" (default "all").
 * @returns {Array<{name:string,width:number,height:number,categories:string[]}>}
 */
export function selectViewports(matrix = "all") {
  if (!MATRIX_VALUES.includes(matrix)) {
    throw new Error(`Invalid matrix value: ${matrix} (expected one of ${MATRIX_VALUES.join(", ")})`);
  }
  if (matrix === "all") return VIEWPORTS;
  return VIEWPORTS.filter((vp) => vp.categories.includes(matrix));
}
