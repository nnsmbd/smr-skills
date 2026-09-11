#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const classifications = new Set([
  'FACT',
  'OBSERVATION',
  'CALCULATED',
  'INFERENCE',
  'USER_CLAIM',
  'UNKNOWN',
]);
const states = new Set([
  'unknown',
  'unavailable',
  'not_applicable',
  'intentionally_omitted',
  'private',
]);
const metaModes = new Set(['auto', 'disabled', 'verify_only']);
const metaDepths = new Set(['overview', 'standard', 'deep']);
const inspectionModes = new Set(['auto', 'never']);
const metaSourceStates = new Set([
  'not_checked',
  'disabled',
  'unavailable',
  'not_found',
  'needs_selection',
  'resolved',
  'acquired',
  'limited',
]);
const conflictDecisions = new Set(['publish_selected_metric', 'withhold_from_public']);

// Mirrors the current smr-web `caseSchema` limits; see references/smr-web-contract.md.
const limits = {
  title: 220,
  niche: 120,
  period: 120,
  summary: 500,
  metricValue: 80,
  metricLabel: 80,
  story: 5000,
  heading: 220,
  result: 220,
  highlight: 220,
  note: 500,
  sectionTitle: 220,
  paragraph: 5000,
  screenshotSrc: 500,
  screenshotTitle: 220,
  screenshotDescription: 1000,
};
const localScreenshotSrc = /^\/(?!\/)[a-zA-Z0-9/_\-.]+$/;
const httpsScreenshotSrc = /^https:\/\//;
const digit = /\d/;
// Deterministic internal-leak guards only: platform object IDs and technical field
// names. Platform naming and campaign titles are an editorial/privacy rule, not a
// structural invariant — see references/public-narrative.md.
const internalIdPattern = /(?:^|\D)(act_\d+|\d{15,})(?:\D|$)/;
const internalFieldPattern =
  /\b(campaign_id|adset_id|ad_id|account_id|result_spec|cost_per_result|metric_status|promoted_object|optimization_goal|campaign_intent|intent_confidence)\b/i;

