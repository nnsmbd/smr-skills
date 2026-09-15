// url.mjs — shared --paths/--url joining helper for the qa scripts.
//
// Paths passed via --paths are meant to be resolved relative to the base
// --url's path (not just its origin), so a base of
// "http://localhost:4321/preview/" with --paths "/pricing" resolves to
// "http://localhost:4321/preview/pricing", not
// "http://localhost:4321/pricing". "/" (the default) always maps back to
// the base URL itself.

/**
 * Join a `--paths` entry onto a `--url` base.
 * @param {string} base - the --url value (with or without a trailing slash).
 * @param {string} p - a single --paths entry, e.g. "/", "/pricing".
 * @returns {string} absolute URL string.
 */
export function joinUrl(base, p) {
  const baseWithSlash = base.endsWith("/") ? base : `${base}/`;
  if (p === "/" || p === "") return baseWithSlash;
  return new URL(p.replace(/^\/+/, ""), baseWithSlash).toString();
}