function fail(message) {
  errors.push(message);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read valid JSON from ${path}: ${error.message}`);
  }
}

function isText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasExactPeriod(value) {
  return isText(value?.from) && isText(value?.to);
}

function assertText(value, path, max) {
  if (!isText(value)) {
    fail(`${path} must be non-empty text.`);
    return false;
  }
  if (max && value.trim().length > max) {
    fail(`${path} must be ${max} characters or fewer for smr-web.`);
    return false;
  }
  return true;
}

function assertArticle(article, texts, prefix) {
  if (typeof article !== 'object' || article === null || Array.isArray(article)) {
    fail(`${prefix}.article must be an object when present.`);
    return;
  }
  assertText(article.heading, `${prefix}.article.heading`, limits.heading);
  assertText(article.result, `${prefix}.article.result`, limits.result);
  assertText(article.highlight, `${prefix}.article.highlight`, limits.highlight);
  texts.push(
    { path: `${prefix}.article.heading`, text: article.heading },
    { path: `${prefix}.article.result`, text: article.result },
    { path: `${prefix}.article.highlight`, text: article.highlight },
  );
  if (article.note !== undefined && article.note !== null) {
    if (typeof article.note !== 'string' || article.note.length > limits.note) {
      fail(`${prefix}.article.note must be text of ${limits.note} characters or fewer.`);
    }
    texts.push({ path: `${prefix}.article.note`, text: article.note });
  }
  if (!Array.isArray(article.sections) || article.sections.length < 1 || article.sections.length > 20) {
    fail(`${prefix}.article.sections must contain 1–20 sections.`);
    return;
  }
  article.sections.forEach((section, index) => {
    const at = `${prefix}.article.sections[${index}]`;
    if (typeof section !== 'object' || section === null) {
      fail(`${at} must be an object.`);
      return;
    }
    assertText(section.title, `${at}.title`, limits.sectionTitle);
    texts.push({ path: `${at}.title`, text: section.title });
    if (!Array.isArray(section.paragraphs) || section.paragraphs.length < 1 || section.paragraphs.length > 30) {
      fail(`${at}.paragraphs must contain 1–30 paragraphs.`);
    } else {
      section.paragraphs.forEach((paragraph, position) => {
        assertText(paragraph, `${at}.paragraphs[${position}]`, limits.paragraph);
        texts.push({ path: `${at}.paragraphs[${position}]`, text: paragraph });
      });
    }
    if (section.showMetrics !== undefined && typeof section.showMetrics !== 'boolean') {
      fail(`${at}.showMetrics must be a boolean when present.`);
    }
    if (section.screenshot !== undefined && section.screenshot !== null) {
      const shot = section.screenshot;
      const src = shot?.src;
      if (typeof src !== 'string' || src.length > limits.screenshotSrc || !(localScreenshotSrc.test(src) || httpsScreenshotSrc.test(src))) {
        fail(`${at}.screenshot.src must be a /cases/... path or an HTTPS link.`);
      }
      assertText(shot?.title, `${at}.screenshot.title`, limits.screenshotTitle);
      if (typeof shot?.description !== 'string' || shot.description.length > limits.screenshotDescription) {
        fail(`${at}.screenshot.description must be text of ${limits.screenshotDescription} characters or fewer.`);
      }
      texts.push(
        { path: `${at}.screenshot.title`, text: shot?.title },
        { path: `${at}.screenshot.description`, text: shot?.description },
      );
    }
  });
}

function assertPublicCase(value, prefix = 'public case') {
  const texts = [];
  if (!value || typeof value !== 'object') {
    fail(`${prefix} must be an object.`);
    return texts;
  }

  for (const [field, max] of [
    ['title', limits.title],
    ['niche', limits.niche],
    ['period', limits.period],
    ['summary', limits.summary],
  ]) {
    assertText(value[field], `${prefix}.${field}`, max);
    texts.push({ path: `${prefix}.${field}`, text: value[field] });
  }
  if (!isText(value.slug)) {
    fail(`${prefix}.slug must be non-empty text.`);
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug)) {
    fail(`${prefix}.slug must contain lowercase letters, digits, and single hyphens only.`);
  }
  if (!Array.isArray(value.metrics) || value.metrics.length < 1 || value.metrics.length > 12) {
    fail(`${prefix}.metrics must contain 1–12 metrics.`);
  } else {
    const primary = value.metrics.filter((metric) => metric?.isPrimary === true);
    if (primary.length !== 1) fail(`${prefix}.metrics must have exactly one primary metric.`);
    const labels = new Set();
    value.metrics.forEach((metric, index) => {
      assertText(metric?.label, `${prefix}.metrics[${index}].label`, limits.metricLabel);
      assertText(metric?.value, `${prefix}.metrics[${index}].value`, limits.metricValue);
      if (labels.has(metric?.label)) fail(`${prefix}.metrics has duplicate label: ${metric?.label}.`);
      labels.add(metric?.label);
      texts.push(
        { path: `${prefix}.metrics[${index}].label`, text: metric?.label },
        { path: `${prefix}.metrics[${index}].value`, text: metric?.value },
      );
    });
  }
  // `fullStory` stays required in production: the /cases index, the home preview,
  // and the fallback detail page read it even when `article` is present.
  for (const field of ['task', 'approach', 'result']) {
    assertText(value.fullStory?.[field], `${prefix}.fullStory.${field}`, limits.story);
    texts.push({ path: `${prefix}.fullStory.${field}`, text: value.fullStory?.[field] });
  }
  if (value.article !== undefined && value.article !== null) {
    assertArticle(value.article, texts, prefix);
  }
  return texts;
}

function assertNoInternalLeak(texts, allowIds) {
  for (const { path, text } of texts) {
    if (typeof text !== 'string') continue;
    if (!allowIds) {
      const id = text.match(internalIdPattern);
      if (id) fail(`${path} contains what looks like an internal platform ID: ${id[1]}.`);
    }
    const field = text.match(internalFieldPattern);
    if (field) fail(`${path} contains an internal technical field name: ${field[1]}.`);
  }
}

function requiredClaimKeys(publicCase) {
  const keys = ['title', 'summary', 'fullStory.task', 'fullStory.approach', 'fullStory.result'];
  const article = publicCase?.article;
  if (!article || typeof article !== 'object') return keys;
  if (digit.test(article.result ?? '')) keys.push('article.result');
  if (digit.test(article.highlight ?? '')) keys.push('article.highlight');
  const sections = Array.isArray(article.sections) ? article.sections : [];
  sections.forEach((section, index) => {
    const body = (Array.isArray(section?.paragraphs) ? section.paragraphs : [])
      .filter((paragraph) => typeof paragraph === 'string')
      .join(' ');
    // Only quantified sections need their own evidence mapping. Editorial links and
    // transitions are not separate factual claims.
    if (digit.test(body)) keys.push(`article.sections.${index}`);
  });
  return keys;
}

function conflictFor(metricId, conflicts) {
  return conflicts.find((conflict) => {
    if (typeof conflict === 'string') return conflict === metricId;
    if (conflict?.metric_id === metricId || conflict?.claim_id === metricId) return true;
    return Array.isArray(conflict?.metric_ids) && conflict.metric_ids.includes(metricId);
  });
}

/** Returns a blocking reason, or null when this metric may be published. */
function conflictBlocks(conflict, metricId) {
  if (!conflict) return null;
  const resolution = typeof conflict === 'string' ? null : conflict.resolution;
  if (!resolution) return 'unresolved conflict';
  if (!conflictDecisions.has(resolution.decision)) return 'conflict resolution has an unsupported decision';
  if (!isText(resolution.approved_by) || !isText(resolution.approved_at)) {
    return 'conflict resolution needs approved_by and approved_at';
  }
  if (resolution.decision === 'withhold_from_public') return 'conflict was resolved as withheld from public';
  if (!isText(resolution.selected_metric_id)) return 'conflict resolution needs selected_metric_id';
  if (resolution.selected_metric_id !== metricId) {
    return `conflict resolution selected another metric: ${resolution.selected_metric_id}`;
  }
  return null;
}

const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error('Usage: validate-case-record.mjs <path/to/case.json>');
  process.exit(2);
}

const file = resolve(args[0]);
const record = readJson(file);
const errors = [];

for (const field of ['schema_version', 'case_id', 'workflow', 'case_config']) {
  if (!(field in record)) fail(`Missing top-level field: ${field}.`);
}
if (!Array.isArray(record.sources)) fail('sources must be an array.');
if (!Array.isArray(record.metrics)) fail('metrics must be an array.');

const metaConfig = record.case_config?.sources?.meta_ads;
if (metaConfig) {
  if (!metaModes.has(metaConfig.mode)) fail('case_config.sources.meta_ads.mode is invalid.');
  if (!metaDepths.has(metaConfig.depth)) fail('case_config.sources.meta_ads.depth is invalid.');
  for (const key of ['creatives', 'targeting']) {
    if (!inspectionModes.has(metaConfig.inspect?.[key])) {
      fail(`case_config.sources.meta_ads.inspect.${key} is invalid.`);
    }
  }
  const selection = metaConfig.selection;
  if (!selection || !Array.isArray(selection.periods) || !Array.isArray(selection.campaigns)) {
    fail('case_config.sources.meta_ads.selection needs periods and campaigns arrays.');
  } else {
    const periodIds = new Set();
    selection.periods.forEach((period, index) => {
      if (!isText(period?.id) || !hasExactPeriod(period) || !isText(period?.role)) {
        fail(`case_config.sources.meta_ads.selection.periods[${index}] needs id, exact dates, and role.`);
      }
      if (periodIds.has(period?.id)) fail(`case_config.sources.meta_ads.selection has duplicate period id: ${period?.id}.`);
      periodIds.add(period?.id);
    });
    selection.campaigns.forEach((campaign, index) => {
      if (!isText(campaign?.id) || !isText(campaign?.name) || !isText(campaign?.intent) || !Array.isArray(campaign?.period_ids) || campaign.period_ids.length === 0) {
        fail(`case_config.sources.meta_ads.selection.campaigns[${index}] needs id, name, intent, and period IDs.`);
      }
      for (const periodId of campaign?.period_ids ?? []) {
        if (!periodIds.has(periodId)) {
          fail(`case_config.sources.meta_ads.selection.campaigns[${index}] references unknown period: ${periodId}.`);
        }
      }
    });
  }
}

const metaSourceState = record.workflow?.source_status?.meta_ads;
if (metaSourceState && !metaSourceStates.has(metaSourceState.status)) {
  fail('workflow.source_status.meta_ads.status is invalid.');
}

const sourceIds = new Set();
for (const [index, source] of (record.sources ?? []).entries()) {
  if (!isText(source?.id)) fail(`sources[${index}] needs an id.`);
  else if (sourceIds.has(source.id)) fail(`Duplicate source id: ${source.id}.`);
  else sourceIds.add(source.id);
  if (!isText(source?.type)) fail(`sources[${index}] needs a type.`);
  if (source?.type === 'meta_mcp') {
    if (!hasExactPeriod(source.scope) || !isText(source.scope?.project) || !isText(source.scope?.account)) {
      fail(`sources[${index}] Meta source needs project, account, and exact scope dates.`);
    }
    if (!isText(source.evidence?.package_path) && !isText(source.evidence?.package_id)) {
      fail(`sources[${index}] Meta source needs an Evidence Package path or ID.`);
    }
  }
}

const metricIds = new Set();
for (const [index, metric] of (record.metrics ?? []).entries()) {
  const location = `metrics[${index}]`;
  if (!isText(metric?.id)) fail(`${location} needs an id.`);
  else if (metricIds.has(metric.id)) fail(`Duplicate metric id: ${metric.id}.`);
  else metricIds.add(metric.id);
  if (!isText(metric?.metric)) fail(`${location} needs a metric name.`);
  if (!classifications.has(metric?.classification)) {
    fail(`${location}.classification must be FACT, OBSERVATION, CALCULATED, INFERENCE, USER_CLAIM, or UNKNOWN.`);
  }
  for (const sourceId of metric?.source_ids ?? []) {
    if (!sourceIds.has(sourceId)) fail(`${location} references unknown source: ${sourceId}.`);
  }
  if (metric?.classification === 'CALCULATED') {
    if (!isText(metric.calculation?.formula)) fail(`${location} calculated metric needs a formula.`);
    if (!Array.isArray(metric.calculation?.input_metric_ids) || metric.calculation.input_metric_ids.length === 0) {
      fail(`${location} calculated metric needs input metric IDs.`);
    }
  }
  if (metric?.status && !states.has(metric.status)) {
    fail(`${location}.status is not a supported missing-data state.`);
  }
}

const conflicts = record.workflow?.unresolved_conflicts ?? [];
conflicts.forEach((conflict, index) => {
  if (typeof conflict === 'string' || !conflict?.resolution) return;
  const resolution = conflict.resolution;
  const at = `workflow.unresolved_conflicts[${index}].resolution`;
  if (!conflictDecisions.has(resolution.decision)) {
    fail(`${at}.decision must be publish_selected_metric or withhold_from_public.`);
  }
  if (!isText(resolution.approved_by) || !isText(resolution.approved_at)) {
    fail(`${at} needs approved_by and approved_at.`);
  }
  if (resolution.decision === 'publish_selected_metric') {
    if (!isText(resolution.selected_metric_id)) fail(`${at} needs selected_metric_id.`);
    else if (!metricIds.has(resolution.selected_metric_id)) {
      fail(`${at} references unknown metric: ${resolution.selected_metric_id}.`);
    }
  }
});

const projection = record.public_case;
if (projection !== null && projection !== undefined) {
  const publicCase = projection.case ?? projection;
  const publicTexts = assertPublicCase(publicCase);
  assertNoInternalLeak(publicTexts, projection.allow_internal_ids === true);
  const evidence = projection.metric_evidence ?? {};
  for (const metric of publicCase?.metrics ?? []) {
    const ids = evidence[metric.label] ?? [];
    if (!Array.isArray(ids) || ids.length === 0) {
      fail(`Public metric ${metric.label} needs metric_evidence.`);
      continue;
    }
    for (const id of ids) {
      if (!metricIds.has(id)) fail(`Public metric ${metric.label} references unknown metric: ${id}.`);
      const blocking = conflictBlocks(conflictFor(id, conflicts), id);
      if (blocking) fail(`Public metric ${metric.label} has an ${blocking}: ${id}.`);
      const canonicalMetric = record.metrics.find((candidate) => candidate.id === id);
      if (canonicalMetric?.visibility !== 'public') {
        fail(`Public metric ${metric.label} is not marked public: ${id}.`);
      }
      if (canonicalMetric?.verified !== true) {
        fail(`Public metric ${metric.label} is not verified: ${id}.`);
      }
      if (canonicalMetric?.classification === 'UNKNOWN') {
        fail(`Public metric ${metric.label} cannot be UNKNOWN: ${id}.`);
      }
      if (canonicalMetric?.classification === 'USER_CLAIM' && !(canonicalMetric?.source_ids ?? []).length) {
        fail(`Public metric ${metric.label} is a user claim without provenance: ${id}.`);
      }
      if (!canonicalMetric?.period && !isText(canonicalMetric?.source_scope)) {
        fail(`Public metric ${metric.label} needs a period or stated source scope: ${id}.`);
      }
      const hasMetaSource = canonicalMetric?.source_ids?.some((sourceId) =>
        record.sources.some((source) => source.id === sourceId && source.type === 'meta_mcp'),
      );
      if (hasMetaSource && (!hasExactPeriod(canonicalMetric?.period) || !isText(canonicalMetric?.source_scope))) {
        fail(`Public Meta metric ${metric.label} needs exact dates and source scope: ${id}.`);
      }
      if (hasMetaSource && !isText(canonicalMetric?.meta_evidence?.reported_field)) {
        fail(`Public Meta metric ${metric.label} needs its reported Meta field: ${id}.`);
      }
      const metaField = canonicalMetric?.meta_evidence?.reported_field;
      const metaStatus = canonicalMetric?.meta_evidence?.result_spec?.metric_status;
      if (hasMetaSource && ['results', 'cost_per_result'].includes(metaField) && metaStatus !== 'available') {
        fail(`Public Meta result ${metric.label} has non-publishable metric_status: ${metaStatus ?? 'missing'}.`);
      }
    }
  }
  const claimEvidence = projection.claim_evidence ?? {};
  for (const claim of requiredClaimKeys(publicCase)) {
    const ids = claimEvidence[claim] ?? [];
    if (!Array.isArray(ids) || ids.length === 0) {
      fail(`Public claim ${claim} needs claim_evidence.`);
      continue;
    }
    for (const id of ids) {
      if (!sourceIds.has(id) && !metricIds.has(id)) {
        fail(`Public claim ${claim} references unknown source or metric: ${id}.`);
      }
    }
  }
}

if (errors.length) {
  console.error(`Case record is invalid (${errors.length} issue${errors.length === 1 ? '' : 's'}):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Case record is valid: ${record.case_id}`);
